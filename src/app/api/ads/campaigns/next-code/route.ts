// GET /api/ads/campaigns/next-code — Generate next marketing code
// Design Ref: §4.2 Marketing Code auto-generation

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { getNextMarketingCode } from '@/modules/ads/features/campaigns/queries'

export const GET = withAuth(async (req) => {
  const url = new URL(req.url)
  const brandMarketId = url.searchParams.get('brand_market_id')
  const prefix = url.searchParams.get('prefix')

  if (!brandMarketId) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'brand_market_id is required' } },
      { status: 400 },
    )
  }

  try {
    // If no prefix provided, generate a default one based on brand_market_id
    const codePrefix = prefix ?? brandMarketId.slice(0, 4).toUpperCase()
    const code = await getNextMarketingCode(brandMarketId, codePrefix)
    return NextResponse.json({ code })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])
