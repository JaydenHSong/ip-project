// AD Optimizer — Shared Types
// Design Ref: §3.2 Table Definitions

// ─── Enums as Union Types ───

type CampaignType = 'sp' | 'sb' | 'sd'
type CampaignMode = 'autopilot' | 'manual'
type CampaignStatus = 'active' | 'paused' | 'learning' | 'archived'
type AmazonState = 'enabled' | 'paused' | 'archived'
type MatchType = 'broad' | 'phrase' | 'exact' | 'negative' | 'negative_phrase'
type KeywordState = 'enabled' | 'paused' | 'archived'
type Region = 'NA' | 'EU' | 'FE'
type Channel = 'sp' | 'sb' | 'sd'
type ReportLevel = 'campaign' | 'ad_group' | 'keyword' | 'search_term'
type TrendSignal = 'rising' | 'emerging' | 'stable' | 'declining'
type AlertType = 'budget_runout' | 'spend_spike' | 'acos_spike' | 'zero_sales' | 'buybox_lost' | 'stock_low' | 'cpc_surge' | 'cvr_drop'
type Severity = 'critical' | 'warning' | 'info'
type ActionType = 'bid_adjust' | 'keyword_add' | 'keyword_negate' | 'keyword_promote' | 'budget_adjust' | 'campaign_pause' | 'campaign_resume' | 'dayparting_apply'
type GoalMode = 'launch' | 'growth' | 'profit' | 'defend'
type ActionSource = 'rule_engine' | 'algorithm' | 'ml' | 'manual' | 'autopilot_formula' | 'autopilot_ai'
type RecommendationType = 'bid_adjust' | 'promote' | 'negate' | 'new_keyword' | 'trend_alert'
type RecommendationStatus = 'pending' | 'approved' | 'skipped' | 'expired'
type ImpactLevel = 'high' | 'medium' | 'low'
type RuleTemplate = 'high_acos_pause' | 'winner_promote' | 'low_ctr_negate' | 'budget_guard' | 'custom'
type RunFrequency = 'hourly' | 'daily' | 'weekly'
type DiagnosisType = 'underspend' | 'overspend' | 'waste' | 'trend_decline'
type TrendDirection = 'improving' | 'stable' | 'worsening'

// ─── Core Entities ───

type MarketplaceProfile = {
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

type Campaign = {
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

type AdGroup = {
  id: string
  campaign_id: string
  amazon_ad_group_id: string | null
  name: string
  default_bid: number | null
  state: KeywordState | null
  created_at: string
  updated_at: string
}

type Keyword = {
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

// ─── Reporting ───

type ReportSnapshot = {
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

type KpiMetrics = {
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

// ─── Automation ───

type Rule = {
  id: string
  org_unit_id: string
  brand_market_id: string
  name: string
  template: RuleTemplate
  condition_json: Record<string, unknown>
  action: string
  action_params: Record<string, unknown> | null
  scope: string
  scope_campaign_ids: string[] | null
  look_back_days: number
  run_frequency: RunFrequency
  is_active: boolean
  last_run_at: string | null
  last_affected_count: number
  created_by: string
  created_at: string
  updated_at: string
}

type AutomationLogEntry = {
  id: string
  campaign_id: string
  keyword_id: string | null
  rule_id: string | null
  batch_id: string
  action_type: ActionType
  action_detail: Record<string, unknown>
  reason: string
  source: ActionSource
  guardrail_blocked: boolean
  guardrail_id: string | null
  guardrail_reason: string | null
  is_rolled_back: boolean
  rolled_back_at: string | null
  rolled_back_by: string | null
  api_request: Record<string, unknown> | null
  api_response: Record<string, unknown> | null
  api_success: boolean | null
  executed_at: string
}

type KeywordRecommendation = {
  id: string
  campaign_id: string
  keyword_id: string | null
  brand_market_id: string
  recommendation_type: RecommendationType
  keyword_text: string
  match_type: string | null
  suggested_bid: number | null
  current_bid: number | null
  estimated_impact: number | null
  impact_level: ImpactLevel | null
  reason: string
  source: string
  status: RecommendationStatus
  metrics: Record<string, unknown> | null
  created_at: string
  expires_at: string
}

// ─── Budget ───

type Budget = {
  id: string
  org_unit_id: string
  brand_market_id: string
  year: number
  month: number
  channel: Channel
  amount: number
  is_actual: boolean
  created_by: string
  created_at: string
  updated_at: string
}

// ─── Alerts ───

type Alert = {
  id: string
  campaign_id: string
  brand_market_id: string
  alert_type: AlertType
  severity: Severity
  title: string
  message: string
  data: Record<string, unknown> | null
  is_read: boolean
  is_resolved: boolean
  resolved_by: string | null
  created_at: string
}

// ─── Dayparting ───

type DaypartingSchedule = {
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

type HourlyWeight = {
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

// ─── Auxiliary Tables ───

type ApiToken = {
  id: string
  marketplace_profile_id: string
  token_type: 'ads' | 'sp'
  access_token: string
  expires_at: string
  created_at: string
}

type KeywordRanking = {
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

type SearchTermReport = {
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

type BudgetChangeLog = {
  id: string
  budget_id: string
  user_id: string
  field: string
  old_value: string | null
  new_value: string | null
  changed_at: string
}

type ChangeLog = {
  id: string
  entity_type: string
  entity_id: string
  action: string
  changes: Record<string, unknown>
  source: string
  user_id: string | null
  created_at: string
}

type OrdersDailyCache = {
  id: string
  brand_market_id: string
  order_date: string
  total_orders: number
  total_revenue: number
  fetched_at: string
}

type NotificationLog = {
  id: string
  brand_market_id: string
  notification_type: string
  payload: Record<string, unknown>
  processed: boolean
  received_at: string
}

type CacheAutopilotSummary = {
  id: string
  org_unit_id: string
  brand_market_id: string
  active_count: number
  learning_count: number
  paused_count: number
  total_weekly_budget: number
  total_spend_7d: number
  avg_acos: number | null
  ai_actions_7d: number
  updated_at: string
}

// ─── Spend Intelligence ───

type SpendDiagnostic = {
  id: string
  campaign_id: string
  brand_market_id: string
  diagnosis_type: DiagnosisType
  root_causes: Record<string, unknown>
  utilization_pct: number | null
  analyzed_at: string
}

type SpendTrend = {
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

export type {
  // Enums
  CampaignType, CampaignMode, CampaignStatus, AmazonState,
  MatchType, KeywordState, Region, Channel, ReportLevel,
  TrendSignal, AlertType, Severity, ActionType, ActionSource, GoalMode,
  RecommendationType, RecommendationStatus, ImpactLevel,
  RuleTemplate, RunFrequency, DiagnosisType, TrendDirection,
  // Entities
  MarketplaceProfile, Campaign, AdGroup, Keyword,
  ReportSnapshot, KpiMetrics, Rule, AutomationLogEntry,
  KeywordRecommendation, Budget, Alert,
  DaypartingSchedule, HourlyWeight,
  SpendDiagnostic, SpendTrend,
  // Auxiliary
  ApiToken, KeywordRanking, SearchTermReport,
  BudgetChangeLog, ChangeLog, OrdersDailyCache,
  NotificationLog, CacheAutopilotSummary,
}
