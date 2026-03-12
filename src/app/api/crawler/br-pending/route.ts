import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/crawler/br-pending — Crawler가 폴링: br_submitting 상태 리포트 반환
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
    .select(`
      id, status, br_submit_data, br_submit_attempts,
      listings!reports_listing_id_fkey(asin, marketplace, title)
    `)
    .eq('status', 'br_submitting')
    .not('br_submit_data', 'is', null)
    .order('updated_at', { ascending: true })
    .limit(10)

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ reports: reports ?? [] })
}
