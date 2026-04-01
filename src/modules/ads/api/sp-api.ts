// Amazon SP-API wrapper (stub)
// TODO: Implement when SP-API endpoints are needed

import { tokenManager } from './token-manager'
import type {
  AmazonOrder,
  AmazonBrandAnalyticsRow,
  AmazonPaginatedResponse,
} from './types'

const SP_API_BASE = 'https://sellingpartnerapi-na.amazon.com'

export class AmazonSpApi {
  private profileId: string

  constructor(profileId: string) {
    this.profileId = profileId
  }

  // ─── Auth header helper ───

  private async getHeaders(): Promise<Record<string, string>> {
    const accessToken = await tokenManager.getAccessToken(this.profileId)
    return {
      'Authorization': `Bearer ${accessToken}`,
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
    }
  }

  // ─── Orders ───

  // TODO: Implement orders listing for dayparting pattern analysis
  async listOrders(_marketplaceId: string, _createdAfter: string): Promise<AmazonPaginatedResponse<AmazonOrder>> {
    void SP_API_BASE
    void this.getHeaders
    throw new Error('Not implemented: SP-API orders endpoint')
  }

  // TODO: Implement order items for conversion analysis
  async getOrderItems(_orderId: string): Promise<unknown[]> {
    throw new Error('Not implemented: SP-API order items endpoint')
  }

  // ─── Brand Analytics ───

  // TODO: Implement Brand Analytics search terms report
  async getBrandAnalyticsSearchTerms(
    _marketplaceId: string,
    _reportDate: string,
  ): Promise<AmazonBrandAnalyticsRow[]> {
    throw new Error('Not implemented: SP-API Brand Analytics endpoint')
  }

  // ─── Catalog ───

  // TODO: Implement catalog item lookup
  async getCatalogItem(_asin: string, _marketplaceId: string): Promise<unknown> {
    throw new Error('Not implemented: SP-API catalog endpoint')
  }
}
