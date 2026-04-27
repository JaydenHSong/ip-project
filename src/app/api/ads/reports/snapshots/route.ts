// GET /api/ads/reports/snapshots — Performance snapshots

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'

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
    const ctx = createAdsAdminContext()

    let query = ctx.ads
      .from(ctx.adsTable('report_snapshots'))
      .select('*', { count: 'exact' })
      .eq('brand_market_id', brandMarketId)

    const campaignId = url.searchParams.get('campaign_id')
    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    const dateFrom = url.searchParams.get('date_from')
    if (dateFrom) {
      query = query.gte('report_date', dateFrom)
    }

    const dateTo = url.searchParams.get('date_to')
    if (dateTo) {
      query = query.lte('report_date', dateTo)
    }

    // report_level (renamed from non-existent 'granularity' — see Reports gap analysis C4)
    const reportLevel = url.searchParams.get('report_level') ?? url.searchParams.get('granularity')
    if (reportLevel) {
      query = query.eq('report_level', reportLevel)
    }

    query = query.order('report_date', { ascending: false })

    const page = Number(url.searchParams.get('page') || '1')
    const limit = Number(url.searchParams.get('limit') || '50')
    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({ data, meta: { total: count, page, limit } })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'])
