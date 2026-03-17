import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { notifyDraftReady } from '@/lib/notifications/google-chat'

// POST /api/reports/:id/submit-review — draft/rejected → pending_review
export const POST = withAuth(async (req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  // 현재 상태 확인
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('status, draft_title, draft_body, listing_id, user_violation_type')
    .eq('id', id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '신고를 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  const allowedStatuses = ['draft', 'rejected']
  if (!allowedStatuses.includes(report.status)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '검토 요청할 수 없는 상태입니다.' } },
      { status: 400 },
    )
  }

  if (!report.draft_title?.trim() || !report.draft_body?.trim()) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '드래프트 제목과 본문이 필요합니다.' } },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('reports')
    .update({
      status: 'pending_review',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, status, updated_at')
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

  // 드래프트 알림 제거 — 에러 시에만 알림

  return NextResponse.json(data)
}, ['owner', 'admin', 'editor'])
