// Design Ref: §8.1 — Mock Ads adapter (implements AdsPort)
// Plan SC: SC-01 Mock↔Real 무중단 전환, SC-08 현실적 mock

import type { AdsPort, DateRange, SearchTermRow } from '../ports/ads-port'
import type {
  AmazonCampaign,
  AmazonAdGroup,
  AmazonKeyword,
  AmazonReportMetrics,
  AmazonPaginatedResponse,
  AmazonProfile,
} from '../types'
import {
  generateMockProfiles,
  generateMockCampaigns,
  generateMockAdGroups,
  generateMockKeywords,
  generateMockMetrics,
} from '../mock-data'

const MOCK_LATENCY = 150 // simulate API latency

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class MockAdsAdapter implements AdsPort {
  private profiles: AmazonProfile[]
  private campaigns: AmazonCampaign[]
  private adGroups: AmazonAdGroup[]
  private keywords: AmazonKeyword[]
  private metrics: AmazonReportMetrics[]

  constructor(_profileId: string) {
    this.profiles = generateMockProfiles()
    this.campaigns = generateMockCampaigns(50)
    this.adGroups = generateMockAdGroups(this.campaigns)
    this.keywords = generateMockKeywords(this.adGroups, 500)
    this.metrics = generateMockMetrics(this.campaigns, 30)
  }

  async listProfiles(): Promise<AmazonProfile[]> {
    await delay(MOCK_LATENCY)
    return this.profiles
  }

  async listCampaigns(nextToken?: string): Promise<AmazonPaginatedResponse<AmazonCampaign>> {
    await delay(MOCK_LATENCY)
    const pageSize = 50
    const startIndex = nextToken ? parseInt(nextToken, 10) : 0
    const page = this.campaigns.slice(startIndex, startIndex + pageSize)
    return {
      data: page,
      next_token: startIndex + pageSize < this.campaigns.length ? String(startIndex + pageSize) : undefined,
      total_count: this.campaigns.length,
    }
  }

  async listAdGroups(campaignId: string): Promise<AmazonPaginatedResponse<AmazonAdGroup>> {
    await delay(MOCK_LATENCY)
    const filtered = this.adGroups.filter(ag => ag.campaign_id === campaignId)
    return { data: filtered, total_count: filtered.length }
  }

  async listKeywords(adGroupId: string): Promise<AmazonPaginatedResponse<AmazonKeyword>> {
    await delay(MOCK_LATENCY)
    const filtered = this.keywords.filter(kw => kw.ad_group_id === adGroupId)
    return { data: filtered, total_count: filtered.length }
  }

  async updateCampaign(campaignId: string, updates: Partial<AmazonCampaign>): Promise<AmazonCampaign> {
    await delay(MOCK_LATENCY)
    const campaign = this.campaigns.find(c => c.campaign_id === campaignId)
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`)
    Object.assign(campaign, updates)
    return campaign
  }

  async updateKeywordBid(keywordId: string, bid: number): Promise<AmazonKeyword> {
    await delay(MOCK_LATENCY)
    const keyword = this.keywords.find(kw => kw.keyword_id === keywordId)
    if (!keyword) throw new Error(`Keyword ${keywordId} not found`)
    keyword.bid = bid
    return keyword
  }

  async createKeywords(newKeywords: Partial<AmazonKeyword>[]): Promise<AmazonKeyword[]> {
    await delay(MOCK_LATENCY)
    const created = newKeywords.map((kw, i) => ({
      keyword_id: `mock-kw-new-${Date.now()}-${i}`,
      ad_group_id: kw.ad_group_id ?? '',
      campaign_id: kw.campaign_id ?? '',
      keyword_text: kw.keyword_text ?? '',
      match_type: kw.match_type ?? 'exact' as const,
      state: 'enabled' as const,
      bid: kw.bid ?? 1.0,
    }))
    this.keywords.push(...created)
    return created
  }

  async archiveKeyword(keywordId: string): Promise<void> {
    await delay(MOCK_LATENCY)
    const keyword = this.keywords.find(kw => kw.keyword_id === keywordId)
    if (keyword) keyword.state = 'archived'
  }

  async requestReport(_reportType: string, _dateRange: DateRange): Promise<string> {
    await delay(MOCK_LATENCY)
    return `mock-report-${Date.now()}`
  }

  async downloadReport(_reportId: string): Promise<AmazonReportMetrics[]> {
    await delay(MOCK_LATENCY * 2)
    return this.metrics
  }

  async getSearchTermReport(campaignId: string, _dateRange: DateRange): Promise<SearchTermRow[]> {
    await delay(MOCK_LATENCY)
    const campKeywords = this.keywords.filter(kw => kw.campaign_id === campaignId)
    return campKeywords.slice(0, 20).map(kw => ({
      search_term: kw.keyword_text + ' case cover',
      campaign_id: campaignId,
      ad_group_id: kw.ad_group_id,
      impressions: Math.round(Math.random() * 5000),
      clicks: Math.round(Math.random() * 200),
      cost: Number((Math.random() * 100).toFixed(2)),
      sales: Number((Math.random() * 300).toFixed(2)),
      orders: Math.round(Math.random() * 15),
      acos: Number((Math.random() * 50).toFixed(2)),
    }))
  }
}
