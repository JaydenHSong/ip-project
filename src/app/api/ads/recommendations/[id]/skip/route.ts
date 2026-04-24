// POST /api/ads/recommendations/[id]/skip — Persist skip (Paper S03 / S11)
// Design Ref: ads-dashboard-s01-s03-matching Plan §9

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { parseBody } from '@/lib/api/validate-body'
import { skipRecommendation } from '@/modules/ads/features/optimization/skip-recommendation'
import { skipRecommendationSchema } from '@/modules/ads/features/recommendations/schemas'

export const POST = withAuth(async (req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'Recommendation ID is required' } },
      { status: 400 },
    )
  }

  // Plan SC-3: Zod validation — brand_market_id required for tenant scoping.
  const parsed = await parseBody(req, skipRecommendationSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

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
