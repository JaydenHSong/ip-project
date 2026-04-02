// Design Ref: §3.2 — SP-API interface (Port)

import type {
  AmazonOrder,
  AmazonBrandAnalyticsRow,
  AmazonPaginatedResponse,
} from '../types'

export type OrderItem = {
  order_item_id: string
  asin: string
  quantity: number
  item_price: number
}

export type CatalogItem = {
  asin: string
  title: string
  brand: string
  image_url: string
  category: string
}

export type SpApiPort = {
  listOrders(marketplaceId: string, createdAfter: string): Promise<AmazonPaginatedResponse<AmazonOrder>>
  getOrderItems(orderId: string): Promise<OrderItem[]>
  getBrandAnalyticsSearchTerms(marketplaceId: string, reportDate: string): Promise<AmazonBrandAnalyticsRow[]>
  getCatalogItem(asin: string, marketplaceId: string): Promise<CatalogItem>
}
