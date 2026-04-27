// PATCH /api/ads/campaigns/[id]/goal-mode — Goal Mode change (FR-01)
// Design Ref: §4.3 — Goal Mode 변경

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'
import { parseBody } from '@/lib/api/validate-body'
import { goalModeSchema } from '@/modules/ads/features/campaigns/schemas'

export const PATCH = withAuth(async (req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'Campaign ID is required' } },
      { status: 400 },
    )
  }

  // Plan SC-3: Zod validation — replaces manual VALID_GOAL_MODES enum check.
  const parsed = await parseBody(req, goalModeSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  try {
    const ctx = createAdsAdminContext()

    // Verify campaign exists and is autopilot mode
    const { data: campaign } = await ctx.ads
      .from(ctx.adsTable('campaigns'))
      .select('id, mode, goal_mode')
      .eq('id', id)
      .single()

    if (!campaign) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Campaign not found' } },
        { status: 404 },
      )
    }

    if ((campaign.mode as string) !== 'autopilot') {
      return NextResponse.json(
        { error: { code: 'INVALID_STATE', message: 'Goal Mode can only be changed for autopilot campaigns' } },
        { status: 400 },
      )
    }

    const { error } = await ctx.ads
      .from(ctx.adsTable('campaigns'))
      .update({ goal_mode: body.goal_mode })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({
      data: { success: true, campaign_id: id, goal_mode: body.goal_mode },
    })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])
