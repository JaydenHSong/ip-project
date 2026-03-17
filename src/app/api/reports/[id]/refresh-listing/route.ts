import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

const COOLDOWN_MINUTES = 5

// POST /api/reports/{id}/refresh-listing — 크롤러 리프레시
export const POST = withAuth(async (req: NextRequest) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]

  const supabase = await createClient()

  // 리포트에서 listing 정보 가져오기
  const { data: report } = await supabase
    .from('reports')
    .select('listing_id, listings!reports_listing_id_fkey(id, asin, marketplace, last_fetched_at)')
    .eq('id', id)
    .single()

  if (!report?.listing_id) {
    return NextResponse.json({ error: 'Report or listing not found' }, { status: 404 })
  }

  const listingArr = report.listings as {
    id: string
    asin: string
    marketplace: string
    last_fetched_at: string | null
  }[] | null
  const listing = Array.isArray(listingArr) ? listingArr[0] ?? null : listingArr

  if (!listing) {
    return NextResponse.json({ error: 'Listing data not found' }, { status: 404 })
  }

  // 쿨다운 체크
  if (listing.last_fetched_at) {
    const lastFetched = new Date(listing.last_fetched_at)
    const cooldownUntil = new Date(lastFetched.getTime() + COOLDOWN_MINUTES * 60 * 1000)
    if (new Date() < cooldownUntil) {
      return NextResponse.json({
        ok: false,
        cooldown_until: cooldownUntil.toISOString(),
      })
    }
  }

  // sentinel-fetch 트리거
  const fetchUrl = process.env['SENTINEL_FETCH_URL']
  if (!fetchUrl) {
    return NextResponse.json({ error: 'SENTINEL_FETCH_URL not configured' }, { status: 500 })
  }

  // fetching 상태로 마킹
  await supabase
    .from('listings')
    .update({ fetch_status: 'fetching', fetch_error: null })
    .eq('id', listing.id)

  // 비동기 크롤링 요청
  fetch(`${fetchUrl}/fetch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-token': process.env['SENTINEL_SERVICE_TOKEN'] ?? '',
    },
    body: JSON.stringify({
      listing_id: listing.id,
      asin: listing.asin,
      marketplace: listing.marketplace,
    }),
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}, ['owner', 'admin', 'editor'])
