// Design Ref: §3.6 P5 — AmazonAdsAdapter base (auth + request infra)
// Plan SC: SC3 — 200줄 이하

import type { AdsPort, DateRange, SearchTermRow } from '../ports/ads-port'
import type {
  AmazonCampaign, AmazonAdGroup, AmazonKeyword,
  AmazonReportMetrics, AmazonPaginatedResponse, AmazonProfile,
} from '../types'
import type { RateLimiter } from '../infra/rate-limiter'
import type { TokenStore } from '../infra/token-store'
import { adsConfig } from '../infra/api-config'
import { withRetry, RetryableError } from '../infra/retry'

export class AmazonApiError extends Error {
  constructor(public operation: string, public cause: unknown) {
    super(`Amazon API error in ${operation}: ${cause instanceof Error ? cause.message : String(cause)}`)
    this.name = 'AmazonApiError'
  }
}

import { listCampaignsImpl, listAdGroupsImpl, updateCampaignImpl } from './amazon-campaigns'
import { requestReportImpl, downloadReportImpl, getSearchTermReportImpl } from './amazon-reports'
import { listKeywordsImpl, updateKeywordBidImpl, createKeywordsImpl, archiveKeywordImpl } from './amazon-keywords'

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

  // Exposed to resource modules via bind
  async request<T>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
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

  // ─── Profiles (v2) ───

  async listProfiles(): Promise<AmazonProfile[]> {
    type ProfileResponse = Array<{
      profileId: number; countryCode: string; currencyCode: string; marketplace: string
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

  // ─── Delegated to resource modules ───

  async listCampaigns(nextToken?: string): Promise<AmazonPaginatedResponse<AmazonCampaign>> {
    return listCampaignsImpl(this.request.bind(this), nextToken)
  }

  async listAdGroups(campaignId: string): Promise<AmazonPaginatedResponse<AmazonAdGroup>> {
    return listAdGroupsImpl(this.request.bind(this), campaignId)
  }

  async listKeywords(adGroupId: string): Promise<AmazonPaginatedResponse<AmazonKeyword>> {
    return listKeywordsImpl(this.request.bind(this), adGroupId)
  }

  async updateCampaign(campaignId: string, updates: Partial<AmazonCampaign>): Promise<AmazonCampaign> {
    return updateCampaignImpl(this.request.bind(this), campaignId, updates)
  }

  async updateKeywordBid(keywordId: string, bid: number): Promise<AmazonKeyword> {
    return updateKeywordBidImpl(this.request.bind(this), keywordId, bid)
  }

  async createKeywords(keywords: Partial<AmazonKeyword>[]): Promise<AmazonKeyword[]> {
    return createKeywordsImpl(this.request.bind(this), keywords)
  }

  async archiveKeyword(keywordId: string): Promise<void> {
    return archiveKeywordImpl(this.request.bind(this), keywordId)
  }

  async requestReport(reportType: string, dateRange: DateRange): Promise<string> {
    return requestReportImpl(this.request.bind(this), reportType, dateRange)
  }

  async downloadReport(reportId: string): Promise<AmazonReportMetrics[]> {
    return downloadReportImpl(this.request.bind(this), reportId)
  }

  async getSearchTermReport(campaignId: string, dateRange: DateRange): Promise<SearchTermRow[]> {
    return getSearchTermReportImpl(this.request.bind(this), campaignId, dateRange)
  }
}
