// GET /api/ads/budgets — Annual budget list (S13)
// PUT /api/ads/budgets — Save budget entries
// Design Ref: §4.2

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { getBudgets, saveBudgets } from '@/modules/ads/features/budget-planning/queries'
import type { SaveBudgetRequest } from '@/modules/ads/features/budget-planning/types'

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
    const data = await getBudgets({ brand_market_id: brandMarketId, year: Number(year) })
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'])

export const PUT = withAuth(async (req, { user }) => {
  const body = await req.json() as SaveBudgetRequest

  if (!body.brand_market_id || !body.year || !body.entries?.length) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'brand_market_id, year, and entries are required' } },
      { status: 400 },
    )
  }

  try {
    const result = await saveBudgets(body.brand_market_id, body.year, body.entries, user.id)
    return NextResponse.json({ data: result })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['admin', 'owner'])
