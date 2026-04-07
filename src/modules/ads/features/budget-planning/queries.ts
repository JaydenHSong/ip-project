// AD Optimizer — Budget Planning Server Queries
// Design Ref: §4.2 Budget endpoints

import { createAdsAdminClient } from '@/lib/supabase/admin'
import type { BudgetListQuery, ChannelBudget, YtdSummary, BudgetEntry, BudgetChangeLogItem } from './types'
import type { Channel } from '@/modules/ads/shared/types'

const CHANNELS: Channel[] = ['sp', 'sb', 'sd']

// ─── GET: Budget list ───

const getBudgets = async (query: BudgetListQuery) => {
  const supabase = createAdsAdminClient()
  const { brand_market_id, year } = query

  // 1. Planned budgets
  const { data: planned } = await supabase
    .from('budgets')
    .select('channel, month, amount')
    .eq('brand_market_id', brand_market_id)
    .eq('year', year)
    .eq('is_actual', false)
    .order('channel')
    .order('month')

  // 2. Actual spend (from report_snapshots aggregated monthly)
  const { data: actuals } = await supabase
    .from('budgets')
    .select('channel, month, amount')
    .eq('brand_market_id', brand_market_id)
    .eq('year', year)
    .eq('is_actual', true)
    .order('channel')
    .order('month')

  // Group by channel
  const groupByChannel = (rows: { channel: string; month: number; amount: number }[]): ChannelBudget[] => {
    return CHANNELS.map((ch) => {
      const channelRows = (rows ?? []).filter((r) => r.channel === ch)
      const months = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        amount: channelRows.find((r) => r.month === i + 1)?.amount ?? 0,
      }))
      return {
        channel: ch,
        months,
        annual_total: months.reduce((s, m) => s + m.amount, 0),
      }
    })
  }

  const plans = groupByChannel(planned ?? [])
  const actualData = groupByChannel(actuals ?? [])

  // 3. YTD summary
  const currentMonth = new Date().getMonth() + 1
  const ytdPlanned = plans.reduce(
    (sum, ch) => sum + ch.months.filter((m) => m.month <= currentMonth).reduce((s, m) => s + m.amount, 0),
    0,
  )
  const ytdSpent = actualData.reduce(
    (sum, ch) => sum + ch.months.filter((m) => m.month <= currentMonth).reduce((s, m) => s + m.amount, 0),
    0,
  )
  const annualPlanned = plans.reduce((s, ch) => s + ch.annual_total, 0)

  const ytd: YtdSummary = {
    planned: ytdPlanned,
    spent: ytdSpent,
    remaining: annualPlanned - ytdSpent,
    pacing_pct: ytdPlanned > 0 ? (ytdSpent / ytdPlanned) * 100 : 0,
  }

  // 4. Auto Pilot monthly (from autopilot campaigns' weekly_budget × 4.3)
  const { data: apCampaigns } = await supabase
    .from('campaigns')
    .select('weekly_budget')
    .eq('brand_market_id', brand_market_id)
    .eq('mode', 'autopilot')
    .in('status', ['active', 'learning'])

  const monthlyAp = (apCampaigns ?? []).reduce((s, c) => s + ((c.weekly_budget ?? 0) * 4.3), 0)
  const autopilotMonthly = Array.from({ length: 12 }, () => monthlyAp)

  return {
    plans,
    actuals: actualData,
    autopilot_monthly: autopilotMonthly,
    ytd,
  }
}

// ─── PUT: Save budgets ───

const saveBudgets = async (brandMarketId: string, year: number, entries: BudgetEntry[], userId: string) => {
  const supabase = createAdsAdminClient()

  // Upsert each entry
  for (const entry of entries) {
    // Check if exists
    const { data: existing } = await supabase
      .from('budgets')
      .select('id, amount')
      .eq('brand_market_id', brandMarketId)
      .eq('year', year)
      .eq('channel', entry.channel)
      .eq('month', entry.month)
      .eq('is_actual', false)
      .single()

    if (existing) {
      // Update + log change
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
      // Insert new
      const { data: newBudget } = await supabase
        .from('budgets')
        .insert({
          org_unit_id: brandMarketId, // TODO: resolve proper org_unit_id
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

const getBudgetChangeLog = async (brandMarketId: string, year: number, limit = 50): Promise<BudgetChangeLogItem[]> => {
  const supabase = createAdsAdminClient()

  const { data: budgetIds } = await supabase
    .from('budgets')
    .select('id')
    .eq('brand_market_id', brandMarketId)
    .eq('year', year)

  const ids = (budgetIds ?? []).map((b) => b.id)
  if (ids.length === 0) return []

  const { data: logs } = await supabase
    .from('budget_change_log')
    .select('id, user_id, field, old_value, new_value, changed_at')
    .in('budget_id', ids)
    .order('changed_at', { ascending: false })
    .limit(limit)

  // Get user names
  const userIds = [...new Set((logs ?? []).map((l) => l.user_id))]
  const { data: users } = await supabase
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
