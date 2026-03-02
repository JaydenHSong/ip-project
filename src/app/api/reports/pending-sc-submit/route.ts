import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/reports/pending-sc-submit
// Extension이 SC 페이지에서 대기 중인 submit 데이터를 조회
export const GET = withAuth(async (_req, { user }) => {
  const supabase = await createClient()

  // 현재 사용자가 승인한 report 중
  // sc_submit_data가 있고 sc_case_id가 없는 것 (아직 SC에 실제 제출 안 된 것)
  const { data: report, error } = await supabase
    .from('reports')
    .select('id, sc_submit_data')
    .eq('status', 'submitted')
    .eq('approved_by', user.id)
    .not('sc_submit_data', 'is', null)
    .is('sc_case_id', null)
    .order('sc_submitted_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !report || !report.sc_submit_data) {
    return new NextResponse(null, { status: 204 })
  }

  return NextResponse.json({
    report_id: report.id,
    sc_submit_data: report.sc_submit_data,
  })
}, ['editor', 'admin'])
