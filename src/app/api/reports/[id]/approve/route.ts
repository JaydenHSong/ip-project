import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { notifyApproved } from '@/lib/notifications/google-chat'
import { buildPdSubmitData } from '@/lib/reports/pd-data'
import { buildBrSubmitData, isBrReportable } from '@/lib/reports/br-data'
import type { BrExtraFields } from '@/lib/reports/br-data'
import type { ApproveReportRequest } from '@/types/api'
import type { BrFormType } from '@/types/reports'

// POST /api/reports/:id/approve — 승인 → pd_submitting 자동 전환
export const POST = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as ApproveReportRequest & {
    br_form_type?: BrFormType
    br_extra_fields?: BrExtraFields
  }
  const supabase = await createClient()

  // 현재 상태 확인
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('status, draft_body, draft_title, draft_subject, draft_evidence, original_draft_body, listing_id, user_violation_type')
    .eq('id', id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '신고를 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  if (report.status !== 'draft' && report.status !== 'pending_review') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '승인할 수 없는 상태입니다.' } },
      { status: 400 },
    )
  }

  // Listing 조회 (PD 데이터 빌드용)
  const { data: listing } = await supabase
    .from('listings')
    .select('asin, marketplace, title, url, seller_storefront_url')
    .eq('id', report.listing_id)
    .single()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  const now = new Date().toISOString()

  // PD 데이터 준비
  const pdSubmitData = listing
    ? buildPdSubmitData({
        report: {
          id,
          user_violation_type: report.user_violation_type,
          draft_body: body.edited_draft_body ?? report.draft_body,
          draft_evidence: report.draft_evidence as { type: string; url: string; description: string }[] | undefined,
        },
        listing,
      })
    : null

  // BR 데이터 준비 (BR 대상 위반 유형인 경우에만)
  const brSubmitData = listing && isBrReportable(report.user_violation_type)
    ? buildBrSubmitData({
        report: {
          id,
          user_violation_type: report.user_violation_type,
          draft_body: body.edited_draft_body ?? report.draft_body,
          draft_title: body.edited_draft_title ?? report.draft_title,
        },
        listing: { asin: listing.asin, url: listing.url ?? null, marketplace: listing.marketplace, seller_storefront_url: listing.seller_storefront_url },
        formTypeOverride: body.br_form_type,
        extraFields: body.br_extra_fields,
      })
    : null

  const updates: Record<string, unknown> = {
    status: 'pd_submitting',
    approved_by: authUser!.id,
    approved_at: now,
    pd_submit_data: pdSubmitData,
    br_submit_data: brSubmitData,
  }

  // 프론트에서 보낸 draft 필드 항상 반영 (autoSave 누락 방지)
  if (body.edited_draft_body !== undefined) updates.draft_body = body.edited_draft_body
  if (body.edited_draft_title !== undefined) updates.draft_title = body.edited_draft_title
  if (body.edited_draft_subject !== undefined) updates.draft_subject = body.edited_draft_subject

  // 직접 수정 후 승인한 경우 — 원본 보존 + 수정 이력
  const wasEdited = (body.edited_draft_body && body.edited_draft_body !== report.draft_body)
    || (body.edited_draft_title && body.edited_draft_title !== report.draft_title)
    || (body.edited_draft_subject !== undefined && body.edited_draft_subject !== report.draft_subject)
  if (wasEdited) {
    updates.original_draft_body = report.original_draft_body ?? report.draft_body
    updates.edited_by = authUser!.id
    updates.edited_at = now
  }

  const { data, error } = await supabase
    .from('reports')
    .update(updates)
    .eq('id', id)
    .select('id, status, approved_at')
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  // 알림 (fire-and-forget)
  notifyApproved(id, listing?.asin ?? 'N/A').catch(() => {})

  // Opus 학습 트리거 (fire-and-forget): 수정된 경우에만
  const hasOriginal = !!report.original_draft_body
  const bodyChanged = hasOriginal && report.original_draft_body !== report.draft_body
  if (wasEdited || bodyChanged) {
    const baseUrl = req.nextUrl.origin
    fetch(`${baseUrl}/api/ai/learn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: req.headers.get('cookie') ?? '',
      },
      body: JSON.stringify({ report_id: id }),
    }).catch(() => {})
  }

  return NextResponse.json({ ...data, was_edited: wasEdited })
}, ['owner', 'admin', 'editor'])
