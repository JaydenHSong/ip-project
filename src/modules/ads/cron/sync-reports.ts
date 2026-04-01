// Cron: Reporting → report_snapshots (daily 2AM)
// Downloads performance reports from Amazon Ads API and stores snapshots

import { createAdminClient } from '@/lib/supabase/admin'

type SyncResult = {
  profiles_processed: number
  snapshots_created: number
  errors: number
}

export async function syncReports(): Promise<SyncResult> {
  const supabase = createAdminClient()

  // TODO: When Amazon Ads API is authorized:
  // 1. Fetch active marketplace_profiles
  // 2. For each profile, request SP/SB/SD campaign reports (yesterday)
  // 3. Download report once ready
  // 4. Parse metrics and insert into ads.report_snapshots
  // 5. Calculate derived metrics (ACoS, ROAS, CTR, CPC)

  const { data: profiles, error } = await supabase
    .from('ads.marketplace_profiles')
    .select('id, profile_id, marketplace_id')
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to fetch marketplace profiles: ${error.message}`)
  }

  const result: SyncResult = {
    profiles_processed: profiles?.length ?? 0,
    snapshots_created: 0,
    errors: 0,
  }

  // TODO: Iterate profiles and sync reports from Amazon Ads API
  void profiles

  return result
}
