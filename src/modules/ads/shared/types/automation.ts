// Design Ref: §3.2 P1 — Automation & rules types

import type {
  ActionSource, ActionType, ImpactLevel,
  RecommendationStatus, RecommendationType,
  RuleTemplate, RunFrequency,
} from './enums'

/** Automation rule definition */
export type Rule = {
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

/** Automation action log entry */
export type AutomationLogEntry = {
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

/** AI-generated keyword recommendation */
export type KeywordRecommendation = {
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
