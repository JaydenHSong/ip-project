// GET /api/ads/dashboard/ceo — CEO dashboard aggregation (S01)
// Design Ref: §4.2

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'
import { getCeoDashboard } from '@/modules/ads/features/dashboard/queries'

export const GET = withAuth(async (_req, { user }) => {
  try {
    const ctx = createAdsAdminContext()

    // Resolve org_unit_id for current user (user_org_units lives in PUBLIC)
    const { data: orgLink } = await ctx.public
      .from(ctx.publicTable('user_org_units'))
      .select('org_unit_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    const orgUnitId = orgLink?.org_unit_id ?? user.id

    const data = await getCeoDashboard(ctx, orgUnitId)
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['owner'])
