// Cron: Search Term → keyword_recommendations (daily)
// Design Ref: §5.1 — Delegates to SyncService via factory

import { createAdsAdminClient } from '@/lib/supabase/admin'
import { createSyncService } from '@/modules/ads/api/factory'
import type { AnalysisResult } from '@/modules/ads/api/services/sync'

export async function analyzeKeywords(): Promise<AnalysisResult> {
  const supabase = createAdsAdminClient()

  const { data: profiles, error } = await supabase
    .from('marketplace_profiles')
    .select('profile_id')
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to fetch marketplace profiles: ${error.message}`)
  }

  const totals: AnalysisResult = {
    campaigns_analyzed: 0,
    recommendations_created: 0,
    negative_keywords_found: 0,
    errors: 0,
  }

  for (const profile of profiles ?? []) {
    const syncService = createSyncService(profile.profile_id)
    const result = await syncService.analyzeKeywords(profile.profile_id)
    totals.campaigns_analyzed += result.campaigns_analyzed
    totals.recommendations_created += result.recommendations_created
    totals.negative_keywords_found += result.negative_keywords_found
    totals.errors += result.errors
  }

  return totals
}
