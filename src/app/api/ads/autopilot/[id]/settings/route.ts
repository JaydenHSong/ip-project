// PUT /api/ads/autopilot/[id]/settings — Update autopilot settings (Target ACoS, Weekly Budget)

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'

export const PUT = withAuth(async (req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'Campaign ID is required' } },
      { status: 400 },
    )
  }

  const body = await req.json() as {
    target_acos?: number
    weekly_budget?: number
    daily_budget?: number
    max_bid_cap?: number
    bid_strategy?: string
  }

  if (body.target_acos != null && (body.target_acos < 1 || body.target_acos > 100)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'target_acos must be between 1 and 100' } },
      { status: 400 },
    )
  }

  const updates: Record<string, unknown> = {}
  if (body.target_acos !== undefined) updates.target_acos = body.target_acos
  if (body.weekly_budget !== undefined) updates.weekly_budget = body.weekly_budget
  if (body.daily_budget !== undefined) updates.daily_budget = body.daily_budget
  if (body.max_bid_cap !== undefined) updates.max_bid_cap = body.max_bid_cap
  if (body.bid_strategy !== undefined) updates.bid_strategy = body.bid_strategy

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } },
      { status: 400 },
    )
  }

  try {
    const ctx = createAdsAdminContext()

    const { data, error } = await ctx.ads
      .from(ctx.adsTable('campaigns'))
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('mode', 'autopilot')
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Autopilot campaign not found' } },
        { status: 404 },
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])
