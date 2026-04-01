// GET /api/ads/dashboard/director — Director dashboard aggregation (S02)
// Design Ref: §4.2

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDirectorDashboard } from '@/modules/ads/features/dashboard/queries'

export const GET = withAuth(async (req, { user }) => {
  try {
    const supabase = createAdminClient()

    // Resolve org_unit_id
    const { data: orgLink } = await supabase
      .from('user_org_units')
      .select('org_unit_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    const orgUnitId = orgLink?.org_unit_id ?? user.id

    // Get brand_market_ids accessible to this user
    const url = new URL(req.url)
    const brandMarketId = url.searchParams.get('brand_market_id')

    let bmIds: string[] = []
    if (brandMarketId) {
      bmIds = [brandMarketId]
    } else {
      const { data: bms } = await supabase
        .from('brand_markets')
        .select('id')
        .eq('org_unit_id', orgUnitId)
      bmIds = (bms ?? []).map((b) => b.id)
    }

    const data = await getDirectorDashboard(orgUnitId, bmIds)
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['admin', 'owner'])
