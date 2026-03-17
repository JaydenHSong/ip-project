import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/crawler/br-case-id-missing — case_id 복구 대상 조회
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

  // Bug3 fix: br_submitted_at이 null인 건 제외 (오래된 레거시 데이터)
  const { data: reports, error } = await supabase
    .from('reports')
    .select('id, draft_title, br_submitted_at, br_case_id_retry_count, listings!reports_listing_id_fkey(asin)')
    .eq('status', 'monitoring')
    .is('br_case_id', null)
    .not('br_submitted_at', 'is', null)
    .lt('br_case_id_retry_count', 3)
    .order('br_submitted_at', { ascending: false, nullsFirst: false })
    .limit(10)

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  // Bug4 fix: 이미 매칭된 case_id 목록도 반환 (중복 매칭 방지)
  const { data: existingCases } = await supabase
    .from('reports')
    .select('br_case_id')
    .eq('status', 'monitoring')
    .not('br_case_id', 'is', null)
    .limit(200)

  const usedCaseIds = (existingCases ?? [])
    .map((r) => r.br_case_id as string)
    .filter(Boolean)

  const mapped = (reports ?? []).map((r) => {
    const listing = r.listings as unknown as { asin: string } | null
    return {
      report_id: r.id,
      draft_title: r.draft_title,
      asin: listing?.asin ?? null,
      submitted_at: r.br_submitted_at,
      retry_count: r.br_case_id_retry_count ?? 0,
    }
  })

  return NextResponse.json({ reports: mapped, used_case_ids: usedCaseIds })
}
