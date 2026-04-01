// GET /api/ads/alerts — Alert list with severity filter

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const supabase = createAdminClient()

    let query = supabase
      .from('ads.alerts')
      .select('*', { count: 'exact' })
      .eq('brand_market_id', brandMarketId)

    const severity = url.searchParams.get('severity')
    if (severity) {
      query = query.eq('severity', severity)
    }

    const status = url.searchParams.get('status')
    if (status) {
      query = query.eq('status', status)
    }

    const alertType = url.searchParams.get('alert_type')
    if (alertType) {
      query = query.eq('alert_type', alertType)
    }

    query = query.order('created_at', { ascending: false })

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
