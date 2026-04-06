// Cron: Ads API → ads.campaigns (hourly)
// Design Ref: §5.1 — Delegates to SyncService via factory

import { createAdminClient } from '@/lib/supabase/admin'
import { createSyncService } from '@/modules/ads/api/factory'
import type { SyncResult } from '@/modules/ads/api/services/sync-service'

export async function syncCampaigns(): Promise<SyncResult> {
  const supabase = createAdminClient()

  const { data: profiles, error } = await supabase
    .from('ads.marketplace_profiles')
    .select('profile_id')
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to fetch marketplace profiles: ${error.message}`)
  }

  const totals: SyncResult = { synced: 0, created: 0, updated: 0, errors: 0 }

  for (const profile of profiles ?? []) {
    const syncService = createSyncService(profile.profile_id)
    const result = await syncService.syncCampaigns(profile.profile_id)
    totals.synced += result.synced
    totals.created += result.created
    totals.updated += result.updated
    totals.errors += result.errors
  }

  return totals
}
