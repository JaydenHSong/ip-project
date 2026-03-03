import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'
import { notifyApproved, notifySubmittedToSC } from '@/lib/notifications/google-chat'
import { SC_VIOLATION_MAP, SC_RAV_URLS } from '@/constants/violations'
import type { ViolationCode } from '@/constants/violations'

// POST /api/reports/:id/approve-submit — pending_review → approved → submitted (원클릭)
export const POST = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  if (isDemoMode()) {
    return NextResponse.json({
      id,
      status: 'submitted',
      approved_at: new Date().toISOString(),
      sc_submitted_at: new Date().toISOString(),
      sc_rav_url: SC_RAV_URLS.US,
      sc_submit_data: {
        asin: 'B0D1234567',
        violation_type_sc: 'counterfeit',
        description: 'Demo approve & submit',
        evidence_urls: [],
        marketplace: 'US',
        prepared_at: new Date().toISOString(),
      },
    })
  }

  const supabase = await createClient()

  // report + listing 데이터 조회
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select(`
      id, status, listing_id, draft_body, draft_title, original_draft_body,
      violation_type, draft_evidence,
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

  if (report.status !== 'pending_review') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '승인 및 제출은 검토 대기 상태에서만 가능합니다.' } },
      { status: 400 },
    )
  }

  const { data: { user: authUser } } = await supabase.auth.getUser()
  const now = new Date().toISOString()

  // Step 1: Approve
  const { error: approveError } = await supabase
    .from('reports')
    .update({
      status: 'approved',
      approved_by: authUser!.id,
      approved_at: now,
    })
    .eq('id', id)

  if (approveError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: approveError.message } },
      { status: 500 },
    )
  }

  notifyApproved(id, (report.listings as unknown as { asin: string }).asin).catch(() => {})

  // Step 2: Submit to SC
  const listing = report.listings as unknown as { asin: string; marketplace: string }
  const violationType = report.violation_type as ViolationCode
  const violationTypeSc = SC_VIOLATION_MAP[violationType] ?? 'other'
  const marketplace = listing.marketplace ?? 'US'
  const scRavUrl = SC_RAV_URLS[marketplace] ?? SC_RAV_URLS.US

  const scSubmitData = {
    asin: listing.asin,
    violation_type_sc: violationTypeSc,
    description: report.draft_body ?? '',
    evidence_urls: Array.isArray(report.draft_evidence)
      ? (report.draft_evidence as { url: string }[]).map((e) => e.url).filter(Boolean)
      : [],
    marketplace,
    prepared_at: now,
  }

  const { data, error: submitError } = await supabase
    .from('reports')
    .update({
      status: 'submitted',
      sc_submitted_at: now,
      sc_submit_data: scSubmitData,
      updated_at: now,
    })
    .eq('id', id)
    .select('id, status, approved_at, sc_submitted_at')
    .single()

  if (submitError) {
    // 승인은 성공했지만 SC 제출이 실패 — approved 상태로 남겨둠
    return NextResponse.json(
      {
        error: {
          code: 'SC_SUBMIT_FAILED',
          message: '승인 완료. SC 제출 실패 — "SC 신고" 버튼으로 재시도하세요.',
        },
        partial: { approved: true, submitted: false },
      },
      { status: 500 },
    )
  }

  notifySubmittedToSC(id, listing.asin).catch(() => {})

  return NextResponse.json({
    ...data,
    sc_rav_url: scRavUrl,
    sc_submit_data: scSubmitData,
  })
}, ['editor', 'admin'])
