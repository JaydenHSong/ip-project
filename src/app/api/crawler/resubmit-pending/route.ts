import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/crawler/resubmit-pending — 재제출 대기 리포트 조회
export const GET = async (req: Request) => {
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

  const supabase = createAdminClient()

  // system_configs에서 기본값 로드
  const { data: config } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'resubmit_defaults')
    .single()

  const defaults = (config?.value ?? { interval_days: 7, max_count: 3 }) as {
    interval_days: number
    max_count: number
  }

  // unresolved + next_resubmit_at 경과 + resubmit_count < max
  const { data: reports, error } = await supabase
    .from('reports')
    .select(`
      id, status, resubmit_count, resubmit_interval_days, max_resubmit_count,
      next_resubmit_at, draft_body, draft_title, user_violation_type, listing_id,
      listings!reports_listing_id_fkey(asin, marketplace, title)
    `)
    .eq('status', 'unresolved')
    .lte('next_resubmit_at', new Date().toISOString())
    .order('next_resubmit_at', { ascending: true })
    .limit(10)

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  // max_resubmit_count 필터 (per-report 또는 기본값)
  const eligible = (reports ?? []).filter((r) => {
    const maxCount = r.max_resubmit_count ?? defaults.max_count
    return (r.resubmit_count ?? 0) < maxCount
  })

  return NextResponse.json({ reports: eligible, defaults })
}
