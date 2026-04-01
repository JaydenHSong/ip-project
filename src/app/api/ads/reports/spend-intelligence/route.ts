// GET /api/ads/reports/spend-intelligence — Spend Intelligence (S12)
// Design Ref: §4.2

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { getSpendIntelligence } from '@/modules/ads/features/spend-intelligence/queries'

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
    const data = await getSpendIntelligence(brandMarketId)
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])
