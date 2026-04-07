// AD Optimizer — Autopilot Feature Types
// Design Ref: §4.2 S08/S09, /api/ads/autopilot

import type { CampaignStatus, ActionType, ActionSource } from '@/modules/ads/shared/types'

// ─── S08 KPI ───

type AutopilotKpi = {
  active_count: number
  learning_count: number
  paused_count: number
  total_weekly_budget: number
  total_spend_7d: number
  avg_acos: number | null
  ai_actions_7d: number
}

// ─── S08 List Item ───

type GoalMode = 'launch' | 'growth' | 'profit' | 'defend'

type AutopilotCampaignItem = {
  id: string
  name: string
  marketing_code: string
  status: CampaignStatus
  goal_mode: GoalMode
  confidence_score: number | null
  target_acos: number | null
  weekly_budget: number | null
  spend_7d: number
  acos_7d: number | null
  last_action: string | null
  last_action_at: string | null
}

// ─── S09 Detail ───

type AutopilotDetail = {
  campaign: AutopilotCampaignItem
  kpi: {
    target_acos: number | null
    weekly_budget: number | null
    confidence: number | null
    actions_7d: number
  }
  activity_log: ActivityLogEntry[]
}

type ActivityLogEntry = {
  id: string
  action_type: ActionType
  source: ActionSource
  reason: string
  keyword_text: string | null
  old_value: string | null
  new_value: string | null
  guardrail_blocked: boolean
  guardrail_reason: string | null
  is_rolled_back: boolean
  executed_at: string
}

// ─── Rollback ───

type RollbackRequest = {
  log_ids: string[]
}

type RollbackResponse = {
  data: {
    rolled_back_count: number
    failed_count: number
  }
}

// ─── AI Review ───

type AiReviewEntry = {
  id: string
  review_type: string
  review_period_start: string
  review_period_end: string
  portfolio_summary: string | null
  recommendations: AiReviewRecommendation[]
  model_used: string
  tokens_used: number
  created_at: string
}

type AiReviewRecommendation = {
  campaign_id: string
  recommendation_type: string
  current_value: string
  suggested_value: string
  reasoning: string
  confidence: number
  priority: 'high' | 'medium' | 'low'
}

export type {
  GoalMode,
  AutopilotKpi,
  AutopilotCampaignItem,
  AutopilotDetail,
  ActivityLogEntry,
  RollbackRequest,
  RollbackResponse,
  AiReviewEntry,
  AiReviewRecommendation,
}
