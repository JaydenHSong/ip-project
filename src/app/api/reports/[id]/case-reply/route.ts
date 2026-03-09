import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

type CaseReplyRequest = {
  text: string
  attachments?: Array<{ name: string; storage_path: string; size: number }>
}

// POST /api/reports/[id]/case-reply — 답장 텍스트 + 첨부파일 등록 (pending 상태)
export const POST = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.indexOf('reports') + 1]

  if (!id) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ID required' } }, { status: 400 })
  }

  const body = (await req.json()) as CaseReplyRequest

  if (!body.text?.trim()) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Reply text is required' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
  }

  // 리포트 확인 — br_case_id가 있어야 답장 가능
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id, br_case_id, br_case_status, br_reply_pending_text')
    .eq('id', id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Report not found' } }, { status: 404 })
  }

  if (!report.br_case_id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'No BR case ID — cannot reply' } },
      { status: 400 },
    )
  }

  if (report.br_reply_pending_text) {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: 'A reply is already pending delivery' } },
      { status: 409 },
    )
  }

  // 파일 첨부 검증 (BR 제한: 6파일, 합계 10MB)
  const attachments = body.attachments ?? []
  if (attachments.length > 6) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Maximum 6 files allowed' } },
      { status: 400 },
    )
  }
  const totalSize = attachments.reduce((sum, a) => sum + (a.size || 0), 0)
  if (totalSize > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Total file size exceeds 10MB limit' } },
      { status: 400 },
    )
  }

  // pending 답장 저장
  const { error: updateError } = await supabase
    .from('reports')
    .update({
      br_reply_pending_text: body.text.trim(),
      br_reply_pending_attachments: body.attachments ?? [],
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
    event_type: 'br_reply_sent',
    new_value: 'Reply queued for delivery',
    metadata: { text_length: body.text.trim().length, attachments: (body.attachments ?? []).length },
    actor_id: authUser.id,
  })

  return NextResponse.json({ status: 'ok', message: 'Reply queued for delivery' }, { status: 201 })
}, ['owner', 'admin', 'editor'])
