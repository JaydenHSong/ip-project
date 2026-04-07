// 임시 테스트용 — sync-reports 수동 트리거 (나중에 삭제)
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminClient } from '@/lib/supabase/admin'
import { createSyncService } from '@/modules/ads/api/factory'

export const GET = withAuth(async () => {
  try {
    const adsDb = createAdsAdminClient()

    const { data: profiles } = await adsDb
      .from('marketplace_profiles')
      .select('ads_profile_id')
      .eq('is_active', true)
      .not('ads_profile_id', 'is', null)

    if (!profiles?.length) {
      return NextResponse.json({ success: true, message: 'No profiles', data: [] })
    }

    // Sync last 7 days of reports
    const results = []
    for (const p of profiles) {
      const profileId = p.ads_profile_id as string
      const syncService = createSyncService(profileId)

      for (let i = 1; i <= 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]

        try {
          const result = await syncService.syncReports(profileId, dateStr)
          results.push({ profile: profileId, date: dateStr, ...result })
        } catch (err) {
          results.push({ profile: profileId, date: dateStr, error: err instanceof Error ? err.message : 'Unknown' })
        }
      }
    }

    return NextResponse.json({ success: true, data: results })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}, ['admin', 'owner'])
