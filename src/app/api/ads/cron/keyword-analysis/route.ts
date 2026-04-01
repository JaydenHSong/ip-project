// POST /api/ads/cron/keyword-analysis — Cron: Search Term → keyword_recommendations (daily)

import { NextResponse } from 'next/server'
import { analyzeKeywords } from '@/modules/ads/cron/keyword-analysis'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid CRON_SECRET' } },
      { status: 401 },
    )
  }

  try {
    const result = await analyzeKeywords()
    return NextResponse.json({ success: true, message: 'Keyword analysis completed', data: result })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'CRON_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
