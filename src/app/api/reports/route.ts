import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import type { CreateReportRequest } from '@/types/api'

// GET /api/reports — 신고 대기열 목록
export const GET = withAuth(async (req) => {
  const url = req.nextUrl
  const page = Number(url.searchParams.get('page')) || 1
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100)
  const offset = (page - 1) * limit

  const status = url.searchParams.get('status')
  const violationType = url.searchParams.get('violation_type')
  const disagreementOnly = url.searchParams.get('disagreement') === 'true'
  const search = url.searchParams.get('search')

  const supabase = await createClient()

  let query = supabase
    .from('reports')
    .select(
      '*, listings!reports_listing_id_fkey(asin, title, marketplace, seller_name), users!reports_created_by_fkey(name)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }
  if (violationType) {
    query = query.eq('violation_type', violationType)
  }
  if (disagreementOnly) {
    query = query.eq('disagreement_flag', true)
  }
  if (search) {
    query = query.or(`draft_title.ilike.%${search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({
    data: data ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  })
}, ['admin', 'editor', 'viewer'])

// POST /api/reports — 신고 생성
export const POST = withAuth(async (req) => {
  const body = (await req.json()) as CreateReportRequest
  const { listing_id, user_violation_type, violation_category, note } = body

  if (!listing_id || !user_violation_type || !violation_category) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '필수 필드가 누락되었습니다.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  // 리스팅 확인
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id')
    .eq('id', listing_id)
    .single()

  if (listingError || !listing) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '리스팅을 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  // 중복 신고 확인 (F26): 동일 listing + 동일 위반 유형 + 활성 상태
  const { data: existing } = await supabase
    .from('reports')
    .select('id, status')
    .eq('listing_id', listing_id)
    .eq('user_violation_type', user_violation_type)
    .not('status', 'in', '("cancelled","resolved")')
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: 'DUPLICATE_REPORT',
          message: '이미 활성 신고가 있습니다.',
          details: { existing_report_id: existing[0].id },
        },
      },
      { status: 409 },
    )
  }

  // 사용자 ID
  const { data: { user: authUser } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('reports')
    .insert({
      listing_id,
      user_violation_type,
      violation_category,
      status: 'draft',
      created_by: authUser!.id,
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
}, ['admin', 'editor'])
