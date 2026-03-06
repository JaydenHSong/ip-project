import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/listings/lookup?asin=B0...&marketplace=US
// 수동 리포트 작성 시 기존 리스팅 데이터를 pre-fill 하기 위한 조회 API
export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl
  const asin = searchParams.get('asin')
  const marketplace = searchParams.get('marketplace') ?? 'US'

  if (!asin) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'asin parameter is required' } },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  const { data: listing } = await supabase
    .from('listings')
    .select('id, asin, title, seller_name, seller_id, brand, price_amount, price_currency, rating, review_count, images, bullet_points, screenshot_url, marketplace, url, created_at')
    .eq('asin', asin.toUpperCase())
    .eq('marketplace', marketplace)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!listing) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Listing not found' } },
      { status: 404 },
    )
  }

  return NextResponse.json(listing)
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
