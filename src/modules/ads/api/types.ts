// Amazon API response types for AD Optimizer module

// ─── Common ───

export type AmazonApiError = {
  code: string
  message: string
  details?: unknown
}

export type AmazonPaginatedResponse<T> = {
  data: T[]
  next_token?: string
  total_count?: number
}

// ─── Ads API Types ───

export type AmazonCampaign = {
  campaign_id: string
  name: string
  campaign_type: 'sp' | 'sb' | 'sd'
  state: 'enabled' | 'paused' | 'archived'
  budget: number
  budget_type: 'daily' | 'lifetime'
  start_date: string
  end_date?: string
  targeting_type?: 'manual' | 'auto'
  bidding_strategy?: string
}

export type AmazonAdGroup = {
  ad_group_id: string
  campaign_id: string
  name: string
  state: 'enabled' | 'paused' | 'archived'
  default_bid: number
}

export type AmazonKeyword = {
  keyword_id: string
  ad_group_id: string
  campaign_id: string
  keyword_text: string
  match_type: 'broad' | 'phrase' | 'exact'
  state: 'enabled' | 'paused' | 'archived'
  bid: number
}

export type AmazonReportMetrics = {
  campaign_id: string
  impressions: number
  clicks: number
  cost: number
  sales: number
  orders: number
  acos: number
  roas: number
  ctr: number
  cpc: number
  conversion_rate: number
  date: string
}

// ─── SP-API Types ───

export type AmazonOrder = {
  amazon_order_id: string
  purchase_date: string
  order_status: string
  order_total?: {
    currency_code: string
    amount: string
  }
  marketplace_id: string
}

export type AmazonBrandAnalyticsRow = {
  search_term: string
  search_frequency_rank: number
  click_share: number
  conversion_share: number
  asin_1: string
  asin_1_click_share: number
  asin_1_conversion_share: number
}

// ─── Token Types ───

export type AmazonTokenSet = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  expires_at: number
}

export type AmazonProfile = {
  profile_id: string
  country_code: string
  currency_code: string
  marketplace_id: string
  account_type: 'seller' | 'vendor'
}
