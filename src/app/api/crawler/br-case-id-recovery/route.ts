import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type CaseIdRecoveryRequest = {
  report_id: string
  br_case_id: string | null
}

// POST /api/crawler/br-case-id-recovery — case_id 복구 결과 보고
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

  const body = (await req.json()) as CaseIdRecoveryRequest

  if (!body.report_id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'report_id required' } },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id, br_case_id_retry_count, report_number, listing_snapshot')
    .eq('id', body.report_id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Report not found' } },
      { status: 404 },
    )
  }

  if (body.br_case_id) {
    // 매칭 성공: case_id 업데이트
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        br_case_id: body.br_case_id,
        br_case_id_retry_count: 0,
        br_case_status: null,
      })
      .eq('id', body.report_id)

    if (updateError) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: updateError.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ status: 'recovered', br_case_id: body.br_case_id })
  } else {
    // 매칭 실패: retry_count + 1
    const newCount = (report.br_case_id_retry_count ?? 0) + 1
    const maxReached = newCount >= 3

    const { error: updateError } = await supabase
      .from('reports')
      .update({
        br_case_id_retry_count: newCount,
        ...(maxReached ? { br_case_status: 'case_id_missing' } : {}),
      })
      .eq('id', body.report_id)

    if (updateError) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: updateError.message } },
        { status: 500 },
      )
    }

    // 3회 실패 → Google Chat 알림
    if (maxReached) {
      const { notifyPdFailed } = await import('@/lib/notifications/google-chat')
      const asin = (report.listing_snapshot as Record<string, unknown> | null)?.asin as string | undefined
      notifyPdFailed(
        body.report_id,
        `[BR] Case ID 자동 복구 실패 (3/3). 수동 입력 필요`,
        { reportNumber: report.report_number, asin },
      ).catch(() => {})
    }

    return NextResponse.json({ status: maxReached ? 'case_id_missing' : 'retry', retry_count: newCount })
  }
}
