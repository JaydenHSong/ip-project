import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'
import { VIOLATION_TYPES, VIOLATION_CATEGORIES } from '@/constants/violations'
import type { SubmitReportRequest, SubmitReportResponse } from '@/types/api'

const VALID_VIOLATION_CODES = new Set(Object.keys(VIOLATION_TYPES))
const VALID_CATEGORIES = new Set(Object.keys(VIOLATION_CATEGORIES))
const MAX_SCREENSHOT_BASE64_LENGTH = 3_000_000 // ~2.25MB decoded

// POST /api/ext/submit-report — Extension에서 위반 제보 제출
export const POST = withAuth(async (req, { user }) => {
  const body = (await req.json()) as SubmitReportRequest
  const { asin, marketplace, title, violation_type, violation_category } = body

  // 필수 필드 검증
  if (!asin || !marketplace || !title || !violation_type || !violation_category) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Missing required fields: asin, marketplace, title, violation_type, violation_category' } },
      { status: 400 },
    )
  }

  // 위반 유형 유효성 검증
  if (!VALID_VIOLATION_CODES.has(violation_type)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: `Invalid violation_type: ${violation_type}` } },
      { status: 400 },
    )
  }

  if (!VALID_CATEGORIES.has(violation_category)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: `Invalid violation_category: ${violation_category}` } },
      { status: 400 },
    )
  }

  // 스크린샷 크기 제한
  if (body.screenshot_base64 && body.screenshot_base64.length > MAX_SCREENSHOT_BASE64_LENGTH) {
    return NextResponse.json(
      { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Screenshot exceeds 2MB limit' } },
      { status: 413 },
    )
  }

  // withAuth에서 인증 완료 → admin 클라이언트로 RLS 우회 (Extension Bearer 토큰 호환)
  const supabase = createAdminClient()

  // 1. 기존 listing 조회 또는 새로 생성
  const { data: existingListing } = await supabase
    .from('listings')
    .select('id')
    .eq('asin', asin)
    .eq('marketplace', marketplace)
    .limit(1)
    .single()

  let listingId: string

  if (existingListing) {
    listingId = existingListing.id
  } else {
    const images = (body.images ?? []).map((url, i) => ({
      url,
      position: i,
    }))

    const { data: newListing, error: listingError } = await supabase
      .from('listings')
      .insert({
        asin,
        marketplace,
        title,
        seller_name: body.seller_name ?? null,
        seller_id: body.seller_id ?? null,
        images,
        source: 'extension',
      })
      .select('id')
      .single()

    if (listingError || !newListing) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: listingError?.message ?? 'Failed to create listing' } },
        { status: 500 },
      )
    }

    listingId = newListing.id
  }

  // 2. 중복 신고 확인
  const { data: duplicates } = await supabase
    .from('reports')
    .select('id')
    .eq('listing_id', listingId)
    .not('status', 'in', '("cancelled","resolved")')
    .limit(1)

  const isDuplicate = (duplicates?.length ?? 0) > 0

  // 3. Report 생성
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .insert({
      listing_id: listingId,
      user_violation_type: violation_type,
      violation_category,
      status: 'draft',
      created_by: user.id,
      note: body.note ?? null,
      source: 'extension',
    })
    .select('id')
    .single()

  if (reportError || !report) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: reportError?.message ?? 'Failed to create report' } },
      { status: 500 },
    )
  }

  // 4. 스크린샷 업로드 (있으면)
  if (body.screenshot_base64) {
    const base64Data = body.screenshot_base64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Extension은 JPEG로 캡처 — MIME 타입 자동 감지
    const isJpeg = body.screenshot_base64.startsWith('data:image/jpeg')
    const ext = isJpeg ? 'jpg' : 'png'
    const contentType = isJpeg ? 'image/jpeg' : 'image/png'
    const filePath = `${report.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      console.error(`[submit-report] Screenshot upload failed for report ${report.id}:`, uploadError.message)
    } else {
      const { data: publicUrl } = supabase.storage
        .from('screenshots')
        .getPublicUrl(filePath)

      await supabase
        .from('reports')
        .update({ screenshot_url: publicUrl.publicUrl })
        .eq('id', report.id)
    }
  }

  // 5. AI 분석 자동 트리거 (FR-02: fire-and-forget)
  if (!isDuplicate) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
    fetch(`${baseUrl}/api/ai/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: req.headers.get('cookie') ?? '',
      },
      body: JSON.stringify({
        listing_id: listingId,
        async: true,
        source: 'extension',
        priority: 'high',
        violation_type: violation_type,
      }),
    }).catch(() => {})
  }

  const response: SubmitReportResponse & { screenshot_uploaded?: boolean } = {
    report_id: report.id,
    listing_id: listingId,
    is_duplicate: isDuplicate,
  }

  if (body.screenshot_base64) {
    response.screenshot_uploaded = true
  }

  return NextResponse.json(response, { status: 201 })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
