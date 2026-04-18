// AD Optimizer — Budget Planning (team × market; unified plan channel `total`)

import type { Channel } from '@/modules/ads/shared/types'

/** Persisted plan rows: unified team budget (`total`) or legacy per–ad-type (sp/sb/sd). */
type BudgetChannel = Channel | 'total'

// ─── Query ───

type BudgetListQuery = {
  brand_market_id: string
  year: number
  org_unit_id: string
}

// ─── Response ───

type MonthAmount = {
  month: number
  amount: number
}

type TeamMonthlyBudget = {
  months: MonthAmount[]
  annual_total: number
}

type ChannelBudget = {
  channel: Channel
  months: MonthAmount[]
  annual_total: number
}

type YtdSummary = {
  planned: number
  /** Calendar YTD spend from snapshots — campaigns for resolved org in this market. */
  spent: number
  /** Same period, all campaigns in `brand_market_id` (aligns with market-level campaign KPI). */
  spent_market: number
  remaining: number
  pacing_pct: number
}

/** One row set for director rollup (all assignable teams in this market). */
type TeamBudgetRollupRow = {
  org_unit_id: string
  name: string
  plan_total: TeamMonthlyBudget
  actual_total: TeamMonthlyBudget
  ytd: YtdSummary
}

type BudgetListResponse = {
  data: {
    plans_by_channel: ChannelBudget[]
    actuals_by_channel: ChannelBudget[]
    plan_total: TeamMonthlyBudget
    actual_total: TeamMonthlyBudget
    ytd: YtdSummary
    org_unit_id: string
    team_options?: { id: string; name: string }[]
    /** Present when `rollup=teams` and user has multiple assignable orgs (e.g. director). */
    team_rollups?: TeamBudgetRollupRow[]
  }
}

// ─── Save ───

type BudgetEntry = {
  channel: BudgetChannel
  month: number
  amount: number
}

type SaveBudgetRequest = {
  brand_market_id: string
  year: number
  org_unit_id?: string
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
  /** Market-wide YTD spend (for hint when team `ytd_spent` is 0). */
  ytd_spent_market: number
  ytd_planned: number
  remaining: number
}

export type {
  BudgetListQuery,
  MonthAmount,
  TeamMonthlyBudget,
  TeamBudgetRollupRow,
  ChannelBudget,
  YtdSummary,
  BudgetListResponse,
  BudgetChannel,
  BudgetEntry,
  SaveBudgetRequest,
  ImportBudgetResponse,
  BudgetChangeLogItem,
  BudgetKpiData,
}
