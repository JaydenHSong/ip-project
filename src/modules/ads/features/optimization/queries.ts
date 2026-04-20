// AD Optimizer — Optimization Server Queries
// Design Ref: §4.2 Recommendations, Rules, Dayparting endpoints

import { createAdsAdminClient } from '@/lib/supabase/admin'
import { adsTable } from '@/lib/supabase/table-names'
import type { RecommendationItem, RecommendationSummary, BudgetPacingDetail, KeywordStatsStrip, DaypartingGroup, HeatmapCell } from './types'

// ─── Recommendations ───

const getRecommendations = async (params: {
  brand_market_id: string
  campaign_id?: string
  type?: string
  status?: string
  limit?: number
}) => {
  const supabase = createAdsAdminClient()

  let qb = supabase
    .from('keyword_recommendations')
    .select('*')
    .eq('brand_market_id', params.brand_market_id)

  if (params.campaign_id) qb = qb.eq('campaign_id', params.campaign_id)
  if (params.type) qb = qb.eq('recommendation_type', params.type)
  if (params.status) qb = qb.eq('status', params.status)

  qb = qb.order('estimated_impact', { ascending: false })
  if (params.limit) qb = qb.limit(params.limit)

  const { data, error } = await qb
  if (error) throw error

  // Resolve campaign names
  const campaignIds = [...new Set((data ?? []).map((r) => r.campaign_id))]
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name')
    .in('id', campaignIds.length > 0 ? campaignIds : ['__none__'])
  const campMap = new Map((campaigns ?? []).map((c) => [c.id, c.name]))

  const items: RecommendationItem[] = (data ?? []).map((r) => ({
    id: r.id,
    campaign_id: r.campaign_id,
    campaign_name: campMap.get(r.campaign_id) ?? 'Unknown',
    recommendation_type: r.recommendation_type,
    keyword_text: r.keyword_text,
    current_bid: r.current_bid,
    suggested_bid: r.suggested_bid,
    estimated_impact: r.estimated_impact,
    impact_level: r.impact_level ?? 'medium',
    reason: r.reason,
    metrics: r.metrics as RecommendationItem['metrics'],
    source: r.source,
    status: r.status,
    created_at: r.created_at,
  }))

  // Summary
  const pending = items.filter((i) => i.status === 'pending')
  const summary: RecommendationSummary = {
    total_pending: pending.length,
    est_acos_impact: pending.reduce((s, i) => s + (i.estimated_impact ?? 0), 0),
    est_revenue_impact: 0,
    est_waste_reduction: pending
      .filter((i) => i.recommendation_type === 'negate')
      .reduce((s, i) => s + (i.metrics?.spend ?? 0), 0),
  }

  return { data: items, summary }
}

// ─── Approve Recommendation ───

const approveRecommendation = async (id: string, adjustedBid?: number) => {
  const supabase = createAdsAdminClient()

  const { data: rec } = await supabase
    .from('keyword_recommendations')
    .select('*')
    .eq('id', id)
    .single()

  if (!rec) throw new Error('Recommendation not found')

  const bid = adjustedBid ?? rec.suggested_bid

  // Update recommendation status
  await supabase
    .from('keyword_recommendations')
    .update({ status: 'approved' })
    .eq('id', id)

  // Log automation action
  const { data: log } = await supabase
    .from(adsTable('automation_log'))
    .insert({
      campaign_id: rec.campaign_id,
      keyword_id: rec.keyword_id,
      batch_id: `approve-${id}`,
      action_type: rec.recommendation_type === 'negate' ? 'keyword_negate'
        : rec.recommendation_type === 'promote' ? 'keyword_promote'
        : 'bid_adjust',
      action_detail: { recommendation_id: id, old_bid: rec.current_bid, new_bid: bid },
      reason: rec.reason,
      source: 'manual',
      guardrail_blocked: false,
      is_rolled_back: false,
    })
    .select('id')
    .single()

  return {
    success: true,
    action_taken: `${rec.recommendation_type}: ${rec.keyword_text} ${rec.current_bid ? `$${rec.current_bid} → $${bid}` : ''}`,
    automation_log_id: log?.id ?? '',
  }
}

