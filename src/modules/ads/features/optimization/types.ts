// AD Optimizer — Optimization Feature Types
// Design Ref: §4.2 S04-S07, S11, M03-M05

import type { RecommendationType, RecommendationStatus, ImpactLevel, RuleTemplate, RunFrequency } from '@/modules/ads/shared/types'

// ─── S04 Strategy Strip ───

type StrategyStripData = {
  target_acos: number | null
  max_bid: number | null
  daily_limit: number | null
  active_rules: number
}

// ─── S04 Today's Focus (Top 3 recommendations) ───

type FocusCard = {
  id: string
  keyword_text: string
  current_bid: number
  suggested_bid: number
  estimated_impact: number
  impact_level: ImpactLevel
  reason: string
}

// ─── S04/S06/S11 Recommendations ───

type RecommendationItem = {
  id: string
  campaign_id: string
  campaign_name: string
  recommendation_type: RecommendationType
  keyword_text: string
  current_bid: number | null
  suggested_bid: number | null
  estimated_impact: number | null
  impact_level: ImpactLevel
  reason: string
  metrics: { clicks?: number; conv?: number; acos?: number; spend?: number } | null
  source: string
  status: RecommendationStatus
  created_at: string
}

type RecommendationSummary = {
  total_pending: number
  est_acos_impact: number
  est_revenue_impact: number
  est_waste_reduction: number
}

type RecommendationListResponse = {
  data: RecommendationItem[]
  summary: RecommendationSummary
}

// ─── S05 Budget Pacing ───

type HourlySpendPoint = {
  hour: number
  actual: number
  predicted: number
}

type BudgetPacingDetail = {
  daily_budget: number
  spend_today: number
  remaining: number
  pacing_pct: number
  distribution: 'even' | 'weighted'
  hourly_spend: HourlySpendPoint[]
}

// ─── S06 Keyword Stats ───

type KeywordStatsStrip = {
  auto_count: number
  broad_count: number
  phrase_count: number
  exact_count: number
  pending_actions: number
}

// ─── S07 Dayparting ───

type HeatmapCell = {
  day: number  // 0-6 (Sun-Sat)
  hour: number // 0-23
  weight: number
  is_active: boolean
}

type DaypartingGroup = {
  id: string
  group_name: string
  campaign_count: number
  is_enabled: boolean
  heatmap: HeatmapCell[]
  ai_recommended: HeatmapCell[] | null
}

// ─── M03 Rule Create ───

type RuleFormData = {
  name: string
  template: RuleTemplate
  condition_metric: string
  condition_operator: '>' | '<' | '>=' | '<='
  condition_value: number
  action: string
  action_params: Record<string, unknown>
  scope: 'all' | 'selected'
  scope_campaign_ids: string[]
  look_back_days: number
  run_frequency: RunFrequency
}

// ─── M04 Alert Detail ───

type AlertDetailData = {
  id: string
  alert_type: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  message: string
  campaign_id: string
  campaign_name: string
  data: Record<string, unknown> | null
  created_at: string
  quick_actions: { key: string; label: string; variant: 'default' | 'danger'; recommended?: boolean }[]
  hero_number?: string
  hero_label?: string
  hero_progress?: number
  kpi_cards?: { label: string; value: string; delta?: string; delta_type?: 'positive' | 'negative' }[]
  hourly_spend?: { hour: number; spend: number }[]
}

// ─── M05 Underspend ───

type SpendDiagnosticCause = {
  id: string
  cause: string
  contribution_pct: number
  description: string
  fix_action: string
  fix_label: string
}

// ─── S07 Group Status ───

type DaypartingGroupStatus = {
  id: string
  group_name: string
  campaign_count: number
  is_enabled: boolean
  active_hours: number
  total_hours: number
  last_updated: string
}

// ─── S11 AI Recommendations ───

type ApproveRequest = {
  adjusted_bid?: number
}

type ApproveResponse = {
  data: {
    success: boolean
    action_taken: string
    automation_log_id: string
    api_success?: boolean
  }
}

export type {
  StrategyStripData,
  FocusCard,
  RecommendationItem,
  RecommendationSummary,
  RecommendationListResponse,
  HourlySpendPoint,
  BudgetPacingDetail,
  KeywordStatsStrip,
  HeatmapCell,
  DaypartingGroup,
  DaypartingGroupStatus,
  RuleFormData,
  AlertDetailData,
  SpendDiagnosticCause,
  ApproveRequest,
  ApproveResponse,
}
