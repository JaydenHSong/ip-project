// POST /api/ads/recommendations/[id]/skip — Persist skip (Paper S03 / S11)
// Design Ref: ads-dashboard-s01-s03-matching Plan §9

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { skipRecommendation } from '@/modules/ads/features/optimization/skip-recommendation'

export const POST = withAuth(async (req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'Recommendation ID is required' } },
      { status: 400 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as { brand_market_id?: string }
  if (!body.brand_market_id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'brand_market_id is required' } },
      { status: 400 },
    )
  }

  try {
    const result = await skipRecommendation(id, body.brand_market_id)
    return NextResponse.json({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status =
      message === 'Recommendation not found'
        ? 404
        : message === 'Market mismatch'
          ? 403
          : message === 'Recommendation is not pending'
            ? 409
            : 500
    return NextResponse.json({ error: { code: 'SKIP_ERROR', message } }, { status })
  }
}, ['editor', 'admin', 'owner'])
