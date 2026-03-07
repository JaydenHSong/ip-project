import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// POST /api/listings/batch-delete — 리스팅 일괄 삭제 (admin 이상)
export const POST = withAuth(async (req) => {
  const body = (await req.json()) as { ids: string[] }

  if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ids array required' } },
      { status: 400 },
    )
  }

  if (body.ids.length > 100) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Max 100 items per request' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  // 리포트가 있는 리스팅 ID 조회 → 제외
  const { data: withReports } = await supabase
    .from('reports')
    .select('listing_id')
    .in('listing_id', body.ids)

  const reportListingIds = new Set((withReports ?? []).map((r) => r.listing_id))
  const deletableIds = body.ids.filter((id) => !reportListingIds.has(id))

  if (deletableIds.length === 0) {
    return NextResponse.json(
      { error: { code: 'HAS_REPORTS', message: 'All selected listings have reports. Delete reports first.' } },
      { status: 409 },
    )
  }

  const { error, count } = await supabase
    .from('listings')
    .delete({ count: 'exact' })
    .in('id', deletableIds)

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({
    deleted: count ?? 0,
    skipped: reportListingIds.size,
  })
}, ['owner', 'admin'])
