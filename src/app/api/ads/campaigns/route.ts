// GET /api/ads/campaigns — Campaign list (S03)
// POST /api/ads/campaigns — Create campaign (M01)
// Design Ref: §4.2

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCampaigns, getCampaignKpiSummary, createCampaign } from '@/modules/ads/features/campaigns/queries'
import type { CampaignListQuery, CreateCampaignRequest } from '@/modules/ads/features/campaigns/types'

// ─── GET: List campaigns ───

export const GET = withAuth(async (req, { user }) => {
  const url = new URL(req.url)
  const brandMarketId = url.searchParams.get('brand_market_id')

  if (!brandMarketId) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'brand_market_id is required' } },
      { status: 400 },
    )
  }

  // Check if KPI summary is requested
  const includeKpi = url.searchParams.get('include_kpi') === 'true'

  // Resolve "me" to current user ID for personal/team toggle
  const assignedToRaw = url.searchParams.get('assigned_to') || undefined
  const assignedTo = assignedToRaw === 'me' ? user.id : assignedToRaw

  const query: CampaignListQuery = {
    brand_market_id: brandMarketId,
    mode: (url.searchParams.get('mode') as CampaignListQuery['mode']) || undefined,
    status: (url.searchParams.get('status') as CampaignListQuery['status']) || undefined,
    assigned_to: assignedTo,
    search: url.searchParams.get('search') || undefined,
    sort_by: url.searchParams.get('sort_by') || undefined,
    sort_dir: (url.searchParams.get('sort_dir') as 'asc' | 'desc') || undefined,
    page: url.searchParams.get('page') ? Number(url.searchParams.get('page')) : undefined,
    limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
  }

  try {
    const result = await getCampaigns(query)

    let kpi = null
    if (includeKpi) {
      kpi = await getCampaignKpiSummary(brandMarketId)
    }

    return NextResponse.json({ ...result, kpi })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'])

// ─── POST: Create campaign ───

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json() as CreateCampaignRequest

  // Validate required fields
  if (!body.brand_market_id || !body.campaign_type || !body.mode || !body.name) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Missing required fields: brand_market_id, campaign_type, mode, name' } },
      { status: 400 },
    )
  }

  if (body.target_acos < 1 || body.target_acos > 100) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'target_acos must be between 1 and 100' } },
      { status: 400 },
    )
  }

  try {
    // Resolve user's org_unit from user_org_units
    const supabase = createAdminClient()
    const { data: orgLink } = await supabase
      .from('user_org_units')
      .select('org_unit_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    const orgUnitId = orgLink?.org_unit_id ?? user.id

    // Get marketplace_profile_id for this brand_market
    // For now, use brand_market_id — real mapping from ads.marketplace_profiles
    const marketplaceProfileId = body.brand_market_id // TODO: resolve from marketplace_profiles

    const data = await createCampaign({
      org_unit_id: orgUnitId,
      brand_market_id: body.brand_market_id,
      marketplace_profile_id: marketplaceProfileId,
      campaign_type: body.campaign_type,
      mode: body.mode,
      marketing_code: body.marketing_code,
      name: body.name,
      target_acos: body.target_acos,
      daily_budget: body.daily_budget,
      weekly_budget: body.weekly_budget,
      max_bid_cap: body.max_bid_cap,
      created_by: user.id,
      keywords: body.keywords,
      negative_keywords: body.negative_keywords,
      product_asins: body.product_asins,
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])
