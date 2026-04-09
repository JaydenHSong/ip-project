// GET /api/ads/optimization/budget-pacing/[id] — Budget Pacing Detail (S05)
// Design Ref: §4.2 — exposes getBudgetPacingDetail server query so the
// Optimization/Budget tab can show real spend instead of hardcoded zeros (C1+C2 fix).

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { getBudgetPacingDetail } from '@/modules/ads/features/optimization/queries'

export const GET = withAuth(async (_req, { params }) => {
  const id = params.id
  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'campaign id is required' } },
      { status: 400 },
    )
  }

  try {
    const data = await getBudgetPacingDetail(id)
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'])
