// AD Optimizer — AutoPilot Hourly Cron (FR-01)
// Design Ref: §5 — Schedule: 0 * * * * (매 시간)
// Plan SC: 모든 AutoPilot 캠페인 주기적 평가

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AutoPilotContext, MetricsSnapshot } from '../engine/types'
import { runAutoPilot } from '../engine/autopilot/orchestrator'

type CronResult = {
  campaigns_processed: number
  total_actions: number
  total_blocked: number
  errors: string[]
}

/** Fetch all active autopilot campaigns for a profile. */
async function fetchAutoPilotCampaigns(
  profileId: string,
  db: SupabaseClient,
): Promise<AutoPilotContext[]> {
  const { data } = await db
    .from('campaigns')
    .select('id, marketplace_profile_id, goal_mode, target_acos, weekly_budget, max_bid_cap, learning_day, confidence_score, autopilot_started_at')
    .eq('marketplace_profile_id', profileId)
    .eq('mode', 'autopilot')
    .eq('status', 'active')

  if (!data?.length) return []

  return data.map(c => ({
    campaign_id: c.id as string,
    profile_id: profileId,
    goal_mode: (c.goal_mode as AutoPilotContext['goal_mode']) ?? 'growth',
    target_acos: (c.target_acos as number) ?? 25,
    weekly_budget: (c.weekly_budget as number) ?? 1000,
    max_bid_cap: c.max_bid_cap as number | null,
    learning_day: (c.learning_day as number) ?? 0,
    confidence_score: (c.confidence_score as number) ?? 0,
    autopilot_started_at: (c.autopilot_started_at as string) ?? new Date().toISOString(),
  }))
}

/** Fetch 7-day metrics snapshot for a campaign. */
async function fetchMetricsSnapshot(
  campaignId: string,
  db: SupabaseClient,
): Promise<MetricsSnapshot> {
  const { data } = await db
    .from('report_snapshots')
    .select('acos, spend, sales, impressions, clicks, orders')
    .eq('campaign_id', campaignId)
    .eq('report_level', 'campaign')
    .gte('report_date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))

  const rows = data ?? []
  type Row = Record<string, unknown>
  const sum = (key: string) => rows.reduce((acc, r) => acc + (((r as Row)[key] as number) ?? 0), 0)

  const spend7d = sum('spend')
  const sales7d = sum('sales')

  return {
    acos_7d: sales7d > 0 ? (spend7d / sales7d) * 100 : null,
    acos_14d: null,
    spend_7d: spend7d,
    sales_7d: sales7d,
    impressions_7d: sum('impressions'),
    clicks_7d: sum('clicks'),
    orders_7d: sum('orders'),
  }
}

/** Main cron entry point: run autopilot for all campaigns in a profile. */
async function runAutoPilotCron(
  profileId: string,
  db: SupabaseClient,
  executeBatch: (actions: import('@/modules/ads/api/services/write-back-service').WriteBackAction[]) => Promise<import('@/modules/ads/api/services/write-back-service').WriteBackResult[]>,
): Promise<CronResult> {
  const result: CronResult = { campaigns_processed: 0, total_actions: 0, total_blocked: 0, errors: [] }

  const campaigns = await fetchAutoPilotCampaigns(profileId, db)
  if (!campaigns.length) return result

  for (const campaign of campaigns) {
    try {
      const metrics = await fetchMetricsSnapshot(campaign.campaign_id, db)
      const output = await runAutoPilot(campaign, metrics, { db, executeBatch })

      result.campaigns_processed += 1
      result.total_actions += output.total_actions
      result.total_blocked += output.total_blocked
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      result.errors.push(`Campaign ${campaign.campaign_id}: ${msg}`)
    }
  }

  return result
}

export { runAutoPilotCron, fetchAutoPilotCampaigns, fetchMetricsSnapshot }
export type { CronResult }
