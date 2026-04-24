// GET /api/ads/dayparting/schedules — Dayparting schedule groups
// PUT /api/ads/dayparting/schedules — Update schedule

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'
import { parseBody } from '@/lib/api/validate-body'
import { updateDaypartingSchema } from '@/modules/ads/features/optimization/schemas'

// ─── GET: List dayparting schedules ───

export const GET = withAuth(async (req) => {
  const url = new URL(req.url)
  const brandMarketId = url.searchParams.get('brand_market_id')

  if (!brandMarketId) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'brand_market_id is required' } },
      { status: 400 },
    )
  }

  try {
    const ctx = createAdsAdminContext()

    const { data, error } = await ctx.ads
      .from(ctx.adsTable('dayparting_schedules'))
      .select('*')
      .eq('brand_market_id', brandMarketId)
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'])

// ─── PUT: Update schedule ───

export const PUT = withAuth(async (req, { user }) => {
  // Plan SC-3: Zod validation — id required; partial fields validated.
  const parsed = await parseBody(req, updateDaypartingSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }
  if (body.name !== undefined) updates.name = body.name
  if (body.schedule_data !== undefined) updates.schedule_data = body.schedule_data
  if (body.is_active !== undefined) updates.is_active = body.is_active

  try {
    const ctx = createAdsAdminContext()

    const { data, error } = await ctx.ads
      .from(ctx.adsTable('dayparting_schedules'))
      .update(updates)
      .eq('id', body.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])
