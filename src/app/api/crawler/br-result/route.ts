import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type BrResultRequest = {
  report_id: string
  success: boolean
  br_case_id?: string | null
  error?: string | null
}

const MAX_BR_ATTEMPTS = 3

// POST /api/crawler/br-result — Crawler가 BR 제출 결과 보고
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

  const body = (await req.json()) as BrResultRequest

  if (!body.report_id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'report_id required' } },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id, status, br_submit_attempts, listing_id')
    .eq('id', body.report_id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Report not found' } },
      { status: 404 },
    )
  }

  if (body.success) {
    // 성공: br_submitting → monitoring
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        status: 'monitoring',
        br_case_id: body.br_case_id ?? null,
        br_submitted_at: now,
        br_submission_error: null,
        br_submit_data: null,
        monitoring_started_at: now,
      })
      .eq('id', body.report_id)

    if (updateError) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: updateError.message } },
        { status: 500 },
      )
    }

    // 초기 모니터링 스냅샷 (PD result와 동일 패턴)
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

    // Case ID 없이 성공한 경우 알림
    if (!body.br_case_id) {
      const { notifyPdFailed } = await import('@/lib/notifications/google-chat')
      notifyPdFailed(body.report_id, '[BR] Submitted successfully but case ID not extracted').catch(() => {})
    }

    return NextResponse.json({ status: 'monitoring', br_case_id: body.br_case_id })
  } else {
    // 실패
    const attempts = (report.br_submit_attempts ?? 0) + 1
    const exceededMax = attempts >= MAX_BR_ATTEMPTS

    const { error: updateError } = await supabase
      .from('reports')
      .update({
        status: exceededMax ? 'approved' : 'br_submitting',
        br_submit_attempts: attempts,
        br_submission_error: body.error ?? 'Unknown error',
        ...(exceededMax ? { br_submit_data: null } : {}),
      })
      .eq('id', body.report_id)

    if (updateError) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: updateError.message } },
        { status: 500 },
      )
    }

    if (exceededMax) {
      const { notifyPdFailed } = await import('@/lib/notifications/google-chat')
      notifyPdFailed(body.report_id, `[BR] ${body.error ?? 'Max attempts exceeded'}`).catch(() => {})
    }

    return NextResponse.json({
      status: exceededMax ? 'approved' : 'br_submitting',
      attempts,
      max_exceeded: exceededMax,
    })
  }
}
