// Design Ref: §8 — Mock SP-API adapter (implements SpApiPort)

import type { SpApiPort, OrderItem, CatalogItem } from '../ports/sp-api-port'
import type {
  AmazonOrder,
  AmazonBrandAnalyticsRow,
  AmazonPaginatedResponse,
} from '../types'
import { generateMockOrders, generateMockBrandAnalytics } from '../mock-data'

const MOCK_LATENCY = 150

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class MockSpAdapter implements SpApiPort {
  private orders: AmazonOrder[]
  private brandAnalytics: AmazonBrandAnalyticsRow[]

  constructor(_profileId: string) {
    this.orders = generateMockOrders(200)
    this.brandAnalytics = generateMockBrandAnalytics(30)
  }

  async listOrders(_marketplaceId: string, createdAfter: string): Promise<AmazonPaginatedResponse<AmazonOrder>> {
    await delay(MOCK_LATENCY)
    const cutoff = new Date(createdAfter)
    const filtered = this.orders.filter(o => new Date(o.purchase_date) >= cutoff)
    return { data: filtered, total_count: filtered.length }
  }

  async getOrderItems(_orderId: string): Promise<OrderItem[]> {
    await delay(MOCK_LATENCY)
    return [
      { order_item_id: 'item-1', asin: 'B0MOCK001', quantity: 1, item_price: 29.99 },
    ]
  }

  async getBrandAnalyticsSearchTerms(_marketplaceId: string, _reportDate: string): Promise<AmazonBrandAnalyticsRow[]> {
    await delay(MOCK_LATENCY)
    return this.brandAnalytics
  }

  async getCatalogItem(asin: string, _marketplaceId: string): Promise<CatalogItem> {
    await delay(MOCK_LATENCY)
    return {
      asin,
      title: `Spigen Product ${asin}`,
      brand: 'Spigen',
      image_url: `https://images-na.ssl-images-amazon.com/images/I/${asin}.jpg`,
      category: 'Cell Phone Cases',
    }
  }
}
