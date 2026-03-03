import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/monitoring/pending
// 크롤러가 재방문할 대상 목록 조회
export const GET = withAuth(async () => {
  const supabase = await createClient()

  // settings 조회
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

  const intervalDays = intervalSetting?.value ? Number(intervalSetting.value) : 7
  const maxDays = maxDaysSetting?.value ? Number(maxDaysSetting.value) : 90

  // monitoring 상태 신고 조회
  const { data: reports, error } = await supabase
    .from('reports')
    .select('id, listing_id, monitoring_started_at, listings!reports_listing_id_fkey(asin, marketplace)')
    .eq('status', 'monitoring')

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  const now = new Date()
  const results = []

  for (const report of reports ?? []) {
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

    // 마지막 스냅샷 조회
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

    // 재방문 시점 도래
    if (daysSinceLastCrawl >= intervalDays) {
      const listing = report.listings as unknown as { asin: string; marketplace: string } | null
      results.push({
        report_id: report.id,
        listing_id: report.listing_id,
        asin: listing?.asin ?? '',
        marketplace: listing?.marketplace ?? '',
        monitoring_started_at: report.monitoring_started_at,
        last_snapshot_at: lastSnapshot?.crawled_at ?? null,
        snapshot_count: snapshotCount ?? 0,
      })
    }
  }

  return NextResponse.json({ reports: results })
}, ['editor', 'admin'])
