// Cron: Orders → dayparting patterns (daily)
// Design Ref: §9 — Cron rewrite: delegate to SyncService via factory

import { createAdsAdminClient } from '@/lib/supabase/admin'
import { createSyncService } from '../api/factory'

type PatternResult = {
  markets_analyzed: number
  weights_updated: number
  errors: number
}

export async function analyzeOrdersPattern(): Promise<PatternResult> {
  const supabase = createAdsAdminClient()

  const { data: profiles, error } = await supabase
    .from('marketplace_profiles')
    .select('id, profile_id, marketplace_id')
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to fetch marketplace profiles: ${error.message}`)
  }

  const result: PatternResult = {
    markets_analyzed: 0,
    weights_updated: 0,
    errors: 0,
  }

  for (const profile of profiles ?? []) {
    try {
      const syncService = createSyncService(profile.profile_id)
      const syncResult = await syncService.syncOrderPatterns(profile.profile_id)
      result.markets_analyzed += 1
      result.weights_updated += syncResult.synced
      result.errors += syncResult.errors
    } catch {
      result.errors += 1
    }
  }

  return result
}
