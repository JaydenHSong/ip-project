// AD Optimizer — Budget Planning Feature Types
// Design Ref: §4.2 GET/PUT /api/ads/budgets, POST /api/ads/budgets/import

import type { Channel } from '@/modules/ads/shared/types'

// ─── Query ───

type BudgetListQuery = {
  brand_market_id: string
  year: number
  org_unit_id?: string
}

// ─── Response ───

type MonthAmount = {
  month: number
  amount: number
}

type ChannelBudget = {
  channel: Channel
  months: MonthAmount[]
  annual_total: number
}

type YtdSummary = {
  planned: number
  spent: number
  remaining: number
  pacing_pct: number
}

type BudgetListResponse = {
  data: {
    plans: ChannelBudget[]
    actuals: ChannelBudget[]
    autopilot_monthly: number[]
    ytd: YtdSummary
  }
}

// ─── Save ───

type BudgetEntry = {
  channel: Channel
  month: number
  amount: number
}

type SaveBudgetRequest = {
  brand_market_id: string
  year: number
  entries: BudgetEntry[]
}

// ─── Import ───

type ImportBudgetResponse = {
  data: {
    imported_count: number
    skipped_count: number
    errors: { row: number; message: string }[]
  }
}

// ─── Change Log ───

type BudgetChangeLogItem = {
  id: string
  user_name: string
  field: string
  old_value: string | null
  new_value: string | null
  changed_at: string
}

// ─── KPI Strip ───

type BudgetKpiData = {
  annual_planned: number
  ytd_spent: number
  ytd_planned: number
  remaining: number
  autopilot_total: number
}

export type {
  BudgetListQuery,
  MonthAmount,
  ChannelBudget,
  YtdSummary,
  BudgetListResponse,
  BudgetEntry,
  SaveBudgetRequest,
  ImportBudgetResponse,
  BudgetChangeLogItem,
  BudgetKpiData,
}
