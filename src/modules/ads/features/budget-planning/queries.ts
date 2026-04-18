// AD Optimizer — Budget Planning (team × market; read may aggregate SP/SB/SD; save uses `total` or legacy channels)

import { createAdminClient, createAdsAdminClient } from '@/lib/supabase/admin'
import type { Channel } from '@/modules/ads/shared/types'
import type {
  BudgetListQuery,
  TeamMonthlyBudget,
  ChannelBudget,
  YtdSummary,
  BudgetEntry,
  BudgetChangeLogItem,
} from './types'
import { getActualsByChannel, getMarketWideMonthlySpendTotal } from './queries-budget-actuals'

const CHANNELS: Channel[] = ['sp', 'sb', 'sd']
const SAVE_CHANNELS = ['sp', 'sb', 'sd', 'total'] as const
type SaveChannel = (typeof SAVE_CHANNELS)[number]
const LEGACY_CHANNELS = ['sp', 'sb', 'sd'] as const
const TEAM_CHANNEL = 'total'

const sumChannelBudgets = (channels: ChannelBudget[]): TeamMonthlyBudget => {
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const amount = channels.reduce(
      (s, c) => s + (c.months.find((m) => m.month === month)?.amount ?? 0),
      0,
    )
    return { month, amount }
  })
  return {
    months,
    annual_total: months.reduce((s, m) => s + m.amount, 0),
  }
}

const buildRowFromTotalOrLegacy = (rows: { channel: string; month: number; amount: number }[]): TeamMonthlyBudget => {
  const hasTotal = rows.some((r) => r.channel === TEAM_CHANNEL)
  const useRows = hasTotal
    ? rows.filter((r) => r.channel === TEAM_CHANNEL)
    : rows.filter((r) => LEGACY_CHANNELS.includes(r.channel as (typeof LEGACY_CHANNELS)[number]))

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    if (hasTotal) {
      const amount = useRows.find((r) => r.month === month)?.amount ?? 0
      return { month, amount: Number(amount) }
    }
    const amount = useRows.filter((r) => r.month === month).reduce((s, r) => s + Number(r.amount ?? 0), 0)
    return { month, amount }
  })

  return {
    months,
    annual_total: months.reduce((s, m) => s + m.amount, 0),
  }
}

const groupPlansByChannel = (rows: { channel: string; month: number; amount: number }[]): ChannelBudget[] => {
  return CHANNELS.map((ch) => {
    const channelRows = rows.filter((r) => r.channel === ch)
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const amount = channelRows.find((r) => r.month === month)?.amount ?? 0
      return { month, amount: Number(amount) }
    })
    return {
      channel: ch,
      months,
      annual_total: months.reduce((s, m) => s + m.amount, 0),
    }
  })
}

// ─── GET: Budget list ───

const getBudgets = async (query: BudgetListQuery) => {
  const supabase = createAdsAdminClient()
  const { brand_market_id, year, org_unit_id } = query

  const { data: planned } = await supabase
    .from('budgets')
    .select('channel, month, amount')
    .eq('brand_market_id', brand_market_id)
    .eq('org_unit_id', org_unit_id)
    .eq('year', year)
    .eq('is_actual', false)
    .order('channel')
    .order('month')

  const rows = planned ?? []
  const plans_by_channel = groupPlansByChannel(rows)
  const channelPlannedSum = plans_by_channel.reduce((s, c) => s + c.annual_total, 0)
  const hasTotalChannel = rows.some((r) => r.channel === TEAM_CHANNEL)

  const plan_total: TeamMonthlyBudget =
    hasTotalChannel && channelPlannedSum === 0
      ? buildRowFromTotalOrLegacy(rows)
      : sumChannelBudgets(plans_by_channel)

  const actuals_by_channel = await getActualsByChannel(org_unit_id, brand_market_id, year)
  const actual_total = sumChannelBudgets(actuals_by_channel)

  const marketSpendMonths = await getMarketWideMonthlySpendTotal(brand_market_id, year)

  const currentMonth = new Date().getMonth() + 1
  const ytdPlanned = plan_total.months.filter((m) => m.month <= currentMonth).reduce((s, m) => s + m.amount, 0)
  const ytdSpent = actual_total.months.filter((m) => m.month <= currentMonth).reduce((s, m) => s + m.amount, 0)
  const ytdSpentMarket = marketSpendMonths.months
    .filter((m) => m.month <= currentMonth)
    .reduce((s, m) => s + m.amount, 0)
  const annualPlanned = plan_total.annual_total

  const ytd: YtdSummary = {
    planned: ytdPlanned,
    spent: ytdSpent,
    spent_market: ytdSpentMarket,
    remaining: annualPlanned - ytdSpent,
    pacing_pct: ytdPlanned > 0 ? (ytdSpent / ytdPlanned) * 100 : 0,
  }

  return {
    plans_by_channel,
    actuals_by_channel,
    plan_total,
    actual_total,
    ytd,
  }
}

