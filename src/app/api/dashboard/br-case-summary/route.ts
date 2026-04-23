import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { getLastBrActivityAt, hasUnreadAmazonReply } from '@/lib/reports/br-case-queue'
import { isDemoMode } from '@/lib/demo'
import { DEMO_MONITORING_REPORTS } from '@/lib/demo/monitoring'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// GET /api/dashboard/br-case-summary — BR 케이스 큐 카운트 (개인별 New Reply)
export const GET = withAuth(async (req, { user }) => {
  const ownerParam = req.nextUrl.searchParams.get('owner')
  const canSeeAll = user.role !== 'viewer'
  const effectiveOwner = canSeeAll
    ? (ownerParam ?? ((user.role === 'owner' || user.role === 'admin') ? 'all' : 'my')) as 'my' | 'all'
    : 'my'

  if (isDemoMode()) {
    const rows = DEMO_MONITORING_REPORTS
      .filter((report) => ['monitoring', 'br_submitting'].includes(report.status))
      .filter((report) => effectiveOwner === 'all' || report.created_by === user.id)

    return NextResponse.json({
      action_required: 0,
      new_reply: 0,
      clone_suggested: 0,
      expired: 0,
      total: rows.length,
      clone_threshold_days: 14,
      max_monitoring_days: 90,
    })
  }

  const supabase = await createClient()

  // 모니터링 설정값 조회
  const { data: configRows } = await supabase
    .from('system_configs')
    .select('key, value')
    .in('key', ['clone_threshold_days', 'br_max_monitoring_days'])
  const configMap = Object.fromEntries((configRows ?? []).map(r => [r.key, Number(r.value)]))
  const cloneThresholdDays = configMap.clone_threshold_days ?? 14
  const maxMonitoringDays = configMap.br_max_monitoring_days ?? 90

  // 모니터링 중인 리포트만 대상
  let reportsQuery = supabase
    .from('reports')
    .select('id, br_case_status, br_last_amazon_reply_at, br_last_our_reply_at, br_submitted_at, created_at')
    .in('status', ['monitoring', 'br_submitting'])
  if (effectiveOwner === 'my') {
    reportsQuery = reportsQuery.eq('created_by', user.id)
  }
  const { data: reports } = await reportsQuery

  // 현재 유저의 읽음 상태 조회
  const reportIds = (reports ?? []).map(r => r.id)
  let readStatusMap: Record<string, string> = {}
  if (reportIds.length > 0) {
    const adminSupabase = createAdminClient()
    const { data: readRows } = await adminSupabase
      .from('report_read_status')
      .select('report_id, read_at')
      .eq('user_id', user.id)
    if (readRows) {
      readStatusMap = Object.fromEntries(
        readRows
          .filter((row) => reportIds.includes(row.report_id))
          .map((row) => [row.report_id, row.read_at]),
      )
    }
  }

  const rows = reports ?? []
  const now = Date.now()
  const cloneThresholdMs = cloneThresholdDays * 24 * 60 * 60 * 1000
  const maxMonitoringMs = maxMonitoringDays * 24 * 60 * 60 * 1000

  let actionRequired = 0
  let newReply = 0
  let cloneSuggested = 0
  let expired = 0

  for (const r of rows) {
    if (r.br_case_status === 'needs_attention') actionRequired++

    if (hasUnreadAmazonReply(r, readStatusMap[r.id])) newReply++

    const lastActivity = getLastBrActivityAt(r)
    if (lastActivity > 0 && r.br_case_status !== 'closed') {
      const idle = now - lastActivity
      if (idle > maxMonitoringMs) {
        expired++
      } else if (idle > cloneThresholdMs) {
        cloneSuggested++
      }
    }
  }

  return NextResponse.json({
    action_required: actionRequired,
    new_reply: newReply,
    clone_suggested: cloneSuggested,
    expired,
    total: rows.length,
    clone_threshold_days: cloneThresholdDays,
    max_monitoring_days: maxMonitoringDays,
  })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
