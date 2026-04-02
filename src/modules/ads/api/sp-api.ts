// Amazon SP-API — Thin wrapper delegating to Port/Adapter via Factory
// Design Ref: §2.1 — Rewrite: stub → factory delegation

import { createSpApiPort } from './factory'
import type {
  AmazonOrder,
  AmazonBrandAnalyticsRow,
  AmazonPaginatedResponse,
} from './types'
import type { OrderItem, CatalogItem } from './ports/sp-api-port'

export class AmazonSpApi {
  private profileId: string

  constructor(profileId: string) {
    this.profileId = profileId
  }

  private get port() {
    return createSpApiPort(this.profileId)
  }

  async listOrders(marketplaceId: string, createdAfter: string): Promise<AmazonPaginatedResponse<AmazonOrder>> {
    return this.port.listOrders(marketplaceId, createdAfter)
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return this.port.getOrderItems(orderId)
  }

  async getBrandAnalyticsSearchTerms(marketplaceId: string, reportDate: string): Promise<AmazonBrandAnalyticsRow[]> {
    return this.port.getBrandAnalyticsSearchTerms(marketplaceId, reportDate)
  }

  async getCatalogItem(asin: string, marketplaceId: string): Promise<CatalogItem> {
    return this.port.getCatalogItem(asin, marketplaceId)
  }
}
