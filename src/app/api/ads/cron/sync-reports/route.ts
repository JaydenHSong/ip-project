// POST /api/ads/cron/sync-reports — Cron: Reporting → report_snapshots (daily 2AM)

import { NextResponse } from 'next/server'
import { syncReports } from '@/modules/ads/cron/sync-reports'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid CRON_SECRET' } },
      { status: 401 },
    )
  }

  try {
    const result = await syncReports()
    return NextResponse.json({ success: true, message: 'Report sync completed', data: result })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'CRON_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
