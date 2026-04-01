// POST /api/ads/amazon/sync — Manual sync trigger (stub)
// Waiting for Amazon Ads API authorization

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'

export const POST = withAuth(async () => {
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'Waiting for Amazon Ads API authorization' } },
    { status: 501 },
  )
}, ['admin', 'owner'])
