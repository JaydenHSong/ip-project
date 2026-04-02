// Design Ref: §2.1 adapters/amazon-sp-adapter — Real SP-API (implements SpApiPort)
// SP-API tokens already available for US/EU/UK

import type { SpApiPort, OrderItem, CatalogItem } from '../ports/sp-api-port'
import type {
  AmazonOrder,
  AmazonBrandAnalyticsRow,
  AmazonPaginatedResponse,
} from '../types'
import type { TokenStore } from '../infra/token-store'
import { adsConfig } from '../infra/api-config'
import { withRetry, RetryableError } from '../infra/retry'

export class AmazonSpAdapter implements SpApiPort {
  private profileId: string
  private tokenStore: TokenStore

  constructor(profileId: string, tokenStore: TokenStore) {
    this.profileId = profileId
    this.tokenStore = tokenStore
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const accessToken = await this.tokenStore.getAccessToken(this.profileId)
    return {
      'Authorization': `Bearer ${accessToken}`,
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
    }
  }

  private async request<T>(path: string): Promise<T> {
    return withRetry(async () => {
      const headers = await this.getHeaders()
      const res = await fetch(`${adsConfig.spApi.baseUrl}${path}`, { headers })

      if (!res.ok) {
        throw new RetryableError(
          `SP-API ${path}: ${res.status}`,
          res.status,
          res.headers.get('Retry-After') ? parseInt(res.headers.get('Retry-After')!, 10) : undefined,
        )
      }

      return res.json() as Promise<T>
    })
  }

  async listOrders(marketplaceId: string, createdAfter: string): Promise<AmazonPaginatedResponse<AmazonOrder>> {
    type OrdersResponse = {
      payload: {
        Orders: Array<{
          AmazonOrderId: string
          PurchaseDate: string
          OrderStatus: string
          OrderTotal?: { CurrencyCode: string; Amount: string }
          MarketplaceId: string
        }>
        NextToken?: string
      }
    }

    const params = new URLSearchParams({
      MarketplaceIds: marketplaceId,
      CreatedAfter: createdAfter,
      MaxResultsPerPage: '100',
    })

    const data = await this.request<OrdersResponse>(`/orders/v0/orders?${params}`)
    const orders: AmazonOrder[] = (data.payload?.Orders ?? []).map(o => ({
      amazon_order_id: o.AmazonOrderId,
      purchase_date: o.PurchaseDate,
      order_status: o.OrderStatus,
      order_total: o.OrderTotal ? {
        currency_code: o.OrderTotal.CurrencyCode,
        amount: o.OrderTotal.Amount,
      } : undefined,
      marketplace_id: o.MarketplaceId,
    }))

    return { data: orders, total_count: orders.length }
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    type ItemsResponse = {
      payload: {
        OrderItems: Array<{
          OrderItemId: string
          ASIN: string
          QuantityOrdered: number
          ItemPrice?: { Amount: string }
        }>
      }
    }

    const data = await this.request<ItemsResponse>(`/orders/v0/orders/${orderId}/orderItems`)
    return (data.payload?.OrderItems ?? []).map(item => ({
      order_item_id: item.OrderItemId,
      asin: item.ASIN,
      quantity: item.QuantityOrdered,
      item_price: item.ItemPrice ? parseFloat(item.ItemPrice.Amount) : 0,
    }))
  }

  async getBrandAnalyticsSearchTerms(marketplaceId: string, reportDate: string): Promise<AmazonBrandAnalyticsRow[]> {
    type BAResponse = {
      payload: Array<{
        searchTerm: string
        searchFrequencyRank: number
        clickShareList: Array<{ clickShare: number; conversionShare: number; asin: string }>
      }>
    }

    const params = new URLSearchParams({
      marketplaceId,
      reportDate,
      reportType: 'SEARCH_TERMS',
    })

    const data = await this.request<BAResponse>(`/analytics/v1/dashboards/searchTerms?${params}`)
    return (data.payload ?? []).map(row => ({
      search_term: row.searchTerm,
      search_frequency_rank: row.searchFrequencyRank,
      click_share: row.clickShareList[0]?.clickShare ?? 0,
      conversion_share: row.clickShareList[0]?.conversionShare ?? 0,
      asin_1: row.clickShareList[0]?.asin ?? '',
      asin_1_click_share: row.clickShareList[0]?.clickShare ?? 0,
      asin_1_conversion_share: row.clickShareList[0]?.conversionShare ?? 0,
    }))
  }

  async getCatalogItem(asin: string, marketplaceId: string): Promise<CatalogItem> {
    type CatalogResponse = {
      asin: string
      summaries?: Array<{
        itemName: string
        brand: string
        mainImage?: { link: string }
        classifications?: Array<{ displayName: string }>
      }>
    }

    const params = new URLSearchParams({
      marketplaceIds: marketplaceId,
      includedData: 'summaries,images',
    })

    const data = await this.request<CatalogResponse>(`/catalog/2022-04-01/items/${asin}?${params}`)
    const summary = data.summaries?.[0]

    return {
      asin: data.asin,
      title: summary?.itemName ?? asin,
      brand: summary?.brand ?? 'Unknown',
      image_url: summary?.mainImage?.link ?? '',
      category: summary?.classifications?.[0]?.displayName ?? 'Unknown',
    }
  }
}
