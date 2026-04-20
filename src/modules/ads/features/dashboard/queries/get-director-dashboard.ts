// S02 — Director dashboard aggregation (server)
// Design Ref: §4.2

import { createAdsAdminClient } from '@/lib/supabase/admin'
import type {
  DirectorDashboardData,
  AcosHeatmapCell,
  BudgetPacingItem,
  TeamPerformanceItem,
  PendingActionItem,
} from '../types'
import { getMonthRange } from './month-range'
import {
  computePrevAcosByBrandMarket,
  computePrevAcosByTeam,
  computeAutopilotImpact,
} from './compute-prev-period'

const getDirectorDashboard = async (
  orgUnitId: string,
  brandMarketIds: string[],
): Promise<DirectorDashboardData> => {
  const supabase = createAdsAdminClient()
  const { start, dayOfMonth } = getMonthRange()
  const bmFilter = brandMarketIds.length > 0 ? brandMarketIds : ['__none__']

  const { data: budgetRows } = await supabase
    .from('budgets')
    .select('brand_market_id, channel, amount')
    .in('brand_market_id', bmFilter)
    .eq('is_actual', false)
    .eq('year', new Date().getFullYear())
    .eq('month', new Date().getMonth() + 1)

  const { data: bmInfo } = await supabase
    .from('brand_markets')
    .select('id, brand_name, marketplace')
    .in('id', bmFilter)

  const { data: spendSnapshots } = await supabase
    .from('report_snapshots')
    .select('brand_market_id, spend, sales')
    .in('brand_market_id', bmFilter)
    .eq('report_level', 'campaign')
    .gte('report_date', start)

  const spendByBm = new Map<string, number>()
  for (const s of spendSnapshots ?? []) {
    spendByBm.set(s.brand_market_id, (spendByBm.get(s.brand_market_id) ?? 0) + (s.spend ?? 0))
  }

  const bmLookup = new Map((bmInfo ?? []).map((b) => [b.id, b]))

  const hasTotalByBm = new Map<string, boolean>()
  for (const r of budgetRows ?? []) {
    if (r.channel === 'total') {
      hasTotalByBm.set(r.brand_market_id as string, true)
    }
  }

  const plannedByBm = new Map<string, { planned: number; channel: string }>()
  for (const r of budgetRows ?? []) {
    const bmid = r.brand_market_id as string
    const ch = r.channel as string
    const amt = Number(r.amount ?? 0)
    if (hasTotalByBm.get(bmid)) {
      if (ch === 'total') {
        plannedByBm.set(bmid, { planned: amt, channel: 'total' })
      }
    } else if (ch === 'sp' || ch === 'sb' || ch === 'sd') {
      const prev = plannedByBm.get(bmid)?.planned ?? 0
      plannedByBm.set(bmid, { planned: prev + amt, channel: 'sp+sb+sd' })
    }
  }

  const budgetPacing: BudgetPacingItem[] = []
  for (const [bmid, row] of plannedByBm) {
    const bm = bmLookup.get(bmid)
    const actual = spendByBm.get(bmid) ?? 0
    const expectedPct = (dayOfMonth / 30) * 100
    const pacingPct = row.planned > 0 ? (actual / row.planned) * 100 : 0
    budgetPacing.push({
      brand_market_id: bmid,
      brand: bm?.brand_name ?? 'Unknown',
      market: bm?.marketplace ?? 'US',
      channel: row.channel,
      planned: row.planned,
      actual,
      pacing_pct: pacingPct,
      on_track: Math.abs(pacingPct - expectedPct) < 15,
    })
  }

  // Compute previous-month ACoS by bm for delta computation (shared helper)
  const prevAcosByBm = await computePrevAcosByBrandMarket(supabase, brandMarketIds)

  const marketPerformance: AcosHeatmapCell[] = []
  for (const [bmId, spend] of spendByBm) {
    const bm = bmLookup.get(bmId)
    const sales = (spendSnapshots ?? [])
      .filter((s) => s.brand_market_id === bmId)
      .reduce((sum, s) => sum + (s.sales ?? 0), 0)
    const acos = sales > 0 ? (spend / sales) * 100 : 0
    const prevAcos = prevAcosByBm.get(bmId) ?? 0
    marketPerformance.push({
      brand: bm?.brand_name ?? 'Unknown',
      market: bm?.marketplace ?? 'US',
      acos,
      delta: prevAcos > 0 ? acos - prevAcos : 0,
    })
  }

  // Plan §1.2 fix: compute real autopilot impact (was hardcoded 0/0)
  const autopilotImpact = await computeAutopilotImpact(supabase, brandMarketIds)

  const { data: teams } = await supabase
    .from('org_units')
    .select('id, name')
    .eq('parent_id', orgUnitId)

  const teamIds = (teams ?? []).map((t) => t.id)
  const { data: teamCampaigns } = await supabase
    .from('campaigns')
    .select('id, org_unit_id, status')
    .in('org_unit_id', teamIds.length > 0 ? teamIds : ['__none__'])

  const teamCampaignMap = new Map<string, string[]>()
  const teamCampaignCounts = new Map<string, number>()
  for (const c of teamCampaigns ?? []) {
    if (!c.org_unit_id) continue
    const ids = teamCampaignMap.get(c.org_unit_id) ?? []
    ids.push(c.id)
    teamCampaignMap.set(c.org_unit_id, ids)
    teamCampaignCounts.set(c.org_unit_id, (teamCampaignCounts.get(c.org_unit_id) ?? 0) + 1)
  }

  const allTeamCampaignIds = (teamCampaigns ?? []).map((c) => c.id)
  const { data: teamSnapshots } = await supabase
    .from('report_snapshots')
    .select('campaign_id, spend, sales')
    .in('campaign_id', allTeamCampaignIds.length > 0 ? allTeamCampaignIds : ['__none__'])
    .eq('report_level', 'campaign')
    .gte('report_date', start)

  const campaignToTeam = new Map<string, string>()
  for (const [teamId, cIds] of teamCampaignMap) {
    for (const cId of cIds) campaignToTeam.set(cId, teamId)
  }

  const teamSpend = new Map<string, number>()
  const teamSales = new Map<string, number>()
  for (const s of teamSnapshots ?? []) {
    const teamId = campaignToTeam.get(s.campaign_id)
    if (!teamId) continue
    teamSpend.set(teamId, (teamSpend.get(teamId) ?? 0) + (s.spend ?? 0))
    teamSales.set(teamId, (teamSales.get(teamId) ?? 0) + (s.sales ?? 0))
  }

  // Compute previous-month ACoS by team for delta_acos (shared helper)
  const prevAcosByTeam = await computePrevAcosByTeam(supabase, campaignToTeam)

  const teamPerformance: TeamPerformanceItem[] = (teams ?? []).map((t) => {
    const spend = teamSpend.get(t.id) ?? 0
    const sales = teamSales.get(t.id) ?? 0
    const acos = sales > 0 ? (spend / sales) * 100 : 0
    const prevAcos = prevAcosByTeam.get(t.id) ?? 0
    return {
      org_unit_id: t.id,
      team_name: t.name,
      spend,
      acos,
      delta_acos: prevAcos > 0 ? acos - prevAcos : 0,
      campaigns_count: teamCampaignCounts.get(t.id) ?? 0,
    }
  })

  const { count: pendingActionsTotal } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .in('brand_market_id', bmFilter)
    .eq('is_resolved', false)

  const { data: alerts } = await supabase
    .from('alerts')
    .select('id, alert_type, severity, title, campaign_id')
    .in('brand_market_id', bmFilter)
    .eq('is_resolved', false)
    .order('severity', { ascending: true })
    .limit(20)

  const alertCampaignIds = (alerts ?? []).map((a) => a.campaign_id).filter(Boolean)
  const { data: alertCampaigns } = await supabase
    .from('campaigns')
    .select('id, name')
    .in('id', alertCampaignIds.length > 0 ? alertCampaignIds : ['__none__'])

  const campaignNameMap = new Map((alertCampaigns ?? []).map((c) => [c.id, c.name]))

  const pendingActions: PendingActionItem[] = (alerts ?? []).map((a) => ({
    id: a.id,
    type: a.alert_type,
    severity: a.severity as 'critical' | 'warning' | 'info',
    title: a.title,
    campaign_name: campaignNameMap.get(a.campaign_id) ?? 'Unknown',
  }))

  return {
    budget_pacing: budgetPacing,
    market_performance: marketPerformance,
    autopilot_impact: autopilotImpact,
    team_performance: teamPerformance,
    pending_actions: pendingActions,
    pending_actions_total: pendingActionsTotal ?? 0,
  }
}

export { getDirectorDashboard }
