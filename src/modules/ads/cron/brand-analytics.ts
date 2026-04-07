// Cron: Brand Analytics → report_snapshots (daily)
// Design Ref: §9 — Cron rewrite: delegate to SyncService via factory

import { createAdsAdminClient } from '@/lib/supabase/admin'
import { createSyncService } from '../api/factory'

type SyncResult = {
  markets_processed: number
  keywords_synced: number
  errors: number
}

export async function syncBrandAnalytics(): Promise<SyncResult> {
  const supabase = createAdsAdminClient()

  const { data: profiles, error } = await supabase
    .from('marketplace_profiles')
    .select('id, profile_id, marketplace_id')
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to fetch marketplace profiles: ${error.message}`)
  }

  const result: SyncResult = {
    markets_processed: 0,
    keywords_synced: 0,
    errors: 0,
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const reportDate = yesterday.toISOString().split('T')[0]

  for (const profile of profiles ?? []) {
    try {
      const syncService = createSyncService(profile.profile_id)
      const syncResult = await syncService.syncBrandAnalytics(profile.profile_id, reportDate)
      result.markets_processed += 1
      result.keywords_synced += syncResult.synced
      result.errors += syncResult.errors
    } catch {
      result.errors += 1
    }
  }

  return result
}
