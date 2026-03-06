import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ScResultRequest = {
  report_id: string
  success: boolean
  sc_case_id?: string | null
  error?: string | null
}

const MAX_SC_ATTEMPTS = 3

// POST /api/crawler/sc-result — Crawler가 SC 제출 결과 보고
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

  // 현재 리포트 조회
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id, status, sc_submit_attempts, listing_id')
    .eq('id', body.report_id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Report not found' } },
      { status: 404 },
    )
  }

  if (body.success) {
    // 성공: sc_submitting → monitoring (submitted 거치지 않고 바로)
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        status: 'monitoring',
        sc_case_id: body.sc_case_id ?? null,
        sc_submitted_at: now,
        sc_last_attempt_at: now,
        monitoring_started_at: now,
        sc_submission_error: null,
      })
      .eq('id', body.report_id)

    if (updateError) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: updateError.message } },
        { status: 500 },
      )
    }

    // 초기 모니터링 스냅샷 생성 (listings 데이터 사용)
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

    // AI 학습 트리거 — 성공 제출은 좋은 드래프트로 학습
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    fetch(`${baseUrl}/api/ai/learn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceToken}`,
      },
      body: JSON.stringify({ report_id: body.report_id, trigger: 'sc_submitted' }),
    }).catch(() => {})

    return NextResponse.json({ status: 'monitoring', sc_case_id: body.sc_case_id })
  } else {
    // 실패
    const attempts = (report.sc_submit_attempts ?? 0) + 1
    const exceededMax = attempts >= MAX_SC_ATTEMPTS

    const { error: updateError } = await supabase
      .from('reports')
      .update({
        status: exceededMax ? 'approved' : 'sc_submitting',
        sc_submit_attempts: attempts,
        sc_last_attempt_at: now,
        sc_submission_error: body.error ?? 'Unknown error',
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
      const { notifyScFailed } = await import('@/lib/notifications/google-chat')
      notifyScFailed(body.report_id, body.error ?? 'Max attempts exceeded').catch(() => {})
    }

    return NextResponse.json({
      status: exceededMax ? 'approved' : 'sc_submitting',
      attempts,
      max_exceeded: exceededMax,
    })
  }
}
