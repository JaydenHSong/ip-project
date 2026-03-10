import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/reports/pending-pd-submit
// Extension이 PD 페이지에서 대기 중인 submit 데이터를 조회
export const GET = withAuth(async (_req, { user }) => {
  const supabase = await createClient()

  // 현재 사용자가 승인한 report 중
  // pd_submit_data가 있고 pd_case_id가 없는 것 (아직 SC에 실제 제출 안 된 것)
  const { data: report, error } = await supabase
    .from('reports')
    .select('id, pd_submit_data')
    .eq('status', 'pd_submitting')
    .eq('approved_by', user.id)
    .not('pd_submit_data', 'is', null)
    .is('pd_case_id', null)
    .order('pd_submitted_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !report || !report.pd_submit_data) {
    return new NextResponse(null, { status: 204 })
  }

  // Web 자동 제출 설정 확인
  const { data: configRow } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'pd_automation_settings')
    .single()

  type PdAutomationConfig = {
    auto_submit_enabled?: boolean
    default_countdown_seconds?: number
    default_min_delay_sec?: number
    default_max_delay_sec?: number
  }

  const config: PdAutomationConfig = configRow?.value
    ? (configRow.value as PdAutomationConfig)
    : {}

  return NextResponse.json({
    report_id: report.id,
    pd_submit_data: report.pd_submit_data,
    auto_submit_enabled: config.auto_submit_enabled ?? false,
    countdown_seconds: config.default_countdown_seconds ?? 3,
    min_delay_sec: config.default_min_delay_sec ?? 30,
    max_delay_sec: config.default_max_delay_sec ?? 60,
  })
}, ['owner', 'admin', 'editor'])
