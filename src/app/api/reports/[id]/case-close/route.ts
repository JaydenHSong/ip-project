import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// POST /api/reports/[id]/case-close — 케이스 닫기 요청
export const POST = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.indexOf('reports') + 1]

  if (!id) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ID required' } }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
  }

  // 리포트 확인
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id, br_case_id, br_case_status')
    .eq('id', id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Report not found' } }, { status: 404 })
  }

  const body = await req.json().catch(() => ({})) as { resolution?: string }
  const resolvedStatus = body.resolution === 'unresolved' ? 'unresolved' : 'resolved'

  if (report.br_case_status === 'closed') {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: 'Case is already closed' } },
      { status: 409 },
    )
  }

  // br_case_status → closed, reports.status → resolved
  // TODO: Phase 3에서 Crawler 경유로 전환 — Crawler가 BR에서 "Close this case" 클릭 후 콜백
  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('reports')
    .update({
      br_case_status: 'closed',
      status: resolvedStatus,
      resolved_at: now,
      resolution_type: resolvedStatus === 'resolved' ? 'content_modified' : 'no_change',
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: updateError.message } },
      { status: 500 },
    )
  }

  // 이벤트 기록
  await supabase.from('br_case_events').insert({
    report_id: id,
    event_type: 'br_case_closed',
    old_value: report.br_case_status,
    new_value: 'closed',
    metadata: { closed_by: 'user' },
    actor_id: authUser.id,
  })

  return NextResponse.json({ status: 'ok', message: 'Case closed' })
}, ['owner', 'admin', 'editor'])
