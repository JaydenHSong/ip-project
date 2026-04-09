// Design Ref: §3.2 P1 — Core campaign entities

import type {
  AmazonState, CampaignMode, CampaignStatus, CampaignType,
  GoalMode, KeywordState, MatchType, Region,
} from './enums'

/** Amazon Ads marketplace connection profile */
export type MarketplaceProfile = {
  id: string
  brand_market_id: string
  seller_id: string | null
  ads_profile_id: string | null
  refresh_token_key: string
  sp_api_refresh_token_key: string | null
  region: Region
  endpoint_url: string
  is_active: boolean
  last_sync_at: string | null
  created_at: string
  updated_at: string
}

/** Advertising campaign (SP/SB/SD) */
export type Campaign = {
  id: string
  org_unit_id: string
  brand_market_id: string
  marketplace_profile_id: string
  amazon_campaign_id: string | null
  amazon_state: AmazonState | null
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
  goal_mode: GoalMode
  learning_day: number
  autopilot_started_at: string | null
  created_by: string
  assigned_to: string | null
  launched_at: string | null
  paused_at: string | null
  created_at: string
  updated_at: string
}

/** Ad group within a campaign */
export type AdGroup = {
  id: string
  campaign_id: string
  amazon_ad_group_id: string | null
  name: string
  default_bid: number | null
  state: KeywordState | null
  created_at: string
  updated_at: string
}

/** Keyword/targeting within an ad group */
export type Keyword = {
  id: string
  campaign_id: string
  ad_group_id: string
  amazon_keyword_id: string | null
  keyword_text: string
  match_type: MatchType
  bid: number | null
  state: KeywordState | null
  manual_override_until: string | null
  last_auto_adjusted_at: string | null
  created_at: string
  updated_at: string
}
