// AD Optimizer — Dashboard Server Queries
// Design Ref: §4.2 CEO/Director dashboard endpoints

import { createAdminClient } from '@/lib/supabase/admin'
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
  const supabase = createAdminClient()
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
    .from('ads.report_snapshots')
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
    .from('ads.alerts')
    .select('id', { count: 'exact', head: true })
    .in('brand_market_id', bmIds.length > 0 ? bmIds : ['__none__'])
    .eq('is_resolved', false)

  // 5. AI Status — based on recent automation failures
  const { data: recentLogs } = await supabase
    .from('ads.automation_logs')
    .select('guardrail_blocked, api_success')
    .gte('executed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(100)

  const failCount = (recentLogs ?? []).filter((l) => l.guardrail_blocked || l.api_success === false).length
  const totalCount = (recentLogs ?? []).length
  const aiStatus = totalCount === 0 ? 'healthy' as const
    : failCount / totalCount > 0.3 ? 'error' as const
    : failCount > 0 ? 'warning' as const
    : 'healthy' as const

  // 6. ACoS Heatmap
  const acosHeatmap: AcosHeatmapCell[] = brands.flatMap((b) =>
    b.markets.map((m) => ({
      brand: b.brand_name,
      market: m.market,
      acos: m.acos,
      delta: 0, // TODO: compare with previous month
    })),
  )

  // 7. ROAS Trend 30d (placeholder structure)
  const roasTrend30d: RoasTrendPoint[] = []
  // TODO: populate from daily report_snapshots grouped by date and brand

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
  const supabase = createAdminClient()
  const { start, dayOfMonth } = getMonthRange()
  const bmFilter = brandMarketIds.length > 0 ? brandMarketIds : ['__none__']

  // 1. Budget Pacing
  const { data: budgets } = await supabase
    .from('ads.budgets')
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
    .from('ads.report_snapshots')
    .select('brand_market_id, spend')
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
      .reduce((sum, s) => sum + (s.spend ?? 0), 0) // placeholder — need sales
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
    .from('ads.automation_logs')
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

  const teamPerformance: TeamPerformanceItem[] = (teams ?? []).map((t) => ({
    org_unit_id: t.id,
    team_name: t.name,
    spend: 0,
    acos: 0,
    delta_acos: 0,
    campaigns_count: 0,
  }))
  // TODO: aggregate per-team metrics from campaigns + report_snapshots

  // 5. Pending Actions (unresolved alerts)
  const { data: alerts } = await supabase
    .from('ads.alerts')
    .select('id, alert_type, severity, title, campaign_id')
    .in('brand_market_id', bmFilter)
    .eq('is_resolved', false)
    .order('severity', { ascending: true })
    .limit(20)

  // Get campaign names for alerts
  const alertCampaignIds = (alerts ?? []).map((a) => a.campaign_id).filter(Boolean)
  const { data: alertCampaigns } = await supabase
    .from('ads.campaigns')
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
