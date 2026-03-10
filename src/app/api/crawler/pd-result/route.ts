import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ScResultRequest = {
  report_id: string
  success: boolean
  pd_case_id?: string | null
  error?: string | null
}

const MAX_SC_ATTEMPTS = 3

// POST /api/crawler/pd-result — Crawler가 PD 제출 결과 보고
export const POST = async (req: Request) => {
  // Service token 인증
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const serviceToken = process.env.CRAWLER_SERVICE_TOKEN

  if (!serviceToken || token !== serviceToken) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid service token' } },
      { status: 401 },
    )
  }

  const body = (await req.json()) as ScResultRequest

  if (!body.report_id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'report_id required' } },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // 현재 리포트 조회 (br_submit_data도 함께 조회하여 BR 전환 판단)
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id, status, pd_submit_attempts, listing_id, br_submit_data')
    .eq('id', body.report_id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Report not found' } },
      { status: 404 },
    )
  }

  if (body.success) {
    // 성공: br_submit_data가 있으면 BR Track으로 전환, 없으면 monitoring
    const hasBrData = report.br_submit_data !== null
    const nextStatus = hasBrData ? 'br_submitting' : 'monitoring'

    const { error: updateError } = await supabase
      .from('reports')
      .update({
        status: nextStatus,
        pd_case_id: body.pd_case_id ?? null,
        pd_submitted_at: now,
        pd_last_attempt_at: now,
        pd_submission_error: null,
        pd_submit_data: null,
        ...(hasBrData ? {} : { monitoring_started_at: now }),
      })
      .eq('id', body.report_id)

    if (updateError) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: updateError.message } },
        { status: 500 },
      )
    }

    // monitoring 진입 시에만 초기 스냅샷 + AI 학습 (BR 대기 중이면 BR 완료 후에)
    if (!hasBrData) {
      const { data: listing } = await supabase
        .from('listings')
        .select('asin, title, seller_name, price_amount, price_currency, images, rating, review_count')
        .eq('id', report.listing_id)
        .single()

      if (listing) {
        await supabase.from('report_snapshots').insert({
          report_id: body.report_id,
          snapshot_type: 'initial',
          crawled_at: now,
          title: listing.title,
          seller_name: listing.seller_name,
          price_amount: listing.price_amount,
          price_currency: listing.price_currency,
          images: listing.images,
          rating: listing.rating,
          review_count: listing.review_count,
        })
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      fetch(`${baseUrl}/api/ai/learn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceToken}`,
        },
        body: JSON.stringify({ report_id: body.report_id, trigger: 'pd_submitted' }),
      }).catch(() => {})
    }

    return NextResponse.json({ status: nextStatus, pd_case_id: body.pd_case_id })
  } else {
    // 실패
    const attempts = (report.pd_submit_attempts ?? 0) + 1
    const exceededMax = attempts >= MAX_SC_ATTEMPTS

    const { error: updateError } = await supabase
      .from('reports')
      .update({
        status: exceededMax ? 'approved' : 'pd_submitting',
        pd_submit_attempts: attempts,
        pd_last_attempt_at: now,
        pd_submission_error: body.error ?? 'Unknown error',
      })
      .eq('id', body.report_id)

    if (updateError) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: updateError.message } },
        { status: 500 },
      )
    }

    // 3회 초과 시 Admin 알림
    if (exceededMax) {
      const { notifyPdFailed } = await import('@/lib/notifications/google-chat')
      notifyPdFailed(body.report_id, body.error ?? 'Max attempts exceeded').catch(() => {})
    }

    return NextResponse.json({
      status: exceededMax ? 'approved' : 'pd_submitting',
      attempts,
      max_exceeded: exceededMax,
    })
  }
}
