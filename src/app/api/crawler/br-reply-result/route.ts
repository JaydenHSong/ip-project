import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ReplyResultRequest = {
  report_id: string
  br_case_id: string
  success: boolean
  error?: string
  sent_at?: string
}

// POST /api/crawler/br-reply-result — Crawler가 답장 발송 결과 보고
export const POST = async (req: Request) => {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const serviceToken = process.env.CRAWLER_SERVICE_TOKEN

  if (!serviceToken || token !== serviceToken) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid service token' } },
      { status: 401 },
    )
  }

  const body = (await req.json()) as ReplyResultRequest

  if (!body.report_id || !body.br_case_id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'report_id and br_case_id required' } },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const now = body.sent_at ?? new Date().toISOString()

  // 리포트 조회 (pending 텍스트 필요)
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id, br_reply_pending_text, br_reply_pending_attachments')
    .eq('id', body.report_id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Report not found' } },
      { status: 404 },
    )
  }

  if (body.success) {
    // 1. br_case_messages에 outbound 메시지 저장
    if (report.br_reply_pending_text) {
      await supabase.from('br_case_messages').insert({
        report_id: body.report_id,
        br_case_id: body.br_case_id,
        direction: 'outbound',
        sender: 'Sentinel',
        body: report.br_reply_pending_text,
        attachments: report.br_reply_pending_attachments ?? [],
        sent_at: now,
      })
    }

    // 2. pending 필드 클리어 + 마지막 답장 시간 갱신
    await supabase
      .from('reports')
      .update({
        br_reply_pending_text: null,
        br_reply_pending_attachments: null,
        br_last_our_reply_at: now,
      })
      .eq('id', body.report_id)

    // 3. 이벤트 기록
    await supabase.from('br_case_events').insert({
      report_id: body.report_id,
      event_type: 'br_reply_sent',
      new_value: 'Reply delivered successfully',
      metadata: { br_case_id: body.br_case_id, sent_at: now },
    })

    return NextResponse.json({ status: 'ok', delivered: true })
  } else {
    // 실패 — 이벤트만 기록, pending 유지 (재시도 가능)
    await supabase.from('br_case_events').insert({
      report_id: body.report_id,
      event_type: 'br_reply_sent',
      new_value: `Reply delivery failed: ${body.error ?? 'Unknown error'}`,
      metadata: { br_case_id: body.br_case_id, error: body.error },
    })

    return NextResponse.json({ status: 'ok', delivered: false, error: body.error })
  }
}
