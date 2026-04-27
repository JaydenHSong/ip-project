// S01 — CEO dashboard aggregation (server)
// Design Ref: §4.2
// Design Ref: ft-runtime-hardening §3.6 — cross-schema 분리 (brand_markets = public, report_snapshots = ads)

import type { AdsAdminContext } from '@/lib/supabase/ads-context'
import type { CeoDashboardData, AcosHeatmapCell, BrandSummary, RoasTrendPoint } from '../types'
import { getMonthRange } from './month-range'
import { computePrevAcosByBrandMarket } from './compute-prev-period'

const getCeoDashboard = async (
  ctx: AdsAdminContext,
  orgUnitId: string,
): Promise<CeoDashboardData> => {
  const { start } = getMonthRange()

  // brand_markets lives in PUBLIC schema
  const { data: brandMarkets } = await ctx.public
    .from(ctx.publicTable('brand_markets'))
    .select('id, brand_name, marketplace')
    .eq('org_unit_id', orgUnitId)

  const bms = brandMarkets ?? []
  const bmIds = bms.map((bm) => bm.id)
  const { data: snapshots } = await ctx.ads
    .from(ctx.adsTable('report_snapshots'))
    .select('brand_market_id, spend, sales, orders, acos, roas')
    .in('brand_market_id', bmIds.length > 0 ? bmIds : ['__none__'])
    .eq('report_level', 'campaign')
    .gte('report_date', start)

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
      // tacos requires account-level total sales (Sales & Traffic report).
      // Until report_level='account' snapshots are ingested, return null so UI can show "—".
      tacos: null,
      roas: spend > 0 ? sales / spend : 0,
      roas_trend: [],
      orders_mtd: orders,
    })
  }

  const brands = Array.from(brandMap.values())

  const { count: alertsCount } = await ctx.ads
    .from(ctx.adsTable('alerts'))
    .select('id', { count: 'exact', head: true })
    .in('brand_market_id', bmIds.length > 0 ? bmIds : ['__none__'])
    .eq('is_resolved', false)

  // Bug fix: table is ads.automation_log (singular), not automation_logs
  const { data: recentLogs } = await ctx.ads
    .from(ctx.adsTable('automation_log'))
    .select('guardrail_blocked, api_success')
    .gte('executed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(100)

  const failCount = (recentLogs ?? []).filter((l) => l.guardrail_blocked || l.api_success === false).length
  const totalCount = (recentLogs ?? []).length
  const aiStatus = totalCount === 0 ? 'healthy' as const
    : failCount / totalCount > 0.3 ? 'error' as const
    : failCount > 0 ? 'warning' as const
    : 'healthy' as const

  const prevAcosByBm = await computePrevAcosByBrandMarket(ctx, bmIds)

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

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  const { data: trendSnapshots } = await ctx.ads
    .from(ctx.adsTable('report_snapshots'))
    .select('report_date, brand_market_id, spend, sales')
    .in('brand_market_id', bmIds.length > 0 ? bmIds : ['__none__'])
    .eq('report_level', 'campaign')
    .gte('report_date', thirtyDaysAgoStr)

  const bmToBrand = new Map<string, string>()
  for (const bm of bms) {
    bmToBrand.set(bm.id, (bm.brand_name ?? 'Unknown').toLowerCase())
  }

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

export { getCeoDashboard }
