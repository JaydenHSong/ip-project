// AD Optimizer — Autopilot Server Queries
// Design Ref: §4.2 /api/ads/autopilot

import { createAdsAdminClient } from '@/lib/supabase/admin'
import type { AutopilotKpi, AutopilotCampaignItem, ActivityLogEntry } from './types'

// ─── S08: List + KPI ───

const getAutopilotList = async (brandMarketId: string) => {
  const supabase = createAdsAdminClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, marketing_code, status, goal_mode, confidence_score, target_acos, weekly_budget')
    .eq('brand_market_id', brandMarketId)
    .eq('mode', 'autopilot')
    .order('created_at', { ascending: false })

  const items: AutopilotCampaignItem[] = (campaigns ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    marketing_code: c.marketing_code,
    status: c.status,
    goal_mode: c.goal_mode ?? 'growth',
    confidence_score: c.confidence_score,
    target_acos: c.target_acos,
    weekly_budget: c.weekly_budget,
    spend_7d: 0, // TODO: aggregate from report_snapshots
    acos_7d: null,
    last_action: null,
    last_action_at: null,
  }))

  // Get last action for each campaign
  for (const item of items) {
    const { data: lastLog } = await supabase
      .from('automation_log')
      .select('action_type, executed_at')
      .eq('campaign_id', item.id)
      .order('executed_at', { ascending: false })
      .limit(1)
      .single()

    if (lastLog) {
      item.last_action = lastLog.action_type
      item.last_action_at = lastLog.executed_at
    }
  }

  // KPI
  const active = items.filter((c) => c.status === 'active')
  const learning = items.filter((c) => c.status === 'learning')
  const paused = items.filter((c) => c.status === 'paused')

  const { count: actionsCount } = await supabase
    .from('automation_log')
    .select('id', { count: 'exact', head: true })
    .in('campaign_id', items.map((i) => i.id).length > 0 ? items.map((i) => i.id) : ['__none__'])
    .gte('executed_at', sevenDaysAgo)

  const kpi: AutopilotKpi = {
    active_count: active.length,
    learning_count: learning.length,
    paused_count: paused.length,
    total_weekly_budget: items.reduce((s, c) => s + (c.weekly_budget ?? 0), 0),
    total_spend_7d: items.reduce((s, c) => s + c.spend_7d, 0),
    avg_acos: null,
    ai_actions_7d: actionsCount ?? 0,
  }

  return { campaigns: items, kpi }
}

// ─── S09: Detail + Activity Log ───

const getAutopilotDetail = async (campaignId: string) => {
  const supabase = createAdsAdminClient()

  // Activity log (last 50 actions)
  const { data: logs } = await supabase
    .from('automation_log')
    .select('id, action_type, source, reason, keyword_id, action_detail, guardrail_blocked, guardrail_reason, is_rolled_back, executed_at')
    .eq('campaign_id', campaignId)
    .order('executed_at', { ascending: false })
    .limit(50)

  // Get keyword texts for logs that have keyword_id
  const kwIds = (logs ?? []).map((l) => l.keyword_id).filter(Boolean)
  const { data: keywords } = await supabase
    .from('keywords')
    .select('id, keyword_text')
    .in('id', kwIds.length > 0 ? kwIds : ['__none__'])

  const kwMap = new Map((keywords ?? []).map((k) => [k.id, k.keyword_text]))

  const activityLog: ActivityLogEntry[] = (logs ?? []).map((l) => {
    const detail = l.action_detail as Record<string, unknown> | null
    return {
      id: l.id,
      action_type: l.action_type,
      source: l.source,
      reason: l.reason,
      keyword_text: l.keyword_id ? kwMap.get(l.keyword_id) ?? null : null,
      old_value: detail?.old_bid ? String(detail.old_bid) : null,
      new_value: detail?.new_bid ? String(detail.new_bid) : null,
      guardrail_blocked: l.guardrail_blocked,
      guardrail_reason: l.guardrail_reason,
      is_rolled_back: l.is_rolled_back,
      executed_at: l.executed_at,
    }
  })

  return { activity_log: activityLog }
}

// ─── Rollback ───

const rollbackActions = async (logIds: string[], userId: string) => {
  const supabase = createAdsAdminClient()
  let rolledBack = 0
  let failed = 0

  for (const logId of logIds) {
    const { error } = await supabase
      .from('automation_log')
      .update({
        is_rolled_back: true,
        rolled_back_at: new Date().toISOString(),
        rolled_back_by: userId,
      })
      .eq('id', logId)
      .eq('is_rolled_back', false)

    if (error) failed++
    else rolledBack++
  }

  return { rolled_back_count: rolledBack, failed_count: failed }
}

export { getAutopilotList, getAutopilotDetail, rollbackActions }
