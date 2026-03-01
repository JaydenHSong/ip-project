import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// POST /api/reports/:id/cancel — 취소
export const POST = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const cancellationReason = (body as { cancellation_reason?: string }).cancellation_reason

  const supabase = await createClient()

  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '신고를 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  const cancellableStatuses = ['draft', 'pending_review', 'approved']
  if (!cancellableStatuses.includes(report.status)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '취소할 수 없는 상태입니다.' } },
      { status: 400 },
    )
  }

  const { data: { user: authUser } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('reports')
    .update({
      status: 'cancelled',
      cancelled_by: authUser!.id,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: cancellationReason ?? null,
    })
    .eq('id', id)
    .select('id, status, cancelled_at')
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json(data)
}, ['admin', 'editor'])
