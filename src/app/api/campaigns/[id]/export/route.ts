import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/campaigns/:id/export — 결과 CSV 다운로드
export const GET = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  // 캠페인 확인
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('keyword, marketplace')
    .eq('id', id)
    .single()

  if (campError || !campaign) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '캠페인을 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  // 캠페인에 연결된 리스팅 조회
  const { data: links, error: linkError } = await supabase
    .from('campaign_listings')
    .select('listing_id')
    .eq('campaign_id', id)

  if (linkError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: linkError.message } },
      { status: 500 },
    )
  }

  const listingIds = (links ?? []).map((l) => l.listing_id)

  if (listingIds.length === 0) {
    const emptyCSV = 'ASIN,Title,Seller,Suspect,Reasons,Crawled At\n'
    return new NextResponse(emptyCSV, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="campaign-${campaign.keyword}-${campaign.marketplace}.csv"`,
      },
    })
  }

  const { data: listings, error: listError } = await supabase
    .from('listings')
    .select('asin, title, seller_name, is_suspect, suspect_reasons, crawled_at')
    .in('id', listingIds)
    .order('crawled_at', { ascending: false })

  if (listError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: listError.message } },
      { status: 500 },
    )
  }

  // CSV 생성
  const header = 'ASIN,Title,Seller,Suspect,Reasons,Crawled At\n'
  const rows = (listings ?? [])
    .map((l) => {
      const title = `"${(l.title ?? '').replace(/"/g, '""')}"`
      const seller = `"${(l.seller_name ?? '').replace(/"/g, '""')}"`
      const reasons = `"${(l.suspect_reasons as string[]).join('; ')}"`
      return `${l.asin},${title},${seller},${l.is_suspect},${reasons},${l.crawled_at}`
    })
    .join('\n')

  const csv = header + rows

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="campaign-${campaign.keyword}-${campaign.marketplace}.csv"`,
    },
  })
}, ['admin', 'editor'])
