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

  const { data: reports, error } = await supabase
    .from('reports')
    .select('id, draft_title, br_submitted_at, br_case_id_retry_count, listings!reports_listing_id_fkey(asin)')
    .eq('status', 'monitoring')
    .is('br_case_id', null)
    .lt('br_case_id_retry_count', 3)
    .order('br_submitted_at', { ascending: true })
    .limit(10)

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

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

  return NextResponse.json({ reports: mapped })
}
