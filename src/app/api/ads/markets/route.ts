// GET /api/ads/markets — List brand_markets with active ads profiles

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAdsAdminClient } from '@/lib/supabase/admin'

export const GET = withAuth(async () => {
  try {
    const adsDb = createAdsAdminClient()
    const publicDb = createAdminClient()

    // Get marketplace_profiles that have ads_profile_id set
    const { data: profiles } = await adsDb
      .from('marketplace_profiles')
      .select('id, brand_market_id, ads_profile_id, region, is_active')
      .eq('is_active', true)
      .not('ads_profile_id', 'is', null)

    if (!profiles?.length) {
      return NextResponse.json({ data: [] })
    }

    // Get brand_market details from public schema
    const bmIds = profiles.map(p => p.brand_market_id as string)
    const { data: brandMarkets } = await publicDb
      .from('brand_markets')
      .select('id, marketplace, account_name, brand_id')
      .in('id', bmIds)

    const bmMap = new Map((brandMarkets ?? []).map(bm => [bm.id, bm]))

    // Get brand names
    const brandIds = [...new Set((brandMarkets ?? []).map(bm => bm.brand_id))]
    const { data: brands } = await publicDb
      .from('brands')
      .select('id, name')
      .in('id', brandIds.length > 0 ? brandIds : ['__none__'])

    const brandMap = new Map((brands ?? []).map(b => [b.id, b.name]))

    const markets = profiles.map(p => {
      const bm = bmMap.get(p.brand_market_id as string)
      const brandName = bm ? brandMap.get(bm.brand_id) : null
      return {
        brand_market_id: p.brand_market_id,
        marketplace_profile_id: p.id,
        label: `${brandName ?? 'Unknown'} — ${bm?.marketplace ?? p.region}`,
        marketplace: bm?.marketplace ?? p.region,
        brand_name: brandName ?? 'Unknown',
        region: p.region,
      }
    })

    return NextResponse.json({ data: markets })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'QUERY_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'])
