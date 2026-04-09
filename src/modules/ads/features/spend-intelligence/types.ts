// AD Optimizer — Spend Intelligence Feature Types
// Design Ref: §2.1 spend-intelligence, S12

// ─── Spend Leak Summary ───

type SpendLeakItem = {
  campaign_id: string
  campaign_name: string
  diagnosis_type: 'underspend' | 'overspend' | 'waste' | 'trend_decline'
  utilization_pct: number | null
  root_causes: string[]
  spend_7d: number
  waste_amount: number
}

type SpendLeakSummary = {
  total_waste: number
  total_campaigns_affected: number
  top_issue: string
  items: SpendLeakItem[]
}

// ─── Top Wasters ───

type TopWasterItem = {
  campaign_id: string
  campaign_name: string
  marketing_code: string
  spend_7d: number
  sales_7d: number
  acos: number
  waste_score: number // 0-100, higher = worse
  primary_cause: string
}

// ─── Trend Alerts ───

type TrendAlertItem = {
  id: string
  campaign_id: string | null
  campaign_name: string | null
  metric: string
  direction: 'improving' | 'stable' | 'worsening'
  current_value: number
  previous_value: number
  consecutive_weeks: number
  severity: 'critical' | 'warning' | 'info'
}

// ─── AI Diagnosis ───

type AiDiagnosisItem = {
  campaign_id: string
  campaign_name: string
  diagnosis: string
  confidence: number
  suggested_actions: string[]
  estimated_savings: number
}

// ─── Quick Fix Action ───

type QuickFixAction = {
  id: string
  campaign_id: string
  campaign_name: string
  action_type: 'pause' | 'reduce_budget' | 'adjust_bids'
  description: string
  estimated_impact: number
  severity: 'high' | 'medium' | 'low'
  // Server-calculated recommended values (C5 fix: prevent client-side budget=0 hardcoding)
  current_daily_budget: number | null
  recommended_daily_budget: number | null
  current_max_bid_cap: number | null
  recommended_max_bid_cap: number | null
}

// ─── Full Response ───

type SpendIntelligenceResponse = {
  data: {
    summary: SpendLeakSummary
    top_wasters: TopWasterItem[]
    trend_alerts: TrendAlertItem[]
    ai_diagnosis: AiDiagnosisItem[]
    quick_fixes: QuickFixAction[]
  }
}

export type {
  SpendLeakItem,
  SpendLeakSummary,
  TopWasterItem,
  TrendAlertItem,
  AiDiagnosisItem,
  QuickFixAction,
  SpendIntelligenceResponse,
}
