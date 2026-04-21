// AD Optimizer — AutoPilot Hourly Cron (FR-01)
// Design Ref: §5 — Schedule: 0 * * * * (매 시간)
// Design Ref: ft-runtime-hardening §3.4 — ctx 주입 entry point
// Plan SC: 모든 AutoPilot 캠페인 주기적 평가

import type { AdsAdminContext } from '@/lib/supabase/ads-context'

// Schema-agnostic client type for cron helpers — accepts both public and ads schemas
// Design Ref: ft-runtime-hardening §7.1 — ctx.ads/ctx.public 모두 수용
type AnyDb = AdsAdminContext['ads'] | AdsAdminContext['public']
import { createWriteBackService } from '@/modules/ads/api/factory'
import type { AutoPilotContext, MetricsSnapshot } from '../engine/types'
import { runAutoPilot } from '../engine/autopilot/orchestrator'

type CronResult = {
  campaigns_processed: number
  total_actions: number
  total_blocked: number
  errors: string[]
}

type AutoPilotCronResult = {
  profiles: Array<{ profile_id: string } & CronResult>
  message?: string
}

/** Fetch all active autopilot campaigns for a profile. */
async function fetchAutoPilotCampaigns(
  profileId: string,
  db: AnyDb,
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
  db: AnyDb,
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

/** Run autopilot for all campaigns in a single profile. */
async function runAutoPilotForProfile(
  profileId: string,
  db: AnyDb,
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

/**
 * Cron entry point: iterate over all active profiles and run autopilot.
 * Called by /api/ads/cron/autopilot-run route via createCronHandler.
 * Design Ref: ft-runtime-hardening §3.4
 */
async function runAutoPilotCron(ctx: AdsAdminContext): Promise<AutoPilotCronResult> {
  const { data: profiles, error } = await ctx.ads
    .from(ctx.adsTable('marketplace_profiles'))
    .select('id')
    .eq('is_active', true)
    .not('ads_profile_id', 'is', null)

  if (error) {
    throw new Error(`Failed to fetch marketplace profiles: ${error.message}`)
  }

  if (!profiles?.length) {
    return { profiles: [], message: 'No active profiles' }
  }

  const results = await Promise.all(
    profiles.map(async (p) => {
      const pid = p.id as string
      const wbService = createWriteBackService(pid)
      const profileResult = await runAutoPilotForProfile(
        pid,
        ctx.ads,
        (actions) => wbService.executeBatch(actions),
      )
      return { profile_id: pid, ...profileResult }
    }),
  )

  return { profiles: results }
}

export { runAutoPilotCron, runAutoPilotForProfile, fetchAutoPilotCampaigns, fetchMetricsSnapshot }
export type { CronResult, AutoPilotCronResult }
