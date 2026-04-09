// Design Ref: §3.2 P1 — Reporting & analytics types

import type { ReportLevel, TrendSignal } from './enums'

/** Daily campaign performance snapshot */
export type ReportSnapshot = {
  id: string
  campaign_id: string
  ad_group_id: string | null
  keyword_id: string | null
  brand_market_id: string
  report_date: string
  report_level: ReportLevel
  impressions: number
  clicks: number
  spend: number
  sales: number
  orders: number
  acos: number | null
  cpc: number | null
  ctr: number | null
  cvr: number | null
  roas: number | null
  fetched_at: string
}

/** Aggregated KPI metrics */
export type KpiMetrics = {
  impressions: number
  clicks: number
  spend: number
  sales: number
  orders: number
  acos: number | null
  cpc: number | null
  ctr: number | null
  cvr: number | null
  roas: number | null
}

/** Search term performance from Amazon reports */
export type SearchTermReport = {
  id: string
  campaign_id: string
  ad_group_id: string
  brand_market_id: string
  search_term: string
  report_date: string
  impressions: number
  clicks: number
  spend: number
  sales: number
  orders: number
  acos: number | null
  fetched_at: string
}

/** Brand Analytics keyword ranking */
export type KeywordRanking = {
  id: string
  brand_market_id: string
  keyword_text: string
  week_start: string
  search_frequency_rank: number | null
  click_share: number | null
  conversion_share: number | null
  top_clicked_asins: string[] | null
  trend_signal: TrendSignal | null
  fetched_at: string
}
