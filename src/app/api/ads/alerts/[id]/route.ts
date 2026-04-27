// GET /api/ads/alerts/[id] — Alert detail

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'

export const GET = withAuth(async (_req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'Alert ID is required' } },
      { status: 400 },
    )
  }

  try {
    const ctx = createAdsAdminContext()

    const { data, error } = await ctx.ads
      .from(ctx.adsTable('alerts'))
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Alert not found' } },
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
}, ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'])
