import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { notifySubmittedToPD } from '@/lib/notifications/google-chat'
import { SC_VIOLATION_MAP, SC_RAV_URLS } from '@/constants/violations'
import type { ViolationCode } from '@/constants/violations'

// POST /api/reports/:id/submit-pd — approved → submitted + PD submit 데이터 저장
export const POST = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  // report + listing 데이터 조회
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select(`
      id, status, listing_id, related_asins,
      violation_type, draft_body, draft_evidence,
      listings!inner(asin, marketplace)
    `)
    .eq('id', id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '신고를 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  if (report.status !== 'approved') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'PD 접수는 승인된 신고만 가능합니다.' } },
      { status: 400 },
    )
  }

  const listing = report.listings as unknown as { asin: string; marketplace: string }
  const violationType = report.violation_type as ViolationCode
  const violationTypeSc = SC_VIOLATION_MAP[violationType] ?? 'other'
  const marketplace = listing.marketplace ?? 'US'
  const scRavUrl = SC_RAV_URLS[marketplace] ?? SC_RAV_URLS.US

  // PD submit 데이터 구성
  const relatedAsins = Array.isArray(report.related_asins)
    ? (report.related_asins as { asin: string; marketplace?: string }[]).map((ra) => ra.asin)
    : []

  const pdSubmitData = {
    asin: listing.asin,
    related_asins: relatedAsins,
    violation_type_pd: violationTypeSc,
    description: report.draft_body ?? '',
    evidence_urls: Array.isArray(report.draft_evidence)
      ? (report.draft_evidence as { url: string }[])
          .map((e) => e.url)
          .filter(Boolean)
      : [],
    marketplace,
    prepared_at: new Date().toISOString(),
  }

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('reports')
    .update({
      status: 'submitted',
      pd_submitted_at: now,
      pd_submit_data: pdSubmitData,
      updated_at: now,
    })
    .eq('id', id)
    .select('id, status, pd_submitted_at')
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  // 알림 (fire-and-forget)
  notifySubmittedToPD(id, listing.asin).catch(() => {})

  return NextResponse.json({
    ...data,
    pd_rav_url: scRavUrl,
    pd_submit_data: pdSubmitData,
  })
}, ['owner', 'admin', 'editor'])
