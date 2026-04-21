// GET /api/ads/keywords — Keyword list by campaign
// POST /api/ads/keywords — Bulk create keywords

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'

// ─── GET: List keywords by campaign ───

export const GET = withAuth(async (req) => {
  const url = new URL(req.url)
  const campaignId = url.searchParams.get('campaign_id')

  if (!campaignId) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'campaign_id is required' } },
      { status: 400 },
    )
  }

  try {
    const ctx = createAdsAdminContext()

    let query =ctx.ads
      .from(ctx.adsTable('keywords'))
      .select('*', { count: 'exact' })
      .eq('campaign_id', campaignId)

    const state = url.searchParams.get('state')
    if (state) {
      query = query.eq('state', state)
    }

    const matchType = url.searchParams.get('match_type')
    if (matchType) {
      query = query.eq('match_type', matchType)
    }

    const search = url.searchParams.get('search')
    if (search) {
      query = query.ilike('keyword_text', `%${search}%`)
    }

    const sortBy = url.searchParams.get('sort_by') || 'created_at'
    const sortDir = url.searchParams.get('sort_dir') === 'asc'
    query = query.order(sortBy, { ascending: sortDir })

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

// ─── POST: Bulk create keywords ───

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json() as {
    campaign_id: string
    keywords: Array<{
      keyword_text: string
      match_type: 'broad' | 'phrase' | 'exact'
      bid: number
      state?: string
    }>
  }

  if (!body.campaign_id || !body.keywords?.length) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'campaign_id and keywords array are required' } },
      { status: 400 },
    )
  }

  try {
    const ctx = createAdsAdminContext()

    const rows = body.keywords.map((kw) => ({
      campaign_id: body.campaign_id,
      keyword_text: kw.keyword_text,
      match_type: kw.match_type,
      bid: kw.bid,
      state: kw.state || 'enabled',
      created_by: user.id,
    }))

    const { data, error } = await ctx.ads
      .from(ctx.adsTable('keywords'))
      .insert(rows)
      .select()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])
