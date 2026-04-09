// Design Ref: §2.1 adapters/amazon-ads-adapter — Real Amazon Ads API v3 (implements AdsPort)
// Plan SC: SC-02 US 캠페인 100% 실시간 동기화

import type { AdsPort, DateRange, SearchTermRow } from '../ports/ads-port'
import type {
  AmazonCampaign,
  AmazonAdGroup,
  AmazonKeyword,
  AmazonReportMetrics,
  AmazonPaginatedResponse,
  AmazonProfile,
} from '../types'
import type { RateLimiter } from '../infra/rate-limiter'
import type { TokenStore } from '../infra/token-store'
import { adsConfig } from '../infra/api-config'
import { withRetry, RetryableError } from '../infra/retry'

const ADS_API_BASE = 'https://advertising-api.amazon.com'

export class AmazonAdsAdapter implements AdsPort {
  private profileId: string
  private rateLimiter: RateLimiter
  private tokenStore: TokenStore

  constructor(profileId: string, rateLimiter: RateLimiter, tokenStore: TokenStore) {
    this.profileId = profileId
    this.rateLimiter = rateLimiter
    this.tokenStore = tokenStore
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const accessToken = await this.tokenStore.getAccessToken(this.profileId)
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Amazon-Advertising-API-ClientId': adsConfig.ads.clientId,
      'Amazon-Advertising-API-Scope': this.profileId,
      'Content-Type': 'application/json',
    }
  }

  private async request<T>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
    return withRetry(async () => {
      await this.rateLimiter.acquire(this.profileId)
      const headers = await this.getHeaders()
      const res = await fetch(`${ADS_API_BASE}${path}`, {
        method,
        headers: { ...headers, ...extraHeaders },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new RetryableError(
          `Ads API ${method} ${path}: ${res.status} ${text.slice(0, 200)}`,
          res.status,
          res.headers.get('Retry-After') ? parseInt(res.headers.get('Retry-After')!, 10) : undefined,
        )
      }

      return res.json() as Promise<T>
    })
  }

  // ─── Profiles (v2 — still supported) ───

  async listProfiles(): Promise<AmazonProfile[]> {
    type ProfileResponse = Array<{
      profileId: number
      countryCode: string
      currencyCode: string
      marketplace: string
      accountInfo: { type: string; id: string; name: string; marketplaceStringId: string }
    }>

    const data = await this.request<ProfileResponse>('GET', '/v2/profiles')
    return data.map(p => ({
      profile_id: String(p.profileId),
      country_code: p.countryCode,
      currency_code: p.currencyCode,
      marketplace_id: p.accountInfo.marketplaceStringId,
      account_type: p.accountInfo.type === 'seller' ? 'seller' as const : 'vendor' as const,
    }))
  }

  // ─── Campaigns (v3) ───

  async listCampaigns(nextToken?: string): Promise<AmazonPaginatedResponse<AmazonCampaign>> {
    type V3CampaignResponse = {
      campaigns: Array<{
        campaignId: string
        name: string
        campaignType?: string
        state: string
        budget: { budget: number; budgetType: string }
        startDate: string
        endDate?: string
        targetingType?: string
        dynamicBidding?: { strategy: string }
      }>
      nextToken?: string
      totalResults?: number
    }

    const body: Record<string, unknown> = { maxResults: 100 }
    if (nextToken) body.nextToken = nextToken

    const data = await this.request<V3CampaignResponse>(
      'POST', '/sp/campaigns/list', body,
      { 'Content-Type': 'application/vnd.spCampaign.v3+json', 'Accept': 'application/vnd.spCampaign.v3+json' },
    )

    return {
      data: data.campaigns.map(c => ({
        campaign_id: c.campaignId,
        name: c.name,
        campaign_type: 'sp' as const,
        state: mapState(c.state),
        budget: c.budget.budget,
        budget_type: c.budget.budgetType === 'DAILY' ? 'daily' as const : 'lifetime' as const,
        start_date: c.startDate,
        end_date: c.endDate,
        targeting_type: c.targetingType === 'MANUAL' ? 'manual' as const : 'auto' as const,
        bidding_strategy: c.dynamicBidding?.strategy,
      })),
      next_token: data.nextToken,
      total_count: data.totalResults,
    }
  }

  // ─── Ad Groups (v3) ───

  async listAdGroups(campaignId: string): Promise<AmazonPaginatedResponse<AmazonAdGroup>> {
    type V3AdGroupResponse = {
      adGroups: Array<{
        adGroupId: string
        campaignId: string
        name: string
        state: string
        defaultBid: number
      }>
      totalResults?: number
    }

    const data = await this.request<V3AdGroupResponse>(
      'POST', '/sp/adGroups/list',
      { campaignIdFilter: { include: [campaignId] }, maxResults: 100 },
      { 'Content-Type': 'application/vnd.spAdGroup.v3+json', 'Accept': 'application/vnd.spAdGroup.v3+json' },
    )

    return {
      data: data.adGroups.map(ag => ({
        ad_group_id: ag.adGroupId,
        campaign_id: ag.campaignId,
        name: ag.name,
        state: mapState(ag.state),
        default_bid: ag.defaultBid,
      })),
      total_count: data.totalResults,
    }
  }

  // ─── Keywords (v3) ───

  async listKeywords(adGroupId: string): Promise<AmazonPaginatedResponse<AmazonKeyword>> {
    type V3KeywordResponse = {
      keywords: Array<{
        keywordId: string
        adGroupId: string
        campaignId: string
        keywordText: string
        matchType: string
        state: string
        bid: number
      }>
      totalResults?: number
    }

    const data = await this.request<V3KeywordResponse>(
      'POST', '/sp/keywords/list',
      { adGroupIdFilter: { include: [adGroupId] }, maxResults: 100 },
      { 'Content-Type': 'application/vnd.spKeyword.v3+json', 'Accept': 'application/vnd.spKeyword.v3+json' },
    )

    return {
      data: data.keywords.map(kw => ({
        keyword_id: kw.keywordId,
        ad_group_id: kw.adGroupId,
        campaign_id: kw.campaignId,
        keyword_text: kw.keywordText,
        match_type: mapMatchType(kw.matchType),
        state: mapState(kw.state),
        bid: kw.bid,
      })),
      total_count: data.totalResults,
    }
  }

  // ─── Write Operations ───

  async updateCampaign(campaignId: string, updates: Partial<AmazonCampaign>): Promise<AmazonCampaign> {
    type V3UpdateBody = { campaignId: string; state?: string; budget?: { budget: number; budgetType: string }; name?: string }
    const body: V3UpdateBody = { campaignId }
    if (updates.state) body.state = updates.state.toUpperCase()
    if (updates.budget) body.budget = { budget: updates.budget, budgetType: (updates.budget_type ?? 'daily').toUpperCase() }
    if (updates.name) body.name = updates.name

    const data = await this.request<{ campaigns: Array<{ campaignId: string; index: number }> }>(
      'PUT', '/sp/campaigns',
      { campaigns: [body] },
      { 'Content-Type': 'application/vnd.spCampaign.v3+json', 'Accept': 'application/vnd.spCampaign.v3+json' },
    )

    void data
    return { ...updates, campaign_id: campaignId } as AmazonCampaign
  }

  async updateKeywordBid(keywordId: string, bid: number): Promise<AmazonKeyword> {
    await this.request(
      'PUT', '/sp/keywords',
      { keywords: [{ keywordId, bid }] },
      { 'Content-Type': 'application/vnd.spKeyword.v3+json', 'Accept': 'application/vnd.spKeyword.v3+json' },
    )

    return { keyword_id: keywordId, bid } as AmazonKeyword
  }

  async createKeywords(keywords: Partial<AmazonKeyword>[]): Promise<AmazonKeyword[]> {
    const body = keywords.map(kw => ({
      campaignId: kw.campaign_id,
      adGroupId: kw.ad_group_id,
      keywordText: kw.keyword_text,
      matchType: (kw.match_type ?? 'exact').toUpperCase(),
      bid: kw.bid ?? 1.0,
      state: 'ENABLED',
    }))

    const data = await this.request<{ keywords: Array<{ keywordId: string; index: number }> }>(
      'POST', '/sp/keywords',
      { keywords: body },
      { 'Content-Type': 'application/vnd.spKeyword.v3+json', 'Accept': 'application/vnd.spKeyword.v3+json' },
    )

    return data.keywords.map((res, i) => ({
      keyword_id: res.keywordId,
      ad_group_id: keywords[i].ad_group_id ?? '',
      campaign_id: keywords[i].campaign_id ?? '',
      keyword_text: keywords[i].keyword_text ?? '',
      match_type: keywords[i].match_type ?? 'exact' as const,
      state: 'enabled' as const,
      bid: keywords[i].bid ?? 1.0,
    }))
  }

  async archiveKeyword(keywordId: string): Promise<void> {
    await this.request(
      'PUT', '/sp/keywords',
      { keywords: [{ keywordId, state: 'ARCHIVED' }] },
      { 'Content-Type': 'application/vnd.spKeyword.v3+json', 'Accept': 'application/vnd.spKeyword.v3+json' },
    )
  }

  // ─── Reports (v3) ───

  async requestReport(reportType: string, dateRange: DateRange): Promise<string> {
    // Map internal type names to Amazon v3 reportTypeId
    const reportTypeMap: Record<string, string> = {
      sp_campaigns: 'spCampaigns',
      sp_targeting: 'spTargeting',
      sp_search_term: 'spSearchTerm',
      sp_advertised_product: 'spAdvertisedProduct',
    }
    const amazonReportType = reportTypeMap[reportType] ?? reportType

    const data = await this.request<{ reportId: string }>(
      'POST', '/reporting/reports',
      {
        name: `ARC ${amazonReportType} ${dateRange.start}`,
        startDate: dateRange.start,
        endDate: dateRange.end,
        configuration: {
          adProduct: 'SPONSORED_PRODUCTS',
          groupBy: ['campaign'],
          columns: ['impressions', 'clicks', 'cost', 'purchases1d', 'sales1d', 'campaignId', 'date'],
          reportTypeId: amazonReportType,
          timeUnit: 'DAILY',
          format: 'GZIP_JSON',
        },
      },
      { 'Content-Type': 'application/vnd.createasyncreportrequest.v3+json' },
    )
    return data.reportId
  }

  async downloadReport(reportId: string): Promise<AmazonReportMetrics[]> {
    // Poll for report status — Amazon takes ~10min for large accounts
    type ReportStatus = { reportId: string; status: string; url?: string }
    let status: ReportStatus
    const v3Header = { 'Content-Type': 'application/vnd.createasyncreportrequest.v3+json' }

    for (let attempt = 0; attempt < 80; attempt++) {
      status = await this.request<ReportStatus>('GET', `/reporting/reports/${reportId}`, undefined, v3Header)
      if (status.status === 'COMPLETED' && status.url) {
        // Download gzipped JSON from S3 URL
        const { gunzipSync } = await import('node:zlib')
        const res = await fetch(status.url)
        const buffer = Buffer.from(await res.arrayBuffer())
        const decompressed = gunzipSync(buffer)
        const rows = JSON.parse(decompressed.toString()) as Array<Record<string, unknown>>
        return rows.map(r => ({
          campaign_id: String(r.campaignId ?? ''),
          impressions: Number(r.impressions ?? 0),
          clicks: Number(r.clicks ?? 0),
          cost: Number(r.cost ?? 0),
          sales: Number(r.sales1d ?? 0),
          orders: Number(r.purchases1d ?? 0),
          acos: Number(r.cost ?? 0) > 0 && Number(r.sales1d ?? 0) > 0
            ? Number(((Number(r.cost) / Number(r.sales1d)) * 100).toFixed(2))
            : 0,
          roas: Number(r.cost ?? 0) > 0
            ? Number((Number(r.sales1d ?? 0) / Number(r.cost)).toFixed(2))
            : 0,
          ctr: Number(r.impressions ?? 0) > 0
            ? Number(((Number(r.clicks ?? 0) / Number(r.impressions)) * 100).toFixed(2))
            : 0,
          cpc: Number(r.clicks ?? 0) > 0
            ? Number((Number(r.cost ?? 0) / Number(r.clicks)).toFixed(2))
            : 0,
          conversion_rate: Number(r.clicks ?? 0) > 0
            ? Number(((Number(r.purchases1d ?? 0) / Number(r.clicks)) * 100).toFixed(2))
            : 0,
          date: String(r.date ?? ''),
        }))
      }
      if (status.status === 'FAILURE') throw new Error(`Report ${reportId} failed`)
      await new Promise(resolve => setTimeout(resolve, 15000))
    }
    throw new Error(`Report ${reportId} timed out after 20min`)
  }

  async getSearchTermReport(campaignId: string, dateRange: DateRange): Promise<SearchTermRow[]> {
    const reportId = await this.request<{ reportId: string }>(
      'POST', '/reporting/reports',
      {
        reportDate: dateRange.start,
        configuration: {
          adProduct: 'SPONSORED_PRODUCTS',
          groupBy: ['searchTerm'],
          columns: ['searchTerm', 'campaignId', 'adGroupId', 'impressions', 'clicks', 'cost', 'purchases1d', 'sales1d'],
          reportTypeId: 'spSearchTerm',
          timeUnit: 'DAILY',
          format: 'GZIP_JSON',
          filters: [{ field: 'campaignId', values: [campaignId] }],
        },
      },
    )

    // Poll and download
    for (let attempt = 0; attempt < 10; attempt++) {
      const status = await this.request<{ status: string; url?: string }>('GET', `/reporting/reports/${reportId.reportId}`)
      if (status.status === 'COMPLETED' && status.url) {
        const res = await fetch(status.url)
        const rows = await res.json() as Array<Record<string, unknown>>
        return rows.map(r => ({
          search_term: String(r.searchTerm ?? ''),
          campaign_id: String(r.campaignId ?? campaignId),
          ad_group_id: String(r.adGroupId ?? ''),
          impressions: Number(r.impressions ?? 0),
          clicks: Number(r.clicks ?? 0),
          cost: Number(r.cost ?? 0),
          sales: Number(r.sales1d ?? 0),
          orders: Number(r.purchases1d ?? 0),
          acos: Number(r.cost ?? 0) > 0 && Number(r.sales1d ?? 0) > 0
            ? Number(((Number(r.cost) / Number(r.sales1d)) * 100).toFixed(2))
            : 0,
        }))
      }
      if (status.status === 'FAILURE') throw new Error('Search term report failed')
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
    throw new Error('Search term report timed out')
  }
}

// ─── Helpers ───

function mapState(s: string): 'enabled' | 'paused' | 'archived' {
  const lower = s.toLowerCase()
  if (lower === 'enabled') return 'enabled'
  if (lower === 'paused') return 'paused'
  return 'archived'
}

function mapMatchType(m: string): 'broad' | 'phrase' | 'exact' {
  const lower = m.toLowerCase()
  if (lower === 'broad') return 'broad'
  if (lower === 'phrase') return 'phrase'
  return 'exact'
}
