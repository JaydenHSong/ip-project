import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { notifyApproved } from '@/lib/notifications/google-chat'
import type { ApproveReportRequest } from '@/types/api'

// POST /api/reports/:id/approve — 승인
export const POST = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as ApproveReportRequest
  const supabase = await createClient()

  // 현재 상태 확인
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('status, draft_body, draft_title, original_draft_body, listing_id')
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

  const { data: { user: authUser } } = await supabase.auth.getUser()
  const now = new Date().toISOString()

  const updates: Record<string, unknown> = {
    status: 'approved',
    approved_by: authUser!.id,
    approved_at: now,
  }

  // 직접 수정 후 승인한 경우
  const wasEdited = !!body.edited_draft_body || !!body.edited_draft_title
  if (wasEdited) {
    updates.original_draft_body = report.draft_body
    updates.edited_by = authUser!.id
    updates.edited_at = now
    if (body.edited_draft_body) updates.draft_body = body.edited_draft_body
    if (body.edited_draft_title) updates.draft_title = body.edited_draft_title
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
  const { data: listing } = await supabase
    .from('listings')
    .select('asin')
    .eq('id', report.listing_id)
    .single()

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
