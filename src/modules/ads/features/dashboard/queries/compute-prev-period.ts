// Shared previous-period aggregation for delta computations
// Used by both CEO and Director dashboards to avoid divergence.
// Design Ref: §4.2 Heatmap delta logic (extracted from get-ceo-dashboard.ts)

import { createAdsAdminClient } from '@/lib/supabase/admin'

type AdsClient = ReturnType<typeof createAdsAdminClient>
type PrevAcosByKey = Map<string, number>

const getPrevMonthRange = () => {
  const prevMonthStart = new Date()
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1, 1)
  const prevMonthEnd = new Date()
  prevMonthEnd.setDate(0)
  return {
    start: prevMonthStart.toISOString().split('T')[0],
    end: prevMonthEnd.toISOString().split('T')[0],
  }
}

// Computes ACoS by brand_market_id for the previous calendar month
const computePrevAcosByBrandMarket = async (
  supabase: AdsClient,
  brandMarketIds: string[],
): Promise<PrevAcosByKey> => {
  const { start, end } = getPrevMonthRange()
  const filter = brandMarketIds.length > 0 ? brandMarketIds : ['__none__']

  const { data: prev } = await supabase
    .from('report_snapshots')
    .select('brand_market_id, spend, sales')
    .in('brand_market_id', filter)
    .eq('report_level', 'campaign')
    .gte('report_date', start)
    .lte('report_date', end)

  const spendByBm = new Map<string, number>()
  const salesByBm = new Map<string, number>()
  for (const s of prev ?? []) {
    spendByBm.set(s.brand_market_id, (spendByBm.get(s.brand_market_id) ?? 0) + (s.spend ?? 0))
    salesByBm.set(s.brand_market_id, (salesByBm.get(s.brand_market_id) ?? 0) + (s.sales ?? 0))
  }

  const acosByBm: PrevAcosByKey = new Map()
  for (const [bmId, spend] of spendByBm) {
    const sales = salesByBm.get(bmId) ?? 0
    acosByBm.set(bmId, sales > 0 ? (spend / sales) * 100 : 0)
  }
  return acosByBm
}

// Computes ACoS by team (org_unit_id) for the previous calendar month.
// Requires a campaignToTeam map built by the caller.
const computePrevAcosByTeam = async (
  supabase: AdsClient,
  campaignToTeam: Map<string, string>,
): Promise<PrevAcosByKey> => {
  const { start, end } = getPrevMonthRange()
  const campaignIds = Array.from(campaignToTeam.keys())
  const filter = campaignIds.length > 0 ? campaignIds : ['__none__']

  const { data: prev } = await supabase
    .from('report_snapshots')
    .select('campaign_id, spend, sales')
    .in('campaign_id', filter)
    .eq('report_level', 'campaign')
    .gte('report_date', start)
    .lte('report_date', end)

  const spendByTeam = new Map<string, number>()
  const salesByTeam = new Map<string, number>()
  for (const s of prev ?? []) {
    const teamId = campaignToTeam.get(s.campaign_id)
    if (!teamId) continue
    spendByTeam.set(teamId, (spendByTeam.get(teamId) ?? 0) + (s.spend ?? 0))
    salesByTeam.set(teamId, (salesByTeam.get(teamId) ?? 0) + (s.sales ?? 0))
  }

  const acosByTeam: PrevAcosByKey = new Map()
  for (const [teamId, spend] of spendByTeam) {
    const sales = salesByTeam.get(teamId) ?? 0
    acosByTeam.set(teamId, sales > 0 ? (spend / sales) * 100 : 0)
  }
  return acosByTeam
}

// Computes 7-day automation impact: actions count + sum of estimated savings.
// Plan SC: Director must show acos_change & savings (not 0 placeholders).
const computeAutopilotImpact = async (
  supabase: AdsClient,
  brandMarketIds: string[],
): Promise<{ acos_change: number; savings: number; actions_7d: number }> => {
  const filter = brandMarketIds.length > 0 ? brandMarketIds : ['__none__']
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgoDate = sevenDaysAgo.split('T')[0]
  const fourteenDaysAgoDate = fourteenDaysAgo.split('T')[0]

  // Note: ads.automation_log (singular) — bug fix from automation_logs (plural)
  const { data: logs } = await supabase
    .from('automation_log')
    .select('id, action_detail')
    .eq('source', 'algorithm')
    .gte('executed_at', sevenDaysAgo)

  const actionsCount = (logs ?? []).length
  // savings = sum of action_detail.estimated_savings if present (jsonb)
  let savings = 0
  for (const log of logs ?? []) {
    const detail = log.action_detail as { estimated_savings?: number } | null
    if (detail && typeof detail.estimated_savings === 'number') {
      savings += detail.estimated_savings
    }
  }

  // acos_change: compare last 7d ACoS vs prior 7d (14d ago to 7d ago)
  const { data: snaps } = await supabase
    .from('report_snapshots')
    .select('report_date, spend, sales')
    .in('brand_market_id', filter)
    .eq('report_level', 'campaign')
    .gte('report_date', fourteenDaysAgoDate)

  let curSpend = 0, curSales = 0, prevSpend = 0, prevSales = 0
  for (const s of snaps ?? []) {
    if (s.report_date >= sevenDaysAgoDate) {
      curSpend += s.spend ?? 0
      curSales += s.sales ?? 0
    } else {
      prevSpend += s.spend ?? 0
      prevSales += s.sales ?? 0
    }
  }
  const curAcos = curSales > 0 ? (curSpend / curSales) * 100 : 0
  const prevAcos = prevSales > 0 ? (prevSpend / prevSales) * 100 : 0
  const acos_change = prevAcos > 0 ? curAcos - prevAcos : 0

  return { acos_change, savings, actions_7d: actionsCount }
}

export { computePrevAcosByBrandMarket, computePrevAcosByTeam, computeAutopilotImpact }
