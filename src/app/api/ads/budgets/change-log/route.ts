// GET /api/ads/budgets/change-log — Budget change history (team-scoped)

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { getBudgetChangeLog } from '@/modules/ads/features/budget-planning/queries'
import type { Role } from '@/types/users'
import { resolveBudgetOrgUnitId } from '@/modules/ads/features/budget-planning/resolve-budget-org'

export const GET = withAuth(async (req, { user }) => {
  const url = new URL(req.url)
  const brandMarketId = url.searchParams.get('brand_market_id')
  const year = url.searchParams.get('year')
  const requestedOrg = url.searchParams.get('org_unit_id')

  if (!brandMarketId || !year) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'brand_market_id and year are required' } },
      { status: 400 },
    )
  }

  const resolved = await resolveBudgetOrgUnitId(
    user.id,
    user.role as Role,
    brandMarketId,
    requestedOrg,
  )

  if (!resolved.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: resolved.message } }, { status: 403 })
  }

  try {
    const data = await getBudgetChangeLog(brandMarketId, resolved.orgUnitId, Number(year))
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['admin', 'owner'])