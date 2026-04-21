// GET /api/ads/dashboard/marketer — Marketer dashboard aggregation

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

    const { count: marketCampaignCount, error: countError } = await ctx.ads
      .from(ctx.adsTable('campaigns'))
      .select('id', { count: 'exact', head: true })
      .eq('brand_market_id', brandMarketId)

    if (countError) throw countError

    const { data: campaigns, error: campError } = await ctx.ads
      .from(ctx.adsTable('campaigns'))
      .select('id, name, status, mode, target_acos, daily_budget, weekly_budget')
      .eq('brand_market_id', brandMarketId)
      .order('updated_at', { ascending: false })
      .limit(10)

    if (campError) throw campError

    const { data: alerts, error: alertError } = await ctx.ads
      .from(ctx.adsTable('alerts'))
      .select('id, alert_type, severity, title, created_at')
      .eq('brand_market_id', brandMarketId)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(10)

    if (alertError) throw alertError

    const { count: alertsCount, error: alertCountError } = await ctx.ads
      .from(ctx.adsTable('alerts'))
      .select('id', { count: 'exact', head: true })
      .eq('brand_market_id', brandMarketId)
      .eq('is_resolved', false)

    if (alertCountError) throw alertCountError

    const { data: recRows, error: recError } = await ctx.ads
      .from(ctx.adsTable('keyword_recommendations'))
      .select('id, recommendation_type, keyword_text, impact_level, estimated_impact, status, created_at')
      .eq('brand_market_id', brandMarketId)
      .eq('status', 'pending')
      .order('estimated_impact', { ascending: false })
      .limit(10)

    if (recError) throw recError

    const { count: recommendationCount, error: recCountError } = await ctx.ads
      .from(ctx.adsTable('keyword_recommendations'))
      .select('id', { count: 'exact', head: true })
      .eq('brand_market_id', brandMarketId)
      .eq('status', 'pending')

    if (recCountError) throw recCountError

    const priorityFromImpact = (level: string | null) => {
      if (level === 'high') return 9
      if (level === 'low') return 3
      return 5
    }

    const recommendations = (recRows ?? []).map((r) => ({
      id: r.id,
      type: r.recommendation_type,
      priority: priorityFromImpact(r.impact_level),
      status: r.status,
      created_at: r.created_at,
      keyword_text: r.keyword_text,
    }))

    const data = {
      campaigns: campaigns ?? [],
      campaign_count: marketCampaignCount ?? 0,
      alerts: alerts ?? [],
      alert_count: alertsCount ?? 0,
      recommendations,
      recommendation_count: recommendationCount ?? 0,
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'])
