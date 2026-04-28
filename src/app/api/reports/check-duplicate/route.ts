import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/reports/check-duplicate?asin=B0XXX&marketplace=US
export const GET = withAuth(async (req: NextRequest) => {
  const asin = req.nextUrl.searchParams.get('asin')?.trim().toUpperCase()
  const marketplace = req.nextUrl.searchParams.get('marketplace') ?? 'US'

  if (!asin) {
    return NextResponse.json({ exists: false, reports: [] })
  }

  const supabase = await createClient()

  // 활성 상태의 리포트만 (resolved/archived 제외)
  const activeStatuses = ['draft', 'pending_review', 'approved', 'monitoring', 'br_submitting']
  const { data: matchedListings, error: listingError } = await supabase
    .from('listings')
    .select('id')
    .eq('asin', asin)
    .eq('marketplace', marketplace)

  if (listingError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: listingError.message } },
      { status: 500 },
    )
  }

  const listingIds = (matchedListings ?? []).map((listing) => listing.id)

  let listingMatches: Array<{ id: string; status: string; report_number: number; created_at: string }> = []
  if (listingIds.length > 0) {
    const { data, error } = await supabase
      .from('reports')
      .select('id, status, report_number, created_at')
      .in('status', activeStatuses)
      .in('listing_id', listingIds)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    listingMatches = data ?? []
  }

  const { data: snapshotMatches, error: snapshotError } = await supabase
    .from('reports')
    .select('id, status, report_number, created_at')
    .in('status', activeStatuses)
    .is('listing_id', null)
    .filter('listing_snapshot->>asin', 'eq', asin)
    .filter('listing_snapshot->>marketplace', 'eq', marketplace)
    .order('created_at', { ascending: false })

  if (snapshotError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: snapshotError.message } },
      { status: 500 },
    )
  }

  const matches = [...listingMatches, ...(snapshotMatches ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .filter((report, index, reports) => reports.findIndex((item) => item.id === report.id) === index)

  if (matches.length === 0) {
    return NextResponse.json({ exists: false, reports: [] })
  }

  return NextResponse.json({
    exists: true,
    reports: matches.map((r) => ({
      report_id: r.id,
      status: r.status,
      report_number: r.report_number,
    })),
  })
}, ['owner', 'admin', 'editor'])
