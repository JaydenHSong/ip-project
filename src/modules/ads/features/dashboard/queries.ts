// AD Optimizer — Dashboard Server Queries
// Design Ref: §4.2 CEO/Director dashboard endpoints

import { createAdsAdminClient } from '@/lib/supabase/admin'
import type {
  CeoDashboardData,
  DirectorDashboardData,
  AcosHeatmapCell,
  BrandSummary,
  RoasTrendPoint,
  BudgetPacingItem,
  TeamPerformanceItem,
  PendingActionItem,
} from './types'

// ─── Helper: current month range ───

const getMonthRange = () => {
  const now = new Date()
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]
  return { start, today, dayOfMonth: now.getDate() }
}

// ─── S01: CEO Dashboard ───

const getCeoDashboard = async (orgUnitId: string): Promise<CeoDashboardData> => {
  const supabase = createAdsAdminClient()
  const { start } = getMonthRange()

  // 1. Get all brand_markets for this org
  const { data: brandMarkets } = await supabase
    .from('brand_markets')
    .select('id, brand_name, marketplace')
    .eq('org_unit_id', orgUnitId)

  const bms = brandMarkets ?? []

  // 2. Get MTD report snapshots per brand_market
  const bmIds = bms.map((bm) => bm.id)
  const { data: snapshots } = await supabase
    .from('report_snapshots')
    .select('brand_market_id, spend, sales, orders, acos, roas')
    .in('brand_market_id', bmIds.length > 0 ? bmIds : ['__none__'])
    .eq('report_level', 'campaign')
    .gte('report_date', start)

  // 3. Aggregate by brand
  const brandMap = new Map<string, BrandSummary>()
  for (const bm of bms) {
    const brandName = bm.brand_name ?? 'Unknown'
    if (!brandMap.has(brandName)) {
      brandMap.set(brandName, { brand_id: bm.id, brand_name: brandName, markets: [] })
    }

    const marketSnapshots = (snapshots ?? []).filter((s) => s.brand_market_id === bm.id)
    const spend = marketSnapshots.reduce((sum, s) => sum + (s.spend ?? 0), 0)
    const sales = marketSnapshots.reduce((sum, s) => sum + (s.sales ?? 0), 0)
    const orders = marketSnapshots.reduce((sum, s) => sum + (s.orders ?? 0), 0)

    brandMap.get(brandName)!.markets.push({
      market: bm.marketplace ?? 'US',
      spend_mtd: spend,
      sales_mtd: sales,
      acos: sales > 0 ? (spend / sales) * 100 : 0,
      tacos: 0, // TODO: requires total sales (organic + ad) from Orders API
      roas: spend > 0 ? sales / spend : 0,
      roas_trend: [], // TODO: populate from daily snapshots
      orders_mtd: orders,
    })
  }

  const brands = Array.from(brandMap.values())

  // 4. Alerts count
  const { count: alertsCount } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .in('brand_market_id', bmIds.length > 0 ? bmIds : ['__none__'])
    .eq('is_resolved', false)

  // 5. AI Status — based on recent automation failures
  const { data: recentLogs } = await supabase
    .from('automation_logs')
    .select('guardrail_blocked, api_success')
    .gte('executed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(100)

  const failCount = (recentLogs ?? []).filter((l) => l.guardrail_blocked || l.api_success === false).length
  const totalCount = (recentLogs ?? []).length
  const aiStatus = totalCount === 0 ? 'healthy' as const
    : failCount / totalCount > 0.3 ? 'error' as const
    : failCount > 0 ? 'warning' as const
    : 'healthy' as const

  // 6. ACoS Heatmap with delta (vs previous month)
  const prevMonthStart = new Date()
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1, 1)
  const prevMonthEnd = new Date()
  prevMonthEnd.setDate(0) // last day of previous month
  const prevStart = prevMonthStart.toISOString().split('T')[0]
  const prevEnd = prevMonthEnd.toISOString().split('T')[0]

  const { data: prevSnapshots } = await supabase
    .from('report_snapshots')
    .select('brand_market_id, spend, sales')
    .in('brand_market_id', bmIds.length > 0 ? bmIds : ['__none__'])
    .eq('report_level', 'campaign')
    .gte('report_date', prevStart)
    .lte('report_date', prevEnd)

  const prevAcosByBm = new Map<string, number>()
  const prevSpendByBm = new Map<string, number>()
  const prevSalesByBm = new Map<string, number>()
  for (const s of prevSnapshots ?? []) {
    prevSpendByBm.set(s.brand_market_id, (prevSpendByBm.get(s.brand_market_id) ?? 0) + (s.spend ?? 0))
    prevSalesByBm.set(s.brand_market_id, (prevSalesByBm.get(s.brand_market_id) ?? 0) + (s.sales ?? 0))
  }
  for (const [bmId, prevSpend] of prevSpendByBm) {
    const prevSales = prevSalesByBm.get(bmId) ?? 0
    prevAcosByBm.set(bmId, prevSales > 0 ? (prevSpend / prevSales) * 100 : 0)
  }

  const acosHeatmap: AcosHeatmapCell[] = bms.map((bm) => {
    const bmId = bm.id
    const curSnapshots = (snapshots ?? []).filter((s) => s.brand_market_id === bmId)
    const curSpend = curSnapshots.reduce((sum, s) => sum + (s.spend ?? 0), 0)
    const curSales = curSnapshots.reduce((sum, s) => sum + (s.sales ?? 0), 0)
    const curAcos = curSales > 0 ? (curSpend / curSales) * 100 : 0
    const prevAcos = prevAcosByBm.get(bmId) ?? 0
    return {
      brand: bm.brand_name ?? 'Unknown',
      market: bm.marketplace ?? 'US',
      acos: curAcos,
      delta: prevAcos > 0 ? curAcos - prevAcos : 0,
    }
  })

  // 7. ROAS Trend 30d
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  const { data: trendSnapshots } = await supabase
    .from('report_snapshots')
    .select('report_date, brand_market_id, spend, sales')
    .in('brand_market_id', bmIds.length > 0 ? bmIds : ['__none__'])
    .eq('report_level', 'campaign')
    .gte('report_date', thirtyDaysAgoStr)

  // Build brand_market_id → brand_name lookup
  const bmToBrand = new Map<string, string>()
  for (const bm of bms) {
    bmToBrand.set(bm.id, (bm.brand_name ?? 'Unknown').toLowerCase())
  }

  // Aggregate spend/sales by date and brand
  const dailyBrandMap = new Map<string, Record<string, { spend: number; sales: number }>>()
  for (const s of trendSnapshots ?? []) {
    const brandName = bmToBrand.get(s.brand_market_id) ?? 'unknown'
    const dayData = dailyBrandMap.get(s.report_date) ?? {}
    const existing = dayData[brandName] ?? { spend: 0, sales: 0 }
    existing.spend += s.spend ?? 0
    existing.sales += s.sales ?? 0
    dayData[brandName] = existing
    dailyBrandMap.set(s.report_date, dayData)
  }

  const roasTrend30d: RoasTrendPoint[] = Array.from(dailyBrandMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, byBrand]) => {
      const roas = (name: string) => {
        const d = byBrand[name]
        return d && d.spend > 0 ? d.sales / d.spend : 0
      }
      return { date, spigen: roas('spigen'), legato: roas('legato'), cyrill: roas('cyrill') }
    })

  return {
    brands,
    alerts_count: alertsCount ?? 0,
    ai_status: aiStatus,
    roas_trend_30d: roasTrend30d,
    acos_heatmap: acosHeatmap,
  }
}

