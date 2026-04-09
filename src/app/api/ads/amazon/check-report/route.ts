// GET /api/ads/amazon/check-report?id=xxx — Check existing report status
// Temporary debug endpoint. Remove after sync is verified.

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminClient } from '@/lib/supabase/admin'
import { tokenStore } from '@/modules/ads/api/infra/token-store'

export const GET = withAuth(async (req: Request) => {
  const url = new URL(req.url)
  const reportId = url.searchParams.get('id')

  if (!reportId) {
    return NextResponse.json({ error: 'Missing ?id=reportId parameter' })
  }

  const supabase = createAdsAdminClient()
  const { data: profiles } = await supabase
    .from('marketplace_profiles')
    .select('ads_profile_id')
    .eq('is_active', true)
    .not('ads_profile_id', 'is', null)
    .limit(1)

  const profileId = profiles?.[0]?.ads_profile_id as string
  if (!profileId) {
    return NextResponse.json({ error: 'No active profile found' })
  }

  const accessToken = await tokenStore.getAccessToken(profileId)

  const res = await fetch(`https://advertising-api.amazon.com/reporting/reports/${reportId}`, {
    headers: {
      'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID ?? '',
      'Amazon-Advertising-API-Scope': profileId,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/vnd.createasyncreportrequest.v3+json',
    },
  })

  const body = await res.json()
  return NextResponse.json(body)
}, ['owner'])
