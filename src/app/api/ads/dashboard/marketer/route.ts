// GET /api/ads/dashboard/marketer — Marketer dashboard aggregation

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

export const GET = withAuth(async (req, { user }) => {
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

    // Fetch campaigns assigned to user for the brand_market
    const { data: campaigns, error: campError } = await supabase
      .from('ads.campaigns')
      .select('id, name, status, mode, target_acos, daily_budget, weekly_budget')
      .eq('brand_market_id', brandMarketId)
      .eq('assigned_to', user.id)

    if (campError) throw campError

    // Fetch active alerts for this brand_market
    const { data: alerts, error: alertError } = await supabase
      .from('ads.alerts')
      .select('id, alert_type, severity, status, created_at')
      .eq('brand_market_id', brandMarketId)
      .in('status', ['new', 'escalated'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (alertError) throw alertError

    // Fetch pending recommendations
    const { data: recommendations, error: recError } = await supabase
      .from('ads.recommendations')
      .select('id, type, priority, status, created_at')
      .eq('brand_market_id', brandMarketId)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .limit(10)

    if (recError) throw recError

    const data = {
      campaigns: campaigns ?? [],
      campaign_count: campaigns?.length ?? 0,
      alerts: alerts ?? [],
      alert_count: alerts?.length ?? 0,
      recommendations: recommendations ?? [],
      recommendation_count: recommendations?.length ?? 0,
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'])
