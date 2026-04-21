// POST /api/ads/autopilot/run — Manual AutoPilot trigger (FR-01)
// Design Ref: §4.1 — 수동 실행 트리거

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'
import { createWriteBackService } from '@/modules/ads/api/factory'
import { runAutoPilotForProfile } from '@/modules/ads/cron/autopilot-run'

export const POST = withAuth(async (req) => {
  const body = await req.json() as { profile_id?: string; campaign_ids?: string[] }

  if (!body.profile_id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'profile_id is required' } },
      { status: 400 },
    )
  }

  try {
    const ctx = createAdsAdminContext()
    const writeBackService = createWriteBackService(body.profile_id)

    const result = await runAutoPilotForProfile(
      body.profile_id,
      ctx.ads,
      (actions) => writeBackService.executeBatch(actions),
    )

    return NextResponse.json({
      data: {
        campaigns_processed: result.campaigns_processed,
        total_actions: result.total_actions,
        total_blocked: result.total_blocked,
        errors: result.errors,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'ENGINE_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['admin', 'owner'])
