// Amazon Ads API — Thin wrapper delegating to Port/Adapter via Factory
// Design Ref: §2.1 — Rewrite: stub → factory delegation
// Original stub methods now route through createAdsPort()

import { createAdsPort } from './factory'
import type {
  AmazonCampaign,
  AmazonAdGroup,
  AmazonKeyword,
  AmazonReportMetrics,
  AmazonPaginatedResponse,
  AmazonProfile,
} from './types'
import type { DateRange, SearchTermRow } from './ports/ads-port'

export class AmazonAdsApi {
  private profileId: string

  constructor(profileId: string) {
    this.profileId = profileId
  }

  private get port() {
    return createAdsPort(this.profileId)
  }

  async listProfiles(): Promise<AmazonProfile[]> {
    return this.port.listProfiles()
  }

  async listCampaigns(nextToken?: string): Promise<AmazonPaginatedResponse<AmazonCampaign>> {
    return this.port.listCampaigns(nextToken)
  }

  async listAdGroups(campaignId: string): Promise<AmazonPaginatedResponse<AmazonAdGroup>> {
    return this.port.listAdGroups(campaignId)
  }

  async listKeywords(adGroupId: string): Promise<AmazonPaginatedResponse<AmazonKeyword>> {
    return this.port.listKeywords(adGroupId)
  }

  async updateCampaign(campaignId: string, updates: Partial<AmazonCampaign>): Promise<AmazonCampaign> {
    return this.port.updateCampaign(campaignId, updates)
  }

  async updateKeywordBid(keywordId: string, bid: number): Promise<AmazonKeyword> {
    return this.port.updateKeywordBid(keywordId, bid)
  }

  async createKeywords(keywords: Partial<AmazonKeyword>[]): Promise<AmazonKeyword[]> {
    return this.port.createKeywords(keywords)
  }

  async archiveKeyword(keywordId: string): Promise<void> {
    return this.port.archiveKeyword(keywordId)
  }

  async requestReport(reportType: string, dateRange: DateRange): Promise<string> {
    return this.port.requestReport(reportType, dateRange)
  }

  async downloadReport(reportId: string): Promise<AmazonReportMetrics[]> {
    return this.port.downloadReport(reportId)
  }

  async getSearchTermReport(campaignId: string, dateRange: DateRange): Promise<SearchTermRow[]> {
    return this.port.getSearchTermReport(campaignId, dateRange)
  }
}
