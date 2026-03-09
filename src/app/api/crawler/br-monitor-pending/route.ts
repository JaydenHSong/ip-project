import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/crawler/br-monitor-pending — Crawler가 폴링: 모니터링 대상 리포트 반환
export const GET = async (req: Request) => {
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

  const { data: reports, error } = await supabase
    .from('reports')
    .select('id, br_case_id, br_case_status, br_last_scraped_at')
    .eq('status', 'monitoring')
    .not('br_case_id', 'is', null)
    .order('br_last_scraped_at', { ascending: true, nullsFirst: true })
    .limit(50)

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  const mapped = (reports ?? []).map((r) => ({
    report_id: r.id,
    br_case_id: r.br_case_id,
    br_case_status: r.br_case_status,
    last_scraped_at: r.br_last_scraped_at,
  }))

  return NextResponse.json({ reports: mapped })
}
