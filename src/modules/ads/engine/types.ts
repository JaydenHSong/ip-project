// AD Optimizer — Engine Types
// Design Ref: §2.1 engine/ — 자동화 엔진 공통 타입

type BidCalculation = {
  campaign_id: string
  keyword_id: string
  current_bid: number
  suggested_bid: number
  target_acos: number
  actual_acos: number
  cvr: number
  aov: number
  confidence: number
}

type BudgetPacingResult = {
  campaign_id: string
  daily_budget: number
  spent_today: number
  remaining_budget: number
  utilization_pct: number
  recommended_hourly_spend: number
  is_on_pace: boolean
}

type KeywordScore = {
  keyword_id: string
  keyword_text: string
  score: number
  cvr: number
  acos: number
  relevance: number
  recommendation: 'promote' | 'negate' | 'adjust_bid' | 'keep'
}

type RuleCondition = {
  metric: string
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between'
  value: number
  value2?: number
}

type RuleEvaluation = {
  rule_id: string
  matched: boolean
  affected_count: number
  affected_ids: string[]
  action: string
  action_params: Record<string, unknown>
}

type DaypartMultiplier = {
  day_of_week: number
  hour: number
  multiplier: number
  source: 'orders_db' | 'marketing_stream' | 'manual'
}

type GuardrailCheckParams = {
  action_type: string
  campaign_id: string
  current_value: number
  proposed_value: number
  daily_budget?: number
  max_bid_cap?: number
  confidence_score?: number
  // G07: pause/resume throttle
  recent_pause_count?: number
  // G08: bulk action
  affected_count?: number
  // G09: negate safety
  keyword_orders?: number
  // G10: rollback window
  last_action_at?: string
  // HG-01~05: AutoPilot Hard Guards
  current_acos_7d?: number
  target_acos?: number
  daily_spend_pct?: number
  weekly_spend_pct?: number
  learning_day?: number
  cycle_action_count?: number
}

// ─── AutoPilot Types ───

type AutoPilotContext = {
  campaign_id: string
  profile_id: string
  goal_mode: 'launch' | 'growth' | 'profit' | 'defend'
  target_acos: number
  weekly_budget: number
  max_bid_cap: number | null
  learning_day: number
  confidence_score: number
  autopilot_started_at: string
}

type AutoPilotAction = {
  type: 'bid_adjust' | 'budget_adjust' | 'campaign_state' | 'keyword_add' | 'keyword_negate'
  campaign_id: string
  keyword_id?: string
  ad_group_id?: string
  current_value: number
  proposed_value: number
  reason: string
  source: 'autopilot_formula'
  confidence: number
}

type AutoPilotSkipped = {
  action: AutoPilotAction
  blocked_by: 'soft_guard' | 'hard_guard' | 'learning_guard'
  guard_reason: string
}

type MetricsSnapshot = {
  acos_7d: number | null
  acos_14d: number | null
  spend_7d: number
  sales_7d: number
  impressions_7d: number
  clicks_7d: number
  orders_7d: number
}

type AutoPilotResult = {
  actions: AutoPilotAction[]
  skipped: AutoPilotSkipped[]
  metrics_snapshot: MetricsSnapshot
}

export type {
  BidCalculation, BudgetPacingResult, KeywordScore,
  RuleCondition, RuleEvaluation, DaypartMultiplier,
  GuardrailCheckParams,
  AutoPilotContext, AutoPilotAction, AutoPilotSkipped,
  MetricsSnapshot, AutoPilotResult,
}
