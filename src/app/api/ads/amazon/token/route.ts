// POST /api/ads/amazon/token — Token refresh
// Design Ref: §4 — Token management route

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { tokenStore } from '@/modules/ads/api/infra/token-store'

export const POST = withAuth(async () => {
  const profileId = process.env.AMAZON_ADS_PROFILE_ID_US ?? ''

  if (!profileId) {
    return NextResponse.json(
      { error: { code: 'NO_PROFILE', message: 'AMAZON_ADS_PROFILE_ID_US not configured' } },
      { status: 400 },
    )
  }

  try {
    // Force refresh — invalidate cache first
    tokenStore.invalidate(profileId)
    const accessToken = await tokenStore.getAccessToken(profileId)

    return NextResponse.json({
      data: {
        profile_id: profileId,
        token_valid: Boolean(accessToken),
        refreshed_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token refresh failed'
    return NextResponse.json(
      { error: { code: 'TOKEN_REFRESH_FAILED', message } },
      { status: 500 },
    )
  }
}, ['admin', 'owner'])
