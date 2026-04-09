// Design Ref: §3.2 P1 — Infrastructure & auxiliary types

import type { AlertType, Channel, Severity } from './enums'

/** Amazon API token (ads or sp-api) */
export type ApiToken = {
  id: string
  marketplace_profile_id: string
  token_type: 'ads' | 'sp'
  access_token: string
  expires_at: string
  created_at: string
}

/** Monthly advertising budget */
export type Budget = {
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

/** Campaign alert notification */
export type Alert = {
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

/** Budget change audit log */
export type BudgetChangeLog = {
  id: string
  budget_id: string
  user_id: string
  field: string
  old_value: string | null
  new_value: string | null
  changed_at: string
}

/** Generic entity change log */
export type ChangeLog = {
  id: string
  entity_type: string
  entity_id: string
  action: string
  changes: Record<string, unknown>
  source: string
  user_id: string | null
  created_at: string
}

/** Daily order cache from SP-API */
export type OrdersDailyCache = {
  id: string
  brand_market_id: string
  order_date: string
  total_orders: number
  total_revenue: number
  fetched_at: string
}

/** Marketing Stream notification log */
export type NotificationLog = {
  id: string
  brand_market_id: string
  notification_type: string
  payload: Record<string, unknown>
  processed: boolean
  received_at: string
}

/** Cached autopilot summary per brand-market */
export type CacheAutopilotSummary = {
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
