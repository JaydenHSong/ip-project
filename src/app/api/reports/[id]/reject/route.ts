import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { notifyRejected } from '@/lib/notifications/google-chat'
import type { RejectReportRequest } from '@/types/api'

// POST /api/reports/:id/reject — 반려
export const POST = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const body = (await req.json()) as RejectReportRequest

  if (!body.rejection_reason || !body.rejection_category) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '반려 사유와 카테고리는 필수입니다.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  // 현재 상태 확인
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('status, listing_id')
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
      { error: { code: 'VALIDATION_ERROR', message: '반려할 수 없는 상태입니다.' } },
      { status: 400 },
    )
  }

  const { data: { user: authUser } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('reports')
    .update({
      status: 'rejected',
      rejected_by: authUser!.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: body.rejection_reason,
      rejection_category: body.rejection_category,
    })
    .eq('id', id)
    .select('id, status, rejected_at')
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

  // 반려 알림 제거 — 에러 시에만 알림

  return NextResponse.json(data)
}, ['owner', 'admin', 'editor'])
