// Design Ref: §4.5 — Manual sync trigger
// POST /api/ads/amazon/sync

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createSyncService } from '@/modules/ads/api/factory'
import type { SyncResult, AnalysisResult } from '@/modules/ads/api/services/sync'

type SyncType = 'campaigns' | 'reports' | 'keywords' | 'all'

export const POST = withAuth(async (request: NextRequest) => {
  const profileId = process.env.AMAZON_ADS_PROFILE_ID_US ?? ''

  if (!profileId) {
    return NextResponse.json(
      { error: { code: 'NO_PROFILE', message: 'AMAZON_ADS_PROFILE_ID_US not configured' } },
      { status: 400 },
    )
  }

  const body = await request.json() as { type?: SyncType }
  const syncType = body.type ?? 'all'

  const validTypes: SyncType[] = ['campaigns', 'reports', 'keywords', 'all']
  if (!validTypes.includes(syncType)) {
    return NextResponse.json(
      { error: { code: 'INVALID_TYPE', message: `type must be one of: ${validTypes.join(', ')}` } },
      { status: 400 },
    )
  }

  const syncService = createSyncService(profileId)
  const results: Record<string, SyncResult | AnalysisResult> = {}

  try {
    if (syncType === 'campaigns' || syncType === 'all') {
      results.campaigns = await syncService.syncCampaigns(profileId)
    }

    if (syncType === 'reports' || syncType === 'all') {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const reportDate = yesterday.toISOString().split('T')[0]
      results.reports = await syncService.syncReports(profileId, reportDate)
    }

    if (syncType === 'keywords' || syncType === 'all') {
      results.keywords = await syncService.analyzeKeywords(profileId)
    }

    return NextResponse.json({
      data: {
        type: syncType,
        profile_id: profileId,
        results,
        synced_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json(
      { error: { code: 'SYNC_ERROR', message } },
      { status: 500 },
    )
  }
}, ['admin', 'owner'])
