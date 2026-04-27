// GET /api/ads/autopilot/ai-reviews — AI Review list (FR-06)
// Design Ref: §4.2 — AI 리뷰 조회

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'

export const GET = withAuth(async (req) => {
  const url = new URL(req.url)
  const profileId = url.searchParams.get('profile_id')
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 5), 20)

  if (!profileId) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'profile_id is required' } },
      { status: 400 },
    )
  }

  try {
    const ctx = createAdsAdminContext()
    const { data, count } = await ctx.ads
      .from(ctx.adsTable('ai_reviews'))
      .select('*', { count: 'exact' })
      .eq('marketplace_profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return NextResponse.json({ data: data ?? [], total: count ?? 0 })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])
