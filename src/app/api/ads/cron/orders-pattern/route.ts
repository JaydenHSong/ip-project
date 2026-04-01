// POST /api/ads/cron/orders-pattern — Cron: Orders DB → dayparting_hourly_weights (weekly)

import { NextResponse } from 'next/server'
import { analyzeOrdersPattern } from '@/modules/ads/cron/orders-pattern'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid CRON_SECRET' } },
      { status: 401 },
    )
  }

  try {
    const result = await analyzeOrdersPattern()
    return NextResponse.json({ success: true, message: 'Orders pattern analysis completed', data: result })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'CRON_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
