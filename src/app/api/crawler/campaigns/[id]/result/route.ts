import { NextRequest, NextResponse } from 'next/server'
import { withServiceAuth } from '@/lib/auth/service-middleware'
import { createAdminClient } from '@/lib/supabase/admin'

type CampaignResultUpdate = {
  found: number
  sent: number
  duplicates: number
  errors: number
  spigen_skipped: number
  pages_crawled: number
  violations_suspected: number
  duration_ms: number
  persona_name: string
  success: boolean
}

// PATCH /api/crawler/campaigns/:id/result
export const PATCH = withServiceAuth(async (req: NextRequest, { params }) => {
  const { id } = params
  if (!id) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Missing campaign ID' } },
      { status: 400 },
    )
  }

  const body = (await req.json()) as CampaignResultUpdate

  const supabase = createAdminClient()

  // 현재 캠페인 값 조회
  const { data: campaign, error: fetchError } = await supabase
    .from('campaigns')
    .select('total_listings, total_sent, total_violations')
    .eq('id', id)
    .single()

  if (fetchError) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: fetchError.message } },
      { status: 404 },
    )
  }

  // 최근 10회 크롤링 성공률 계산
  const { data: recentLogs } = await supabase
    .from('crawler_logs')
    .select('type')
    .eq('campaign_id', id)
    .in('type', ['crawl_complete', 'crawl_error'])
    .order('created_at', { ascending: false })
    .limit(10)

  let successRate = 0
  if (recentLogs && recentLogs.length > 0) {
    const successes = recentLogs.filter(l => l.type === 'crawl_complete').length
    successRate = Math.round((successes / recentLogs.length) * 100)
  }

  // 실제 DB 리스팅 수 조회 (누적 합산 대신 정확한 수)
  const { count: actualListings } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('source_campaign_id', id)

  // 업데이트
  const { error: updateError } = await supabase
    .from('campaigns')
    .update({
      last_crawled_at: new Date().toISOString(),
      total_listings: actualListings ?? 0,
      total_sent: (campaign.total_sent ?? 0) + body.sent,
      total_violations: (campaign.total_violations ?? 0) + body.violations_suspected,
      success_rate: successRate,
      last_result: {
        found: body.found,
        sent: body.sent,
        duplicates: body.duplicates,
        errors: body.errors,
        spigen_skipped: body.spigen_skipped,
        pages_crawled: body.pages_crawled,
        violations_suspected: body.violations_suspected,
        duration_ms: body.duration_ms,
        persona: body.persona_name,
        success: body.success,
        completed_at: new Date().toISOString(),
      },
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: updateError.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
})
