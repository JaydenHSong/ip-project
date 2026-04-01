// AD Optimizer — Campaigns Feature Types
// Design Ref: §4.2 GET/POST /api/ads/campaigns

import type {
  CampaignType,
  CampaignMode,
  CampaignStatus,
  MatchType,
} from '@/modules/ads/shared/types'

// ─── Query / Filter ───

type CampaignListQuery = {
  brand_market_id: string
  mode?: CampaignMode
  status?: CampaignStatus
  assigned_to?: string
  search?: string
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
  page?: number
  limit?: number
}

// ─── List Response ───

type CampaignListItem = {
  id: string
  marketing_code: string
  name: string
  mode: CampaignMode
  status: CampaignStatus
  campaign_type: CampaignType
  daily_budget: number | null
  weekly_budget: number | null
  spend_today: number
  acos: number | null
  target_acos: number | null
  roas: number | null
  orders_7d: number
  assigned_to: { id: string; name: string } | null
  confidence_score: number | null
  last_action: string | null
  created_at: string
}

type CampaignListResponse = {
  data: CampaignListItem[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

// ─── KPI Strip ───

type CampaignKpiSummary = {
  total_campaigns: number
  active_campaigns: number
  total_spend_mtd: number
  total_budget_mtd: number
  avg_acos: number | null
  avg_roas: number | null
  total_orders_mtd: number
  total_sales_mtd: number
}

// ─── Create ───

type CreateCampaignRequest = {
  brand_market_id: string
  campaign_type: CampaignType
  mode: CampaignMode
  marketing_code: string
  name: string
  target_acos: number
  daily_budget?: number
  weekly_budget?: number
  max_bid_cap?: number
  targeting_type?: 'keyword' | 'product'
  keywords?: { text: string; match_type: MatchType; bid: number }[]
  negative_keywords?: { text: string; match_type: MatchType }[]
  product_asins?: string[]
}

type CreateCampaignResponse = {
  data: {
    id: string
    marketing_code: string
    name: string
    amazon_campaign_id?: string
  }
}

// ─── Detail ───

type CampaignDetail = {
  id: string
  org_unit_id: string
  brand_market_id: string
  marketplace_profile_id: string
  amazon_campaign_id: string | null
  marketing_code: string
  name: string
  campaign_type: CampaignType
  mode: CampaignMode
  status: CampaignStatus
  target_acos: number | null
  daily_budget: number | null
  weekly_budget: number | null
  max_bid_cap: number | null
  confidence_score: number | null
  learning_day: number
  assigned_to: string | null
  assigned_user?: { id: string; name: string; avatar_url: string | null }
  launched_at: string | null
  paused_at: string | null
  created_at: string
  updated_at: string
  // Aggregated metrics
  metrics_7d?: {
    impressions: number
    clicks: number
    spend: number
    sales: number
    orders: number
    acos: number | null
    roas: number | null
    cpc: number | null
    ctr: number | null
    cvr: number | null
  }
  keywords_count?: number
  ad_groups_count?: number
  recent_actions?: {
    id: string
    action_type: string
    reason: string
    executed_at: string
  }[]
}

// ─── Update ───

type UpdateCampaignRequest = {
  name?: string
  status?: CampaignStatus
  target_acos?: number
  daily_budget?: number
  weekly_budget?: number
  max_bid_cap?: number
  mode?: CampaignMode
  assigned_to?: string | null
}

// ─── Marketing Code ───

type MarketingCodeSegment = {
  brand: string       // 2 chars
  market: string      // 2 chars
  sequence: string    // 2 chars (auto)
}

export type {
  CampaignListQuery,
  CampaignListItem,
  CampaignListResponse,
  CampaignKpiSummary,
  CreateCampaignRequest,
  CreateCampaignResponse,
  CampaignDetail,
  UpdateCampaignRequest,
  MarketingCodeSegment,
}
