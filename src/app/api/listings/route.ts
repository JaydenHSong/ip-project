import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { checkSuspectListing } from '@/lib/utils/suspect-filter'
import { createClient } from '@/lib/supabase/server'
import type { CreateListingRequest } from '@/types/api'

// POST /api/listings — 리스팅 데이터 수집 (Crawler/Extension)
export const POST = withAuth(async (req, { user }) => {
  const body = (await req.json()) as CreateListingRequest

  if (!body.asin || !body.marketplace || !body.title || !body.source) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '필수 필드가 누락되었습니다. (asin, marketplace, title, source)' } },
      { status: 400 },
    )
  }

  const { is_suspect, suspect_reasons } = checkSuspectListing({
    title: body.title,
    description: body.description,
    bullet_points: body.bullet_points,
    brand: body.brand,
    seller_name: body.seller_name,
  })

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('listings')
    .insert({
      asin: body.asin,
      marketplace: body.marketplace,
      title: body.title,
      description: body.description ?? null,
      bullet_points: body.bullet_points ?? [],
      images: body.images ?? [],
      price_amount: body.price_amount ?? null,
      price_currency: body.price_currency ?? 'USD',
      seller_name: body.seller_name ?? null,
      seller_id: body.seller_id ?? null,
      brand: body.brand ?? null,
      category: body.category ?? null,
      rating: body.rating ?? null,
      review_count: body.review_count ?? null,
      is_suspect,
      suspect_reasons,
      source: body.source,
      source_campaign_id: body.source_campaign_id ?? null,
      source_user_id: body.source === 'extension' ? user.id : null,
      raw_data: body.raw_data ?? null,
    })
    .select('id, asin, is_suspect, suspect_reasons, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: { code: 'DUPLICATE_LISTING', message: '이미 수집된 리스팅입니다 (동일 ASIN+마켓+날짜).' } },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json(data, { status: 201 })
}, ['owner', 'admin', 'editor'])

// GET /api/listings — 리스팅 목록 조회 (필터/페이징)
export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
  const offset = (page - 1) * limit

  const marketplace = searchParams.get('marketplace')
  const source = searchParams.get('source')
  const isSuspect = searchParams.get('is_suspect')
  const search = searchParams.get('search')
  const campaignId = searchParams.get('campaign_id')

  const supabase = await createClient()

  let query = supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (marketplace) {
    query = query.eq('marketplace', marketplace)
  }
  if (source) {
    query = query.eq('source', source)
  }
  if (isSuspect === 'true') {
    query = query.eq('is_suspect', true)
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,asin.ilike.%${search}%`)
  }
  if (campaignId) {
    query = query.eq('source_campaign_id', campaignId)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({
    listings: data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
