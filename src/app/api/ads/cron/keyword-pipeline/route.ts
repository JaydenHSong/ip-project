// POST /api/ads/cron/keyword-pipeline — Cron: Keyword harvest/negate (daily 6AM UTC)

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAutoPilotCampaigns } from '@/modules/ads/cron/autopilot-run'
import { runKeywordPipeline } from '@/modules/ads/engine/autopilot/keyword-pipeline'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid CRON_SECRET' } },
      { status: 401 },
    )
  }

  try {
    const db = createAdminClient()

    const { data: profiles } = await db
      .from('ads.marketplace_profiles')
      .select('id')
      .eq('status', 'active')

    if (!profiles?.length) {
      return NextResponse.json({ success: true, message: 'No active profiles', data: [] })
    }

    const results = []

    for (const profile of profiles) {
      const pid = profile.id as string
      const campaigns = await fetchAutoPilotCampaigns(pid, db)
      if (!campaigns.length) continue

      const result = await runKeywordPipeline(pid, campaigns, db)
      results.push({ profile_id: pid, ...result })
    }

    return NextResponse.json({ success: true, message: 'Keyword pipeline completed', data: results })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'CRON_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
