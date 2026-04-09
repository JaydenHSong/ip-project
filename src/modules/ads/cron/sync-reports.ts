// Cron: Reporting → report_snapshots (daily 2AM)
// Design Ref: §5.1 — Delegates to SyncService via factory

import { createAdsAdminClient } from '@/lib/supabase/admin'
import { createSyncService } from '@/modules/ads/api/factory'
import type { SyncResult } from '@/modules/ads/api/services/sync-service'

export async function syncReports(): Promise<SyncResult> {
  const supabase = createAdsAdminClient()

  const { data: profiles, error } = await supabase
    .from('marketplace_profiles')
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
