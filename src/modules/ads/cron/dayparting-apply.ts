// Cron: Dayparting schedule application (hourly)
// Design Ref: §5.2 — Delegates to WriteBackService via factory

import { createWriteBackService } from '@/modules/ads/api/factory'
import { createAdsAdminClient } from '@/lib/supabase/admin'
import type { DaypartingResult } from '@/modules/ads/api/services/write-back-service'

export async function applyDayparting(): Promise<DaypartingResult> {
  const supabase = createAdsAdminClient()

  const { data: profiles, error } = await supabase
    .from('marketplace_profiles')
    .select('profile_id')
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to fetch marketplace profiles: ${error.message}`)
  }

  const totals: DaypartingResult = { schedules_processed: 0, campaigns_adjusted: 0, errors: 0 }

  for (const profile of profiles ?? []) {
    const startedAt = new Date().toISOString()
    const writeBackService = createWriteBackService(profile.profile_id)
    const result = await writeBackService.applyDayparting(profile.profile_id)
    totals.schedules_processed += result.schedules_processed
    totals.campaigns_adjusted += result.campaigns_adjusted
    totals.errors += result.errors

    // Log to ads.sync_logs
    await supabase.from('sync_logs').insert({
      profile_id: profile.profile_id,
      sync_type: 'dayparting',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      synced: result.schedules_processed,
      updated: result.campaigns_adjusted,
      errors: result.errors,
    }).then(() => {}, () => {})
  }

  return totals
}
