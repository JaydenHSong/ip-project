// Cron: Reporting → report_snapshots (daily 2AM)
// Design Ref: §5.1 — Delegates to SyncService via factory
// Design Ref: ft-runtime-hardening §3.4 — ctx 주입 entry point

import type { AdsAdminContext } from '@/lib/supabase/ads-context'
import { createSyncService } from '@/modules/ads/api/factory'
import type { SyncResult } from '@/modules/ads/api/services/sync'

/**
 * Cron entry point: fetch active profiles and sync yesterday's reports.
 * Called by /api/ads/cron/sync-reports route via createCronHandler
 * AND by /api/ads/amazon/sync-reports manual trigger.
 */
export async function syncReports(ctx: AdsAdminContext): Promise<SyncResult> {
  const { data: profiles, error } = await ctx.ads
    .from(ctx.adsTable('marketplace_profiles'))
    .select('ads_profile_id')
    .eq('is_active', true)
    .not('ads_profile_id', 'is', null)

  if (error) {
    throw new Error(`Failed to fetch marketplace profiles: ${error.message}`)
  }

  // Yesterday's date for report
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const reportDate = yesterday.toISOString().split('T')[0]

  const totals: SyncResult = { synced: 0, created: 0, updated: 0, errors: 0 }

  for (const profile of profiles ?? []) {
    const profileId = profile.ads_profile_id as string
    const syncService = createSyncService(profileId)
    const result = await syncService.syncReports(profileId, reportDate)
    totals.synced += result.synced
    totals.created += result.created
    totals.updated += result.updated
    totals.errors += result.errors
  }

  return totals
}
