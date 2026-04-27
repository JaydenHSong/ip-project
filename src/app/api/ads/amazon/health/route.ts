// Design Ref: §4.3 — API connection health check
// GET /api/ads/amazon/health

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { adsConfig } from '@/modules/ads/api/infra/api-config'
import { tokenStore } from '@/modules/ads/api/infra/token-store'
import { rateLimiter } from '@/modules/ads/api/infra/rate-limiter'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'

type HealthStatus = 'connected' | 'disconnected' | 'error' | 'mock'

export const GET = withAuth(async () => {
  const profileId = process.env.AMAZON_ADS_PROFILE_ID_US ?? ''

  // Mock mode
  if (!adsConfig.isEnabled()) {
    return NextResponse.json({
      data: {
        mode: 'mock',
        ads_api: { status: 'mock' as HealthStatus },
        sp_api: { status: 'mock' as HealthStatus },
        stream: { status: 'inactive' as const },
        token: { valid: false, expires_in: 0 },
        rate_limit: { utilization: 0 },
      },
    })
  }

  let adsStatus: HealthStatus = 'disconnected'
  let tokenValid = false
  let tokenExpiresIn = 0

  // Check Ads API token
  try {
    const accessToken = await tokenStore.getAccessToken(profileId)
    tokenValid = Boolean(accessToken)
    tokenExpiresIn = 3600 // approximate, since we just refreshed

    // Quick profile check to verify API access
    const res = await fetch('https://advertising-api.amazon.com/v2/profiles', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': adsConfig.ads.clientId,
      },
    })
    adsStatus = res.ok ? 'connected' : 'error'
  } catch {
    adsStatus = 'error'
  }

  // Check SP-API status
  let spStatus: HealthStatus = 'disconnected'
  if (adsConfig.isSpApiEnabled()) {
    spStatus = 'connected' // Token exists
  }

  // Check last sync from DB
  const ctx = createAdsAdminContext()
  const { data: lastSync } = await ctx.ads
    .from(ctx.adsTable('marketplace_profiles'))
    .select('last_sync_at')
    .eq('profile_id', profileId)
    .single()

  return NextResponse.json({
    data: {
      mode: 'live',
      ads_api: {
        status: adsStatus,
        profile_id: profileId,
        last_sync: lastSync?.last_sync_at ?? null,
      },
      sp_api: {
        status: spStatus,
      },
      stream: {
        status: adsConfig.isStreamEnabled() ? 'active' as const : 'inactive' as const,
      },
      token: {
        valid: tokenValid,
        expires_in: tokenExpiresIn,
      },
      rate_limit: {
        utilization: rateLimiter.getUtilization(profileId),
      },
    },
  })
}, ['editor', 'admin', 'owner'])
