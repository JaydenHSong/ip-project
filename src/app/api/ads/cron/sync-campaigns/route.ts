// POST /api/ads/cron/sync-campaigns — Cron: Ads API → ads.campaigns (hourly)

import { NextResponse } from 'next/server'
import { syncCampaigns } from '@/modules/ads/cron/sync-campaigns'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid CRON_SECRET' } },
      { status: 401 },
    )
  }

  try {
    const result = await syncCampaigns()
    return NextResponse.json({ success: true, message: 'Campaign sync completed', data: result })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'CRON_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
