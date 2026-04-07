// AD Optimizer — Spend Intelligence Server Queries
// Design Ref: §4.2 GET /api/ads/reports/spend-intelligence

import { createAdsAdminClient } from '@/lib/supabase/admin'
import type {
  SpendLeakSummary,
  SpendLeakItem,
  TopWasterItem,
  TrendAlertItem,
  AiDiagnosisItem,
  QuickFixAction,
} from './types'

// ─── Main Query ───

const getSpendIntelligence = async (brandMarketId: string) => {
  const supabase = createAdsAdminClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // 1. Spend Diagnostics
  const { data: diagnostics } = await supabase
    .from('spend_diagnostics')
    .select('campaign_id, diagnosis_type, root_causes, utilization_pct, analyzed_at')
    .eq('brand_market_id', brandMarketId)
    .order('analyzed_at', { ascending: false })
    .limit(50)

  // 2. Campaign names + 7d metrics
  const campaignIds = [...new Set((diagnostics ?? []).map((d) => d.campaign_id))]
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, marketing_code')
    .in('id', campaignIds.length > 0 ? campaignIds : ['__none__'])

  const campaignMap = new Map((campaigns ?? []).map((c) => [c.id, c]))

  const { data: snapshots } = await supabase
    .from('report_snapshots')
    .select('campaign_id, spend, sales, acos')
    .in('campaign_id', campaignIds.length > 0 ? campaignIds : ['__none__'])
    .eq('report_level', 'campaign')
    .gte('report_date', sevenDaysAgo)

  // Aggregate 7d per campaign
  const spendMap = new Map<string, { spend: number; sales: number }>()
  for (const s of snapshots ?? []) {
    const prev = spendMap.get(s.campaign_id) ?? { spend: 0, sales: 0 }
    spendMap.set(s.campaign_id, {
      spend: prev.spend + (s.spend ?? 0),
      sales: prev.sales + (s.sales ?? 0),
    })
  }

  // Build spend leak items
  const leakItems: SpendLeakItem[] = (diagnostics ?? []).map((d) => {
    const camp = campaignMap.get(d.campaign_id)
    const metrics = spendMap.get(d.campaign_id) ?? { spend: 0, sales: 0 }
    const waste = d.diagnosis_type === 'waste' || d.diagnosis_type === 'overspend'
      ? metrics.spend * 0.3 // estimated 30% waste
      : 0

    const causes = d.root_causes as Record<string, unknown>
    const causeList = Array.isArray(causes) ? causes.map(String) : Object.keys(causes ?? {})

    return {
      campaign_id: d.campaign_id,
      campaign_name: camp?.name ?? 'Unknown',
      diagnosis_type: d.diagnosis_type as SpendLeakItem['diagnosis_type'],
      utilization_pct: d.utilization_pct,
      root_causes: causeList,
      spend_7d: metrics.spend,
      waste_amount: waste,
    }
  })

  const totalWaste = leakItems.reduce((s, i) => s + i.waste_amount, 0)

  const summary: SpendLeakSummary = {
    total_waste: totalWaste,
    total_campaigns_affected: leakItems.length,
    top_issue: leakItems.length > 0 ? leakItems[0].diagnosis_type : 'none',
    items: leakItems,
  }

  // 3. Top Wasters (sorted by waste_score)
  const topWasters: TopWasterItem[] = campaignIds
    .map((id) => {
      const camp = campaignMap.get(id)
      const metrics = spendMap.get(id) ?? { spend: 0, sales: 0 }
      const acos = metrics.sales > 0 ? (metrics.spend / metrics.sales) * 100 : 100
      const wasteScore = Math.min(100, Math.max(0, acos - 25) * 2) // crude scoring

      return {
        campaign_id: id,
        campaign_name: camp?.name ?? 'Unknown',
        marketing_code: camp?.marketing_code ?? '',
        spend_7d: metrics.spend,
        sales_7d: metrics.sales,
        acos,
        waste_score: wasteScore,
        primary_cause: acos > 50 ? 'High ACoS' : acos > 30 ? 'Above target' : 'Low efficiency',
      }
    })
    .sort((a, b) => b.waste_score - a.waste_score)
    .slice(0, 10)

  // 4. Trend Alerts
  const { data: trends } = await supabase
    .from('spend_trends')
    .select('id, campaign_id, metric, value, prev_week_value, trend_direction, consecutive_weeks_worsening')
    .eq('brand_market_id', brandMarketId)
    .gt('consecutive_weeks_worsening', 1)
    .order('consecutive_weeks_worsening', { ascending: false })
    .limit(20)

  const trendAlerts: TrendAlertItem[] = (trends ?? []).map((t) => {
    const camp = campaignMap.get(t.campaign_id ?? '')
    return {
      id: t.id,
      campaign_id: t.campaign_id,
      campaign_name: camp?.name ?? null,
      metric: t.metric,
      direction: (t.trend_direction ?? 'stable') as TrendAlertItem['direction'],
      current_value: t.value,
      previous_value: t.prev_week_value ?? 0,
      consecutive_weeks: t.consecutive_weeks_worsening,
      severity: t.consecutive_weeks_worsening >= 4 ? 'critical' : t.consecutive_weeks_worsening >= 2 ? 'warning' : 'info',
    }
  })

  // 5. AI Diagnosis (from diagnostics with root causes)
  const aiDiagnosis: AiDiagnosisItem[] = leakItems.slice(0, 5).map((item) => ({
    campaign_id: item.campaign_id,
    campaign_name: item.campaign_name,
    diagnosis: `${item.diagnosis_type}: ${item.root_causes.join(', ') || 'Unknown cause'}`,
    confidence: item.utilization_pct != null ? Math.min(95, item.utilization_pct + 20) : 70,
    suggested_actions: item.root_causes.length > 0
      ? item.root_causes.map((c) => `Address: ${c}`)
      : ['Review campaign performance'],
    estimated_savings: item.waste_amount,
  }))

  // 6. Quick Fixes
  const quickFixes: QuickFixAction[] = topWasters.slice(0, 5).map((w) => ({
    id: w.campaign_id,
    campaign_id: w.campaign_id,
    campaign_name: w.campaign_name,
    action_type: w.acos > 50 ? 'pause' : w.acos > 35 ? 'reduce_budget' : 'adjust_bids',
    description: w.acos > 50
      ? `Pause campaign (ACoS ${w.acos.toFixed(0)}% is 2x+ target)`
      : w.acos > 35
      ? `Reduce daily budget by 20% (ACoS ${w.acos.toFixed(0)}%)`
      : `Lower bid cap by 15% (ACoS ${w.acos.toFixed(0)}%)`,
    estimated_impact: w.spend_7d * 0.2,
    severity: w.waste_score > 60 ? 'high' : w.waste_score > 30 ? 'medium' : 'low',
  }))

  return {
    summary,
    top_wasters: topWasters,
    trend_alerts: trendAlerts,
    ai_diagnosis: aiDiagnosis,
    quick_fixes: quickFixes,
  }
}

export { getSpendIntelligence }
