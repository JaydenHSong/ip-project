import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'
import { VIOLATION_TYPES, VIOLATION_CATEGORIES } from '@/constants/violations'
import type { SubmitReportRequest, SubmitReportResponse } from '@/types/api'

const VALID_VIOLATION_CODES = new Set(Object.keys(VIOLATION_TYPES))
const VALID_CATEGORIES = new Set(Object.keys(VIOLATION_CATEGORIES))
// 신규 카테고리는 violation_type으로도 사용 (category = violation_type)
const NEW_CATEGORY_TYPES = new Set(['variation', 'main_image', 'wrong_category', 'pre_announcement', 'review_violation'])
// 신규 카테고리 → V코드 매핑 (DB CHECK constraint: '^V[0-9]{2}$')
const CATEGORY_TO_VCODE: Record<string, string> = {
  variation: 'V10',
  main_image: 'V08',
  wrong_category: 'V07',
  pre_announcement: 'V07',
  review_violation: 'V11',
}
const MAX_SCREENSHOT_BASE64_LENGTH = 3_000_000 // ~2.25MB decoded (구버전 익스텐션 호환)

// POST /api/ext/submit-report — Extension에서 위반 제보 제출
export const POST = withAuth(async (req, { user }) => {
  const body = (await req.json()) as SubmitReportRequest
  const { asin, marketplace, title, violation_type, violation_category, extra_fields } = body

  // 필수 필드 검증
  if (!asin || !marketplace || !title || !violation_type || !violation_category) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Missing required fields: asin, marketplace, title, violation_type, violation_category' } },
      { status: 400 },
    )
  }

  // 위반 유형 유효성 검증 — V코드 또는 신규 카테고리명 허용
  if (!VALID_VIOLATION_CODES.has(violation_type) && !NEW_CATEGORY_TYPES.has(violation_type)) {
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

  // 2. 중복 신고 확인 — 21일 이내 활성 리포트만 중복으로 간주
  const cutoffDate = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
  const { data: duplicates } = await supabase
    .from('reports')
    .select('id')
    .eq('listing_id', listingId)
    .not('status', 'in', '("cancelled","resolved")')
    .gte('created_at', cutoffDate)
    .limit(1)

  const isDuplicate = (duplicates?.length ?? 0) > 0

  // 3. 21일 이내 동일 listing+violation 활성 리포트 → 차단
  const dbViolationType = CATEGORY_TO_VCODE[violation_type] ?? violation_type

  if (isDuplicate) {
    const { data: recentActive } = await supabase
      .from('reports')
      .select('id')
      .eq('listing_id', listingId)
      .eq('user_violation_type', dbViolationType)
      .not('status', 'in', '("cancelled","resolved")')
      .gte('created_at', cutoffDate)
      .limit(1)

    if ((recentActive?.length ?? 0) > 0) {
      return NextResponse.json(
        { error: { code: 'DUPLICATE_REPORT', message: 'An active report already exists for this listing (within 21 days).' } },
        { status: 409 },
      )
    }
  }

  // 4. Report 생성 — 신규 카테고리는 V코드로 변환 (DB CHECK constraint)
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .insert({
      listing_id: listingId,
      user_violation_type: dbViolationType,
      violation_category,
      status: 'draft',
      created_by: user.id,
      note: extra_fields ? JSON.stringify(extra_fields) : (body.note ?? null),
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

  // 5. 스크린샷 업로드 (있으면) — 디버그 정보 수집
  let screenshotReceived = false
  let screenshotSize = 0
  let screenshotUploaded = false
  let screenshotError: string | null = null

  if (body.screenshot_base64) {
    screenshotReceived = true
    screenshotSize = body.screenshot_base64.length

    const base64Data = body.screenshot_base64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Extension 스크린샷 MIME 타입 자동 감지 (webp/jpeg/png)
    const mimeMatch = body.screenshot_base64.match(/^data:(image\/\w+);base64,/)
    const detectedMime = mimeMatch?.[1] ?? 'image/webp'
    const ext = detectedMime === 'image/jpeg' ? 'jpg' : detectedMime === 'image/png' ? 'png' : 'webp'
    const contentType = detectedMime
    const filePath = `${report.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      screenshotError = uploadError.message
      console.error(`[submit-report] Screenshot upload failed for report ${report.id}:`, uploadError.message)
    } else {
      screenshotUploaded = true
      const { data: publicUrl } = supabase.storage
        .from('screenshots')
        .getPublicUrl(filePath)

      await supabase
        .from('reports')
        .update({ screenshot_url: publicUrl.publicUrl })
        .eq('id', report.id)
    }
  }

  // 6. AI 분석 자동 트리거 (FR-02: fire-and-forget)
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

  const response: SubmitReportResponse & {
    screenshot_received?: boolean
    screenshot_size?: number
    screenshot_uploaded?: boolean
    screenshot_error?: string | null
  } = {
    report_id: report.id,
    listing_id: listingId,
    is_duplicate: isDuplicate,
    screenshot_received: screenshotReceived,
    screenshot_size: screenshotSize,
    screenshot_uploaded: screenshotUploaded,
    screenshot_error: screenshotError,
  }

  return NextResponse.json(response, { status: 201 })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
