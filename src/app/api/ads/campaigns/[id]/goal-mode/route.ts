// PATCH /api/ads/campaigns/[id]/goal-mode — Goal Mode change (FR-01)
// Design Ref: §4.3 — Goal Mode 변경

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_GOAL_MODES = ['launch', 'growth', 'profit', 'defend'] as const

export const PATCH = withAuth(async (req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'Campaign ID is required' } },
      { status: 400 },
    )
  }

  const body = await req.json() as { goal_mode?: string }

  if (!body.goal_mode || !(VALID_GOAL_MODES as readonly string[]).includes(body.goal_mode)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: `goal_mode must be one of: ${VALID_GOAL_MODES.join(', ')}` } },
      { status: 400 },
    )
  }

  try {
    const db = createAdminClient()

    // Verify campaign exists and is autopilot mode
    const { data: campaign } = await db
      .from('ads.campaigns')
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

    const { error } = await db
      .from('ads.campaigns')
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
