// POST /api/ads/cron/autopilot-run — Cron: AutoPilot hourly (every hour)

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createWriteBackService } from '@/modules/ads/api/factory'
import { runAutoPilotCron } from '@/modules/ads/cron/autopilot-run'

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

    // Get all active marketplace profiles
    const { data: profiles } = await db
      .from('ads.marketplace_profiles')
      .select('id')
      .eq('status', 'active')

    if (!profiles?.length) {
      return NextResponse.json({ success: true, message: 'No active profiles', data: [] })
    }

    const results = await Promise.all(
      profiles.map(async (p) => {
        const pid = p.id as string
        const wbService = createWriteBackService(pid)
        return runAutoPilotCron(pid, db, (actions) => wbService.executeBatch(actions))
      }),
    )

    return NextResponse.json({ success: true, message: 'AutoPilot run completed', data: results })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'CRON_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
