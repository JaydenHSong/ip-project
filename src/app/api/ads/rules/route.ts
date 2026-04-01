// GET /api/ads/rules — Rule list
// POST /api/ads/rules — Create rule

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── GET: List rules ───

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
      .from('ads.rules')
      .select('*', { count: 'exact' })
      .eq('brand_market_id', brandMarketId)

    const status = url.searchParams.get('status')
    if (status) {
      query = query.eq('status', status)
    }

    const ruleType = url.searchParams.get('rule_type')
    if (ruleType) {
      query = query.eq('rule_type', ruleType)
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

// ─── POST: Create rule ───

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json() as {
    brand_market_id: string
    rule_type: string
    name: string
    conditions: unknown
    actions: unknown
    priority?: number
  }

  if (!body.brand_market_id || !body.rule_type || !body.name || !body.conditions || !body.actions) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'brand_market_id, rule_type, name, conditions, and actions are required' } },
      { status: 400 },
    )
  }

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ads.rules')
      .insert({
        brand_market_id: body.brand_market_id,
        rule_type: body.rule_type,
        name: body.name,
        conditions: body.conditions,
        actions: body.actions,
        priority: body.priority ?? 0,
        status: 'active',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])