// ─── Budget Pacing Detail ───

const getBudgetPacingDetail = async (campaignId: string): Promise<BudgetPacingDetail> => {
  const supabase = createAdsAdminClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('daily_budget, weekly_budget, mode')
    .eq('id', campaignId)
    .single()

  const dailyBudget = campaign?.daily_budget ?? (campaign?.weekly_budget ? campaign.weekly_budget / 7 : 0)

  // Get today's hourly snapshots (simplified — real impl would use hourly report data)
  const today = new Date().toISOString().split('T')[0]
  const { data: todaySnaps } = await supabase
    .from('report_snapshots')
    .select('spend')
    .eq('campaign_id', campaignId)
    .eq('report_date', today)
    .eq('report_level', 'campaign')

  const spendToday = (todaySnaps ?? []).reduce((s, r) => s + (r.spend ?? 0), 0)

  // Generate hourly spend data (placeholder — real data comes from Marketing Stream)
  const currentHour = new Date().getHours()
  const hourlySpend = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    actual: h <= currentHour ? (spendToday / Math.max(currentHour, 1)) : 0,
    predicted: dailyBudget / 24,
  }))

  return {
    daily_budget: dailyBudget,
    spend_today: spendToday,
    remaining: Math.max(0, dailyBudget - spendToday),
    pacing_pct: dailyBudget > 0 ? (spendToday / dailyBudget) * 100 : 0,
    distribution: campaign?.mode === 'autopilot' ? 'weighted' : 'even',
    hourly_spend: hourlySpend,
  }
}

// ─── Keyword Stats ───

const getKeywordStats = async (campaignId: string): Promise<KeywordStatsStrip> => {
  const supabase = createAdsAdminClient()

  const { data: keywords } = await supabase
    .from('keywords')
    .select('match_type')
    .eq('campaign_id', campaignId)
    .eq('state', 'enabled')

  const kws = keywords ?? []
  const { count: pendingCount } = await supabase
    .from('keyword_recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')

  return {
    auto_count: kws.filter((k) => k.match_type === 'broad').length,
    broad_count: kws.filter((k) => k.match_type === 'broad').length,
    phrase_count: kws.filter((k) => k.match_type === 'phrase').length,
    exact_count: kws.filter((k) => k.match_type === 'exact').length,
    pending_actions: pendingCount ?? 0,
  }
}

// ─── Dayparting Groups ───

const getDaypartingGroups = async (brandMarketId: string): Promise<DaypartingGroup[]> => {
  const supabase = createAdsAdminClient()

  const { data: schedules } = await supabase
    .from('dayparting_schedules')
    .select('id, group_name, campaign_ids, is_enabled, schedule, ai_recommended_schedule')
    .eq('brand_market_id', brandMarketId)

  return (schedules ?? []).map((s) => {
    const schedule = s.schedule as Record<string, unknown>
    const aiSchedule = s.ai_recommended_schedule as Record<string, unknown> | null

    // Parse schedule into heatmap cells
    const parseSchedule = (sched: Record<string, unknown> | null): HeatmapCell[] => {
      if (!sched) return []
      const cells: HeatmapCell[] = []
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const key = `${day}_${hour}`
          const weight = typeof sched[key] === 'number' ? (sched[key] as number) : 1
          cells.push({ day, hour, weight, is_active: weight > 0 })
        }
      }
      return cells
    }

    return {
      id: s.id,
      group_name: s.group_name,
      campaign_count: Array.isArray(s.campaign_ids) ? s.campaign_ids.length : 0,
      is_enabled: s.is_enabled,
      heatmap: parseSchedule(schedule),
      ai_recommended: aiSchedule ? parseSchedule(aiSchedule) : null,
    }
  })
}

export {
  getRecommendations,
  approveRecommendation,
  getBudgetPacingDetail,
  getKeywordStats,
  getDaypartingGroups,
}
