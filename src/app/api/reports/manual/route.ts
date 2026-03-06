import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import type { ManualReportRequest } from '@/types/api'

// POST /api/reports/manual — 웹 수동 신고 생성
export const POST = withAuth(async (req: NextRequest) => {
  const body = (await req.json()) as ManualReportRequest

  if (!body.asin || !body.user_violation_type || !body.violation_category) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ASIN, 위반 유형, 위반 카테고리는 필수입니다.' } },
      { status: 400 },
    )
  }

  const marketplace = body.marketplace || 'US'
  const supabase = await createClient()

  // 1. 리스팅 조회 (asin + marketplace)
  const { data: existingListing } = await supabase
    .from('listings')
    .select('id')
    .eq('asin', body.asin)
    .eq('marketplace', marketplace)
    .limit(1)
    .single()

  let listingId: string
  let isNewListing = false

  if (existingListing) {
    listingId = existingListing.id
  } else {
    // 리스팅 자동 생성
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

  // 2. 중복 신고 체크 (F26)
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

  // 3. 사용자 ID
  const { data: { user: authUser } } = await supabase.auth.getUser()

  // 4. 신고 생성
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .insert({
      listing_id: listingId,
      user_violation_type: body.user_violation_type,
      violation_category: body.violation_category,
      note: body.note || null,
      screenshot_url: body.screenshot_url || null,
      screenshot_urls: body.screenshot_urls || null,
      related_asins: body.related_asins ?? [],
      status: 'draft',
      created_by: authUser!.id,
    })
    .select('id')
    .single()

  if (reportError || !report) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: reportError?.message ?? 'Failed to create report' } },
      { status: 500 },
    )
  }

  // 5. AI 분석 트리거 (fire-and-forget)
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
      is_duplicate: false,
    },
    { status: 201 },
  )
}, ['owner', 'admin', 'editor'])