// ─── PUT: Save budgets (`total` unified or legacy sp/sb/sd) ───

const saveBudgets = async (
  brandMarketId: string,
  year: number,
  orgUnitId: string,
  entries: BudgetEntry[],
  userId: string,
) => {
  const supabase = createAdsAdminClient()

  const isSaveChannel = (c: string): c is SaveChannel =>
    (SAVE_CHANNELS as readonly string[]).includes(c)

  for (const entry of entries) {
    if (!isSaveChannel(entry.channel)) continue

    const { data: existing } = await supabase
      .from('budgets')
      .select('id, amount')
      .eq('brand_market_id', brandMarketId)
      .eq('org_unit_id', orgUnitId)
      .eq('year', year)
      .eq('channel', entry.channel as string)
      .eq('month', entry.month)
      .eq('is_actual', false)
      .maybeSingle()

    if (existing) {
      if (existing.amount !== entry.amount) {
        await supabase
          .from('budgets')
          .update({ amount: entry.amount, updated_at: new Date().toISOString() })
          .eq('id', existing.id)

        await supabase.from('budget_change_log').insert({
          budget_id: existing.id,
          user_id: userId,
          field: `${entry.channel}_${entry.month}`,
          old_value: String(existing.amount),
          new_value: String(entry.amount),
        })
      }
    } else {
      const { data: newBudget } = await supabase
        .from('budgets')
        .insert({
          org_unit_id: orgUnitId,
          brand_market_id: brandMarketId,
          year,
          month: entry.month,
          channel: entry.channel,
          amount: entry.amount,
          is_actual: false,
          created_by: userId,
        })
        .select('id')
        .single()

      if (newBudget) {
        await supabase.from('budget_change_log').insert({
          budget_id: newBudget.id,
          user_id: userId,
          field: `${entry.channel}_${entry.month}`,
          old_value: null,
          new_value: String(entry.amount),
        })
      }
    }
  }

  return { updated: entries.length }
}

// ─── GET: Change log ───

const getBudgetChangeLog = async (
  brandMarketId: string,
  orgUnitId: string,
  year: number,
  limit = 50,
): Promise<BudgetChangeLogItem[]> => {
  const supabase = createAdsAdminClient()

  const { data: budgetIds } = await supabase
    .from('budgets')
    .select('id')
    .eq('brand_market_id', brandMarketId)
    .eq('org_unit_id', orgUnitId)
    .eq('year', year)

  const ids = (budgetIds ?? []).map((b) => b.id)
  if (ids.length === 0) return []

  const { data: logs } = await supabase
    .from('budget_change_log')
    .select('id, user_id, field, old_value, new_value, changed_at')
    .in('budget_id', ids)
    .order('changed_at', { ascending: false })
    .limit(limit)

  const userIds = [...new Set((logs ?? []).map((l) => l.user_id))]
  const publicDb = createAdminClient()
  const { data: users } = await publicDb
    .from('users')
    .select('id, name')
    .in('id', userIds.length > 0 ? userIds : ['__none__'])

  const userMap = new Map((users ?? []).map((u) => [u.id, u.name]))

  return (logs ?? []).map((l) => ({
    id: l.id,
    user_name: userMap.get(l.user_id) ?? 'Unknown',
    field: l.field,
    old_value: l.old_value,
    new_value: l.new_value,
    changed_at: l.changed_at,
  }))
}

export { getBudgets, saveBudgets, getBudgetChangeLog }
