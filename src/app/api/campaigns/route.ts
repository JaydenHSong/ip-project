import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import type { CreateCampaignRequest } from '@/types/api'

// GET /api/campaigns — 캠페인 목록
export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
  const offset = (page - 1) * limit
  const status = searchParams.get('status')
  const marketplace = searchParams.get('marketplace')

  const supabase = await createClient()

  let query = supabase
    .from('campaigns')
    .select('*, users!campaigns_created_by_fkey(name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }
  if (marketplace) {
    query = query.eq('marketplace', marketplace)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({
    campaigns: data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])

// POST /api/campaigns — 캠페인 생성
export const POST = withAuth(async (req, { user }) => {
  const body = (await req.json()) as CreateCampaignRequest

  if (!body.keyword || !body.start_date) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '필수 필드가 누락되었습니다. (keyword, start_date)' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      keyword: body.keyword,
      marketplace: body.marketplace ?? 'US',
      start_date: body.start_date,
      end_date: body.end_date ?? null,
      frequency: body.frequency ?? 'daily',
      max_pages: body.max_pages ?? 3,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json(data, { status: 201 })
}, ['owner', 'admin', 'editor'])
