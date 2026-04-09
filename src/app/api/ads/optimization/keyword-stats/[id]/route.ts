// GET /api/ads/optimization/keyword-stats/[id] — Keyword Stats Strip (S06)
// Design Ref: §4.2 — exposes getKeywordStats so the Optimization/Keywords tab
// can populate its KPI strip (C3 fix).

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { getKeywordStats } from '@/modules/ads/features/optimization/queries'

export const GET = withAuth(async (_req, { params }) => {
  const id = params.id
  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'campaign id is required' } },
      { status: 400 },
    )
  }

  try {
    const data = await getKeywordStats(id)
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'])
