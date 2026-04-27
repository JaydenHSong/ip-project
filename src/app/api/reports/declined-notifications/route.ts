import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { isDemoMode } from '@/lib/demo'
import { DEMO_REPORTS } from '@/lib/demo/data'
import { getDemoDeclineCheckAt, setDemoDeclineCheckAt } from '@/lib/demo/runtime'
import { createClient } from '@/lib/supabase/server'

// GET /api/reports/declined-notifications — 본인 건 중 새로 Declined된 리포트 조회
export const GET = withAuth(async (_req, { user }) => {
  if (isDemoMode()) {
    const lastCheckAt = getDemoDeclineCheckAt(user.id) ?? '1970-01-01T00:00:00Z'
    const reports = DEMO_REPORTS
      .filter((report) => report.created_by === user.id && report.status === 'cancelled')
      .map((report) => ({
        id: report.id,
        report_number: (report as typeof report & { report_number?: number }).report_number ?? 0,
        cancellation_reason: (report as typeof report & { cancellation_reason?: string | null }).cancellation_reason ?? null,
        cancelled_at: (report as typeof report & { cancelled_at?: string | null }).cancelled_at ?? report.created_at,
      }))
      .filter((report) => report.cancelled_at > lastCheckAt)
      .sort((left, right) => right.cancelled_at.localeCompare(left.cancelled_at))
      .slice(0, 10)

    return NextResponse.json({
      count: reports.length,
      reports,
    })
  }

  const supabase = await createClient()

  // 유저의 마지막 decline 알림 확인 시점 조회
  const { data: pref } = await supabase
    .from('user_preferences')
    .select('preference_value')
    .eq('user_id', user.id)
    .eq('preference_key', 'last_decline_check_at')
    .maybeSingle()

  const lastCheckAt = pref?.preference_value ?? '1970-01-01T00:00:00Z'

  // 본인이 생성한 리포트 중 lastCheckAt 이후에 declined된 건
  const { data: reports } = await supabase
    .from('reports')
    .select('id, report_number, cancellation_reason, cancelled_at')
    .eq('created_by', user.id)
    .eq('status', 'cancelled')
    .gt('cancelled_at', lastCheckAt)
    .order('cancelled_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    count: reports?.length ?? 0,
    reports: reports ?? [],
  })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])

// POST /api/reports/declined-notifications — 읽음 처리 (last_decline_check_at 업데이트)
export const POST = withAuth(async (_req, { user }) => {
  if (isDemoMode()) {
    setDemoDeclineCheckAt(user.id, new Date().toISOString())
    return NextResponse.json({ acknowledged: true })
  }

  const supabase = await createClient()

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      { user_id: user.id, preference_key: 'last_decline_check_at', preference_value: now },
      { onConflict: 'user_id,preference_key' },
    )

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ acknowledged: true })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
