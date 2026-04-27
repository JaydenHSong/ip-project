// AD Optimizer — Dashboard Feature Types
// Design Ref: §4.2 GET /api/ads/dashboard/ceo, /director

// ─── S01 CEO Dashboard ───

type BrandMarketMetrics = {
  market: string
  spend_mtd: number
  sales_mtd: number
  acos: number
  // null when account-level total sales unavailable (Sales & Traffic report not yet ingested)
  tacos: number | null
  roas: number
  roas_trend: number[]  // 30-day sparkline
  orders_mtd: number
}

type BrandSummary = {
  brand_id: string
  brand_name: string
  markets: BrandMarketMetrics[]
}

type AcosHeatmapCell = {
  brand: string
  market: string
  acos: number
  delta: number  // vs previous period
}

type RoasTrendPoint = {
  date: string
  spigen: number
  legato: number
  cyrill: number
}

type CeoDashboardData = {
  brands: BrandSummary[]
  alerts_count: number
  ai_status: 'healthy' | 'warning' | 'error'
  roas_trend_30d: RoasTrendPoint[]
  acos_heatmap: AcosHeatmapCell[]
}

type CeoDashboardResponse = {
  data: CeoDashboardData
}

// ─── S02 Director Dashboard ───

type BudgetPacingItem = {
  brand_market_id: string
  brand: string
  market: string
  channel: string
  planned: number
  actual: number
  pacing_pct: number
  on_track: boolean
}

type TeamPerformanceItem = {
  org_unit_id: string
  team_name: string
  spend: number
  acos: number
  delta_acos: number
  campaigns_count: number
}

type PendingActionItem = {
  id: string
  type: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  campaign_name: string
}

type AutopilotImpact = {
  acos_change: number
  savings: number
  actions_7d: number
}

type DirectorDashboardData = {
  budget_pacing: BudgetPacingItem[]
  market_performance: AcosHeatmapCell[]
  autopilot_impact: AutopilotImpact
  team_performance: TeamPerformanceItem[]
  pending_actions: PendingActionItem[]
  /** Exact unresolved count; list may be capped for display */
  pending_actions_total: number
}

type DirectorDashboardResponse = {
  data: DirectorDashboardData
}

// ─── S03 Marketer Dashboard ───

type MarketerAlertItem = {
  id: string
  alert_type: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  created_at: string
}

type MarketerRecommendationItem = {
  id: string
  type: string
  priority: number
  status: string
  created_at: string
  /** Keyword or context line for list display */
  keyword_text: string
}

type MarketerDashboardData = {
  campaigns: {
    id: string
    name: string
    status: string
    mode: string
    target_acos: number | null
    daily_budget: number | null
    weekly_budget: number | null
  }[]
  campaign_count: number
  alerts: MarketerAlertItem[]
  alert_count: number
  recommendations: MarketerRecommendationItem[]
  recommendation_count: number
}

type MarketerDashboardResponse = {
  data: MarketerDashboardData
}

export type {
  // CEO
  BrandMarketMetrics,
  BrandSummary,
  AcosHeatmapCell,
  RoasTrendPoint,
  CeoDashboardData,
  CeoDashboardResponse,
  // Director
  BudgetPacingItem,
  TeamPerformanceItem,
  PendingActionItem,
  AutopilotImpact,
  DirectorDashboardData,
  DirectorDashboardResponse,
  // Marketer
  MarketerAlertItem,
  MarketerRecommendationItem,
  MarketerDashboardData,
  MarketerDashboardResponse,
}
