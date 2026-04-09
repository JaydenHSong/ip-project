// GET /api/ads/amazon/sync-reports — Manual report sync trigger (owner only)

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { syncReports } from '@/modules/ads/cron/sync-reports'

export const GET = withAuth(async () => {
  try {
    const result = await syncReports()
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'SYNC_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['owner'])

export const maxDuration = 300
