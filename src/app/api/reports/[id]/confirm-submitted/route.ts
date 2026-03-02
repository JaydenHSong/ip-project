import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// POST /api/reports/:id/confirm-submitted
// Extension이 SC 제출 완료 후 case ID와 함께 확인 콜백
export const POST = withAuth(async (req, { user }) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const body = await req.json().catch(() => ({})) as { sc_case_id?: string }

  const supabase = await createClient()

  // 현재 상태 확인
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

  if (report.status !== 'submitted') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'submitted 상태의 신고만 확인 가능합니다.' } },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()

  const updateData: Record<string, unknown> = {
    sc_submit_data: null, // 사용 완료 클리어
    updated_at: now,
  }

  if (body.sc_case_id) {
    updateData.sc_case_id = body.sc_case_id
  }

  const { data, error } = await supabase
    .from('reports')
    .update(updateData)
    .eq('id', id)
    .select('id, status, sc_case_id')
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  // 감사 로그 (fire-and-forget)
  void supabase
    .from('audit_logs')
    .insert({
      user_id: user.id,
      action: 'submitted_sc',
      entity_type: 'report',
      entity_id: id,
      details: body.sc_case_id ? { sc_case_id: body.sc_case_id } : null,
    })

  return NextResponse.json(data)
}, ['editor', 'admin'])
