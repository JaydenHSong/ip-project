// POST /api/ads/cron/dayparting-apply — Cron: bid multiplier application (hourly)

import { NextResponse } from 'next/server'
import { applyDayparting } from '@/modules/ads/cron/dayparting-apply'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid CRON_SECRET' } },
      { status: 401 },
    )
  }

  try {
    const result = await applyDayparting()
    return NextResponse.json({ success: true, message: 'Dayparting applied', data: result })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'CRON_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
