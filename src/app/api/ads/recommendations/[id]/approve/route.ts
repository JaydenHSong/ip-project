// POST /api/ads/recommendations/[id]/approve — Approve recommendation
// Design Ref: §4.2

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { approveRecommendation } from '@/modules/ads/features/optimization/queries'
import type { ApproveRequest } from '@/modules/ads/features/optimization/types'

export const POST = withAuth(async (req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'Recommendation ID is required' } },
      { status: 400 },
    )
  }

  try {
    const body = await req.json() as ApproveRequest
    const result = await approveRecommendation(id, body.adjusted_bid)
    return NextResponse.json({ data: result })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])
