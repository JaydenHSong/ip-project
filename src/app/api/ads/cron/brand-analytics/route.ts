// POST /api/ads/cron/brand-analytics — Cron: Brand Analytics → keyword_rankings (weekly Monday)

import { NextResponse } from 'next/server'
import { syncBrandAnalytics } from '@/modules/ads/cron/brand-analytics'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid CRON_SECRET' } },
      { status: 401 },
    )
  }

  try {
    const result = await syncBrandAnalytics()
    return NextResponse.json({ success: true, message: 'Brand analytics sync completed', data: result })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'CRON_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