// ─── S02: Director Dashboard ───

const getDirectorDashboard = async (orgUnitId: string, brandMarketIds: string[]): Promise<DirectorDashboardData> => {
  const supabase = createAdsAdminClient()
  const { start, dayOfMonth } = getMonthRange()
  const bmFilter = brandMarketIds.length > 0 ? brandMarketIds : ['__none__']

  // 1. Budget Pacing
  const { data: budgets } = await supabase
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

  const budgetPacing: BudgetPacingItem[] = (budgets ?? []).map((b) => {
    const bm = bmLookup.get(b.brand_market_id)
    const actual = spendByBm.get(b.brand_market_id) ?? 0
    const expectedPct = (dayOfMonth / 30) * 100
    const pacingPct = b.amount > 0 ? (actual / b.amount) * 100 : 0
    return {
      brand_market_id: b.brand_market_id,
      brand: bm?.brand_name ?? 'Unknown',
      market: bm?.marketplace ?? 'US',
      channel: b.channel,
      planned: b.amount,
      actual,
      pacing_pct: pacingPct,
      on_track: Math.abs(pacingPct - expectedPct) < 15,
    }
  })

  // 2. Market Performance (ACoS heatmap)
  const marketPerformance: AcosHeatmapCell[] = []
  for (const [bmId, spend] of spendByBm) {
    const bm = bmLookup.get(bmId)
    const sales = (spendSnapshots ?? [])
      .filter((s) => s.brand_market_id === bmId)
      .reduce((sum, s) => sum + (s.sales ?? 0), 0)
    const acos = sales > 0 ? (spend / sales) * 100 : 0
    marketPerformance.push({
      brand: bm?.brand_name ?? 'Unknown',
      market: bm?.marketplace ?? 'US',
      acos,
      delta: 0,
    })
  }

  // 3. Auto Pilot Impact
  const { data: apLogs } = await supabase
    .from('automation_logs')
    .select('id, action_type')
    .eq('source', 'algorithm')
    .gte('executed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const autopilotImpact = {
    acos_change: 0, // TODO: calculate from before/after snapshots
    savings: 0,
    actions_7d: (apLogs ?? []).length,
  }

  // 4. Team Performance
  const { data: teams } = await supabase
    .from('org_units')
    .select('id, name')
    .eq('parent_id', orgUnitId)

  // Get campaigns grouped by org_unit for team metrics
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

  const teamPerformance: TeamPerformanceItem[] = (teams ?? []).map((t) => {
    const spend = teamSpend.get(t.id) ?? 0
    const sales = teamSales.get(t.id) ?? 0
    return {
      org_unit_id: t.id,
      team_name: t.name,
      spend,
      acos: sales > 0 ? (spend / sales) * 100 : 0,
      delta_acos: 0, // requires previous period comparison
      campaigns_count: teamCampaignCounts.get(t.id) ?? 0,
    }
  })

  // 5. Pending Actions (unresolved alerts)
  const { data: alerts } = await supabase
    .from('alerts')
    .select('id, alert_type, severity, title, campaign_id')
    .in('brand_market_id', bmFilter)
    .eq('is_resolved', false)
    .order('severity', { ascending: true })
    .limit(20)

  // Get campaign names for alerts
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
  }
}

export { getCeoDashboard, getDirectorDashboard }
