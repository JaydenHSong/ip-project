import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { RESOLUTION_TYPES } from '@/types/reports'

// POST /api/reports/:id/resolve
// 신고 해결/미해결 확정
export const POST = withAuth(async (req, { user }) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const body = await req.json().catch(() => ({})) as { resolution_type?: string }

  if (!body.resolution_type || !RESOLUTION_TYPES.includes(body.resolution_type as typeof RESOLUTION_TYPES[number])) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '유효한 resolution_type이 필요합니다.' } },
      { status: 400 },
    )
  }

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

  if (report.status !== 'monitoring') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'monitoring 상태의 신고만 해결 가능합니다.' } },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()
  const newStatus = body.resolution_type === 'no_change' ? 'unresolved' : 'resolved'

  const { data, error } = await supabase
    .from('reports')
    .update({
      status: newStatus,
      resolution_type: body.resolution_type,
      resolved_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select('id, status, resolved_at, resolution_type')
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  void supabase
    .from('audit_logs')
    .insert({
      user_id: user.id,
      action: 'monitoring_resolved',
      resource_type: 'report',
      resource_id: id,
      details: { resolution_type: body.resolution_type, status: newStatus },
    })

  return NextResponse.json(data)
}, ['editor', 'admin'])
