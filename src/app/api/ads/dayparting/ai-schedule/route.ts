// GET /api/ads/dayparting/ai-schedule — AI recommended schedule
// POST /api/ads/dayparting/ai-schedule — Apply AI schedule

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── GET: AI recommended schedule ───

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
    const supabase = createAdminClient()

    // Fetch hourly weights to generate AI recommendation
    const { data: weights, error } = await supabase
      .from('ads.dayparting_hourly_weights')
      .select('*')
      .eq('brand_market_id', brandMarketId)
      .order('day_of_week', { ascending: true })
      .order('hour', { ascending: true })

    if (error) throw error

    // TODO: Run AI recommendation engine against hourly weights
    // For now, return the raw weights as the "recommendation"
    const recommendation = {
      brand_market_id: brandMarketId,
      schedule: weights ?? [],
      confidence: 0,
      generated_at: new Date().toISOString(),
      note: 'AI schedule recommendation — engine pending implementation',
    }

    return NextResponse.json({ data: recommendation })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'])

// ─── POST: Apply AI recommended schedule ───

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json() as {
    brand_market_id: string
    schedule_name: string
    schedule_data: unknown
  }

  if (!body.brand_market_id || !body.schedule_name || !body.schedule_data) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'brand_market_id, schedule_name, and schedule_data are required' } },
      { status: 400 },
    )
  }

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ads.dayparting_schedules')
      .insert({
        brand_market_id: body.brand_market_id,
        name: body.schedule_name,
        schedule_data: body.schedule_data,
        source: 'ai',
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])
