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

  const { data } = await supabase
    .from('reports')
    .select('id, status, report_number, listing_id, listings!reports_listing_id_fkey(asin, marketplace)')
    .in('status', activeStatuses)
    .order('created_at', { ascending: false })

  // listings join을 통해 ASIN + marketplace 매칭
  const matches = (data ?? []).filter((r) => {
    const listing = r.listings as unknown as { asin: string; marketplace: string } | null
    return listing?.asin === asin && listing?.marketplace === marketplace
  })

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
