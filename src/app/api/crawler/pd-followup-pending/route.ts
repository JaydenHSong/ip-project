import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULT_INTERVAL_DAYS = 7
const DEFAULT_MAX_DAYS = 90

// GET /api/crawler/pd-followup-pending — 크롤러가 PD 재방문할 대상 조회 (7일 간격)
export const GET = async (req: Request): Promise<Response> => {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const serviceToken = process.env.CRAWLER_SERVICE_TOKEN

  if (!serviceToken || token !== serviceToken) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid service token' } },
      { status: 401 },
    )
  }

  const supabase = createAdminClient()

  // system_configs에서 간격/최대일수 조회
  const { data: intervalSetting } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'monitoring_interval_days')
    .single()

  const { data: maxDaysSetting } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'monitoring_max_days')
    .single()

  const intervalDays = intervalSetting?.value ? Number(intervalSetting.value) : DEFAULT_INTERVAL_DAYS
  const maxDays = maxDaysSetting?.value ? Number(maxDaysSetting.value) : DEFAULT_MAX_DAYS

  // monitoring 상태 리포트 조회
  const { data: reports, error } = await supabase
    .from('reports')
    .select('id, listing_id, monitoring_started_at, pd_followup_interval_days, listings!reports_listing_id_fkey(asin, url, marketplace)')
    .eq('status', 'monitoring')

  if (error || !reports) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error?.message ?? 'Fetch failed' } },
      { status: 500 },
    )
  }

  const now = new Date()
  const results: Array<{
    report_id: string
    listing_id: string
    asin: string
    marketplace: string
    url: string | null
    monitoring_started_at: string
    last_snapshot_at: string | null
    snapshot_count: number
  }> = []

  for (const report of reports) {
    const monitoringStart = new Date(report.monitoring_started_at)
    const daysSinceStart = Math.floor((now.getTime() - monitoringStart.getTime()) / (1000 * 60 * 60 * 24))

    // 최대 모니터링 기간 초과 → 자동 unresolved
    if (daysSinceStart > maxDays) {
      void supabase
        .from('reports')
        .update({
          status: 'unresolved',
          resolution_type: 'no_change',
          resolved_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', report.id)
      continue
    }

    // 마지막 스냅샷 시간 + 전체 스냅샷 카운트
    const { data: lastSnapshot } = await supabase
      .from('report_snapshots')
      .select('crawled_at')
      .eq('report_id', report.id)
      .order('crawled_at', { ascending: false })
      .limit(1)
      .single()

    const { count: snapshotCount } = await supabase
      .from('report_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('report_id', report.id)

    const lastCrawled = lastSnapshot?.crawled_at ? new Date(lastSnapshot.crawled_at) : monitoringStart
    const daysSinceLastCrawl = Math.floor((now.getTime() - lastCrawled.getTime()) / (1000 * 60 * 60 * 24))

    // 개별 오버라이드가 있으면 해당 간격 사용, 없으면 시스템 기본값
    const effectiveInterval = report.pd_followup_interval_days ?? intervalDays

    // 재방문 시점 도래
    if (daysSinceLastCrawl >= effectiveInterval) {
      const listing = report.listings as unknown as { asin: string; url: string | null; marketplace: string } | null
      results.push({
        report_id: report.id,
        listing_id: report.listing_id,
        asin: listing?.asin ?? '',
        marketplace: listing?.marketplace ?? '',
        url: listing?.url ?? null,
        monitoring_started_at: report.monitoring_started_at,
        last_snapshot_at: lastSnapshot?.crawled_at ?? null,
        snapshot_count: snapshotCount ?? 0,
      })
    }
  }

  return NextResponse.json({ reports: results })
}
