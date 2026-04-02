// Design Ref: §3.1 — Core ads platform interface (Port)
// Plan SC: SC-01 Mock↔Real 무중단 전환의 핵심 추상화

import type {
  AmazonCampaign,
  AmazonAdGroup,
  AmazonKeyword,
  AmazonReportMetrics,
  AmazonPaginatedResponse,
  AmazonProfile,
} from '../types'

export type DateRange = {
  start: string // YYYY-MM-DD
  end: string
}

export type SearchTermRow = {
  search_term: string
  campaign_id: string
  ad_group_id: string
  impressions: number
  clicks: number
  cost: number
  sales: number
  orders: number
  acos: number
}

export type AdsPort = {
  // ─── Read ───
  listProfiles(): Promise<AmazonProfile[]>
  listCampaigns(nextToken?: string): Promise<AmazonPaginatedResponse<AmazonCampaign>>
  listAdGroups(campaignId: string): Promise<AmazonPaginatedResponse<AmazonAdGroup>>
  listKeywords(adGroupId: string): Promise<AmazonPaginatedResponse<AmazonKeyword>>

  // ─── Write ───
  updateCampaign(campaignId: string, updates: Partial<AmazonCampaign>): Promise<AmazonCampaign>
  updateKeywordBid(keywordId: string, bid: number): Promise<AmazonKeyword>
  createKeywords(keywords: Partial<AmazonKeyword>[]): Promise<AmazonKeyword[]>
  archiveKeyword(keywordId: string): Promise<void>

  // ─── Reports ───
  requestReport(reportType: string, dateRange: DateRange): Promise<string>
  downloadReport(reportId: string): Promise<AmazonReportMetrics[]>
  getSearchTermReport(campaignId: string, dateRange: DateRange): Promise<SearchTermRow[]>
}
