import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateSlaDeadline, findSlaConfig } from '@/lib/br-case/sla'
import type { BrSlaConfig } from '@/types/br-case'

type MonitorResultMessage = {
  direction: 'inbound' | 'outbound'
  sender: string
  body: string
  sent_at: string
}

type MonitorResultRequest = {
  report_id: string
  br_case_id: string
  br_case_status: string
  new_messages: MonitorResultMessage[]
  last_amazon_reply_at: string | null
}

// POST /api/crawler/br-monitor-result — Crawler가 스크래핑 결과 보고
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

  const body = (await req.json()) as MonitorResultRequest

  if (!body.report_id || !body.br_case_id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'report_id and br_case_id required' } },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // 1. 리포트 존재 확인 + 현재 상태 조회
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id, status, br_case_status, user_violation_type')
    .eq('id', body.report_id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Report not found' } },
      { status: 404 },
    )
  }

  // 2. 새 메시지 저장 (br_case_messages)
  if (body.new_messages.length > 0) {
    const messageRows = body.new_messages.map((msg) => ({
      report_id: body.report_id,
      br_case_id: body.br_case_id,
      direction: msg.direction,
      sender: msg.sender,
      body: msg.body,
      attachments: [],
      sent_at: msg.sent_at,
      scraped_at: now,
    }))

    const { error: insertError } = await supabase
      .from('br_case_messages')
      .insert(messageRows)

    if (insertError) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: `Failed to insert messages: ${insertError.message}` } },
        { status: 500 },
      )
    }
  }

  // 3. 상태 변경 이벤트 기록 (br_case_events)
  const events: Array<{
    report_id: string
    event_type: string
    old_value: string | null
    new_value: string | null
    metadata: Record<string, unknown>
  }> = []

  // 상태 변경
  if (report.br_case_status !== body.br_case_status) {
    events.push({
      report_id: body.report_id,
      event_type: 'br_status_changed',
      old_value: report.br_case_status,
      new_value: body.br_case_status,
      metadata: { br_case_id: body.br_case_id },
    })
  }

  // 아마존 답장 이벤트
  const amazonMessages = body.new_messages.filter((m) => m.direction === 'inbound')
  if (amazonMessages.length > 0) {
    events.push({
      report_id: body.report_id,
      event_type: 'br_amazon_replied',
      old_value: null,
      new_value: `${amazonMessages.length} new message(s)`,
      metadata: {
        br_case_id: body.br_case_id,
        message_count: amazonMessages.length,
      },
    })
  }

  if (events.length > 0) {
    const { error: eventError } = await supabase
      .from('br_case_events')
      .insert(events)

    if (eventError) {
      // 이벤트 실패는 non-fatal — 로그만 남김
    }
  }

  // 4. SLA deadline 재계산 (상태 변경 시)
  // needs_attention → 새 deadline (Action Required), 아마존 응답 → paused (deadline 유지)
  let slaDeadlineAt: string | null | undefined = undefined
  if (report.br_case_status !== body.br_case_status && body.br_case_status === 'needs_attention') {
    // Action Required — SLA restart with new deadline
    const violationCategory = report.user_violation_type?.replace(/^V\d+_/, '').split('_').slice(0, -1).join('_') ?? ''
    const { data: slaConfigs } = await supabase.from('br_sla_configs').select('*')
    const configs = (slaConfigs ?? []) as BrSlaConfig[]
    const slaConfig = findSlaConfig(configs, violationCategory)
    const expectedHours = slaConfig?.expected_response_hours ?? 120
    const deadline = calculateSlaDeadline({ baseTime: new Date(), expectedResponseHours: expectedHours })
    slaDeadlineAt = deadline.toISOString()
  }

  // 5. reports 테이블 업데이트
  const updateData: Record<string, unknown> = {
    br_case_status: body.br_case_status,
    br_last_scraped_at: now,
  }

  if (slaDeadlineAt !== undefined) {
    updateData.br_sla_deadline_at = slaDeadlineAt
  }

  if (body.last_amazon_reply_at) {
    updateData.br_last_amazon_reply_at = body.last_amazon_reply_at
  }

  const { error: updateError } = await supabase
    .from('reports')
    .update(updateData)
    .eq('id', body.report_id)

  if (updateError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: `Failed to update report: ${updateError.message}` } },
      { status: 500 },
    )
  }

  return NextResponse.json({
    status: 'ok',
    messages_saved: body.new_messages.length,
    events_recorded: events.length,
    br_case_status: body.br_case_status,
  })
}
