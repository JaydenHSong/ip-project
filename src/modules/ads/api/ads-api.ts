// Amazon Ads API wrapper (stub)
// TODO: Implement when Amazon Ads API authorization is granted

import { tokenManager } from './token-manager'
import type {
  AmazonCampaign,
  AmazonAdGroup,
  AmazonKeyword,
  AmazonReportMetrics,
  AmazonPaginatedResponse,
  AmazonProfile,
} from './types'

const ADS_API_BASE = 'https://advertising-api.amazon.com'

export class AmazonAdsApi {
  private profileId: string

  constructor(profileId: string) {
    this.profileId = profileId
  }

  // ─── Auth header helper ───

  private async getHeaders(): Promise<Record<string, string>> {
    const accessToken = await tokenManager.getAccessToken(this.profileId)
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Amazon-Advertising-API-ClientId': process.env.AMAZON_ADS_CLIENT_ID ?? '',
      'Amazon-Advertising-API-Scope': this.profileId,
      'Content-Type': 'application/json',
    }
  }

  // ─── Profiles ───

  // TODO: Implement profile listing
  async listProfiles(): Promise<AmazonProfile[]> {
    void ADS_API_BASE
    void this.getHeaders
    throw new Error('Not implemented: Waiting for Amazon Ads API authorization')
  }

  // ─── Campaigns ───

  // TODO: Implement campaign listing with pagination
  async listCampaigns(_nextToken?: string): Promise<AmazonPaginatedResponse<AmazonCampaign>> {
    throw new Error('Not implemented: Waiting for Amazon Ads API authorization')
  }

  // TODO: Implement campaign update (bid, budget, state)
  async updateCampaign(_campaignId: string, _updates: Partial<AmazonCampaign>): Promise<AmazonCampaign> {
    throw new Error('Not implemented: Waiting for Amazon Ads API authorization')
  }

  // ─── Ad Groups ───

  // TODO: Implement ad group listing
  async listAdGroups(_campaignId: string): Promise<AmazonPaginatedResponse<AmazonAdGroup>> {
    throw new Error('Not implemented: Waiting for Amazon Ads API authorization')
  }

  // ─── Keywords ───

  // TODO: Implement keyword listing
  async listKeywords(_adGroupId: string): Promise<AmazonPaginatedResponse<AmazonKeyword>> {
    throw new Error('Not implemented: Waiting for Amazon Ads API authorization')
  }

  // TODO: Implement keyword bid update
  async updateKeywordBid(_keywordId: string, _bid: number): Promise<AmazonKeyword> {
    throw new Error('Not implemented: Waiting for Amazon Ads API authorization')
  }

  // TODO: Implement bulk keyword creation
  async createKeywords(_keywords: Partial<AmazonKeyword>[]): Promise<AmazonKeyword[]> {
    throw new Error('Not implemented: Waiting for Amazon Ads API authorization')
  }

  // ─── Reporting ───

  // TODO: Implement report request
  async requestReport(_reportType: string, _dateRange: { start: string; end: string }): Promise<string> {
    throw new Error('Not implemented: Waiting for Amazon Ads API authorization')
  }

  // TODO: Implement report download
  async downloadReport(_reportId: string): Promise<AmazonReportMetrics[]> {
    throw new Error('Not implemented: Waiting for Amazon Ads API authorization')
  }
}
