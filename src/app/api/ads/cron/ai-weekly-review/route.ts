// POST /api/ads/cron/ai-weekly-review — Cron: Claude AI review (weekly Mon 8AM UTC)

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runWeeklyReviewCron } from '@/modules/ads/cron/ai-weekly-review'

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

    const results = await Promise.all(
      profiles.map(p => runWeeklyReviewCron(p.id as string, db)),
    )

    return NextResponse.json({ success: true, message: 'AI weekly review completed', data: results })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'CRON_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
