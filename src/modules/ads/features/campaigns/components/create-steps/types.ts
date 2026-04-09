import type { CampaignType, CampaignMode, MatchType } from '@/modules/ads/shared/types'

export type KeywordEntry = {
  text: string
  match_type: MatchType
  bid: number
}

export type FormState = {
  campaign_type: CampaignType
  mode: CampaignMode
  marketing_code: string
  name: string
  target_acos: number
  daily_budget: number
  weekly_budget: number
  max_bid_cap: number
  targeting_type: 'keyword' | 'product'
  keywords: KeywordEntry[]
  negative_keywords: { text: string; match_type: MatchType }[]
  product_asins: string[]
}

export const INITIAL_STATE: FormState = {
  campaign_type: 'sp',
  mode: 'manual',
  marketing_code: '',
  name: '',
  target_acos: 25,
  daily_budget: 50,
  weekly_budget: 350,
  max_bid_cap: 5,
  targeting_type: 'keyword',
  keywords: [],
  negative_keywords: [],
  product_asins: [],
}

export const STEPS_MANUAL = ['Team & Name', 'Mode', 'Type & Targeting', 'Review'] as const
export const STEPS_AUTOPILOT = ['Team & Name', 'Mode', 'Budget', 'Review'] as const
