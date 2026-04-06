// Design Ref: §4.2 — List/connect Amazon Ads profiles
// GET /api/ads/amazon/profiles

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsPort } from '@/modules/ads/api/factory'
import { adsConfig } from '@/modules/ads/api/infra/api-config'

export const GET = withAuth(async () => {
  const profileId = process.env.AMAZON_ADS_PROFILE_ID_US ?? ''

  if (!adsConfig.isEnabled()) {
    return NextResponse.json({
      data: [],
      mock: true,
      message: 'Running in mock mode. Set AMAZON_ADS_ENABLED=true to connect.',
    })
  }

  if (!profileId) {
    return NextResponse.json(
      { error: { code: 'NO_PROFILE', message: 'AMAZON_ADS_PROFILE_ID_US not configured' } },
      { status: 400 },
    )
  }

  try {
    const adsPort = createAdsPort(profileId)
    const profiles = await adsPort.listProfiles()

    return NextResponse.json({ data: profiles })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch profiles'
    return NextResponse.json(
      { error: { code: 'ADS_API_ERROR', message } },
      { status: 502 },
    )
  }
}, ['editor', 'admin', 'owner'])
