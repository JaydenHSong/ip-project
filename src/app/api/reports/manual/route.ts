import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import type { ManualReportRequest } from '@/types/api'

// POST /api/reports/manual — 웹 수동 신고 생성
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = (await req.json()) as ManualReportRequest

  if (!body.asin) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ASIN은 필수입니다.' } },
      { status: 400 },
    )
  }

  const marketplace = body.marketplace || 'US'
  const supabase = await createClient()

  // 1. 리스팅 조회 (listing_id 직접 전달 시 skip)
  let listingId: string
  let isNewListing = false

  if (body.listing_id) {
    listingId = body.listing_id
  } else {
    const { data: existingListing } = await supabase
      .from('listings')
      .select('id')
      .eq('asin', body.asin)
      .eq('marketplace', marketplace)
      .limit(1)
      .single()

    if (existingListing) {
      listingId = existingListing.id
    } else {
      const { data: newListing, error: insertError } = await supabase
        .from('listings')
        .insert({
          asin: body.asin,
          marketplace,
          title: body.title || body.asin,
          seller_name: body.seller_name || null,
          source: 'manual',
        })
        .select('id')
        .single()

      if (insertError || !newListing) {
        return NextResponse.json(
          { error: { code: 'DB_ERROR', message: insertError?.message ?? 'Failed to create listing' } },
          { status: 500 },
        )
      }

      listingId = newListing.id
      isNewListing = true
    }
  }

  // 2. 중복 신고 체크 (F26) — violation type 있을 때만
  if (body.user_violation_type) {
    const { data: duplicate } = await supabase
      .from('reports')
      .select('id, status')
      .eq('listing_id', listingId)
      .eq('user_violation_type', body.user_violation_type)
      .not('status', 'in', '("cancelled","resolved")')
      .limit(1)

    if (duplicate && duplicate.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_REPORT',
            message: '이미 활성 신고가 있습니다.',
            details: { existing_report_id: duplicate[0].id },
          },
        },
        { status: 409 },
      )
    }
  }

  // 4. listing_snapshot 생성 (검색용)
  const { data: listingData } = await supabase
    .from('listings')
    .select('asin, title, marketplace, seller_name')
    .eq('id', listingId)
    .single()

  const listingSnapshot = listingData ?? {
    asin: body.asin,
    title: body.title || body.asin,
    marketplace,
    seller_name: body.seller_name || null,
  }

  // 5. 신고 생성
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .insert({
      listing_id: listingId,
      listing_snapshot: listingSnapshot,
      ...(body.user_violation_type ? { user_violation_type: body.user_violation_type } : {}),
      ...(body.violation_category ? { violation_category: body.violation_category } : {}),
      ...(body.br_form_type ? { br_form_type: body.br_form_type } : {}),
      note: body.note || null,
      screenshot_url: body.screenshot_url || null,
      screenshot_urls: body.screenshot_urls || null,
      related_asins: body.related_asins ?? [],
      status: 'draft',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (reportError || !report) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: reportError?.message ?? 'Failed to create report' } },
      { status: 500 },
    )
  }

  // 6. sentinel-fetch 트리거 (정보 누락 시 백그라운드 크롤링)
  let fetchRequested = false
  const needsFetch = !listingData?.title || listingData.title === body.asin || !listingData?.seller_name
  const fetchUrl = process.env['SENTINEL_FETCH_URL']

  if (needsFetch && fetchUrl) {
    fetch(`${fetchUrl}/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-token': process.env['SENTINEL_SERVICE_TOKEN'] ?? '',
      },
      body: JSON.stringify({ listing_id: listingId, asin: body.asin, marketplace }),
    }).catch(() => {})
    fetchRequested = true
  }

  // 7. AI 분석 트리거 (fire-and-forget)
  const baseUrl = req.nextUrl.origin
  fetch(`${baseUrl}/api/ai/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: req.headers.get('cookie') ?? '',
    },
    body: JSON.stringify({ listing_id: listingId }),
  }).catch(() => {})

  return NextResponse.json(
    {
      report_id: report.id,
      listing_id: listingId,
      is_new_listing: isNewListing,
      fetch_requested: fetchRequested,
    },
    { status: 201 },
  )
}, ['owner', 'admin', 'editor'])
