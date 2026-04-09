// Design Ref: §3.2 P1 — Dayparting & spend intelligence types

import type { DiagnosisType, TrendDirection } from './enums'

/** Dayparting schedule for campaign group */
export type DaypartingSchedule = {
  id: string
  org_unit_id: string
  brand_market_id: string
  group_name: string
  campaign_ids: string[]
  is_enabled: boolean
  schedule: Record<string, unknown>
  ai_recommended_schedule: Record<string, unknown> | null
  last_applied_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

/** Hourly order weight for dayparting optimization */
export type HourlyWeight = {
  id: string
  brand_market_id: string
  asin: string | null
  day_of_week: number
  hour: number
  order_count: number
  revenue: number
  weight: number
  source: string
  period_start: string
  period_end: string
  updated_at: string
}

/** Spend diagnostic result */
export type SpendDiagnostic = {
  id: string
  campaign_id: string
  brand_market_id: string
  diagnosis_type: DiagnosisType
  root_causes: Record<string, unknown>
  utilization_pct: number | null
  analyzed_at: string
}

/** Weekly spend trend tracking */
export type SpendTrend = {
  id: string
  campaign_id: string | null
  brand_market_id: string
  metric: string
  week_start: string
  value: number
  prev_week_value: number | null
  trend_direction: TrendDirection | null
  consecutive_weeks_worsening: number
  updated_at: string
}
