// GET /api/ads/budgets/change-log — Budget change history
// Design Ref: §4.2

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { getBudgetChangeLog } from '@/modules/ads/features/budget-planning/queries'

export const GET = withAuth(async (req) => {
  const url = new URL(req.url)
  const brandMarketId = url.searchParams.get('brand_market_id')
  const year = url.searchParams.get('year')

  if (!brandMarketId || !year) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'brand_market_id and year are required' } },
      { status: 400 },
    )
  }

  try {
    const data = await getBudgetChangeLog(brandMarketId, Number(year))
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['admin', 'owner'])
