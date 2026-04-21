// Design Ref: §4.1 — OAuth code exchange callback
// GET /api/ads/amazon/callback?code=xxx&state=xxx

import { NextRequest, NextResponse } from 'next/server'
import { tokenStore } from '@/modules/ads/api/infra/token-store'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.redirect(
      new URL('/ads/settings?error=missing_code', request.nextUrl.origin),
    )
  }

  try {
    // Exchange authorization code for token set
    const tokenSet = await tokenStore.exchangeCode(code)

    // Get profiles to find the profile ID
    const profilesRes = await fetch('https://advertising-api.amazon.com/v2/profiles', {
      headers: {
        'Authorization': `Bearer ${tokenSet.access_token}`,
        'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID ?? '',
      },
    })

    if (!profilesRes.ok) {
      throw new Error(`Failed to fetch profiles: ${profilesRes.status}`)
    }

    const profiles = await profilesRes.json() as Array<{
      profileId: number
      countryCode: string
      accountInfo: { type: string; marketplaceStringId: string; name: string }
    }>

    // Store tokens for each profile
    const ctx = createAdsAdminContext()
    for (const profile of profiles) {
      const profileId = String(profile.profileId)
      await tokenStore.storeToken(profileId, tokenSet)

      // Upsert marketplace_profiles
      await ctx.ads
        .from(ctx.adsTable('marketplace_profiles'))
        .upsert({
          profile_id: profileId,
          marketplace_id: profile.accountInfo.marketplaceStringId,
          country_code: profile.countryCode,
          account_type: profile.accountInfo.type,
          account_name: profile.accountInfo.name,
          refresh_token: tokenSet.refresh_token,
          is_active: true,
          ads_api_authorized: true,
        }, { onConflict: 'profile_id' })
    }

    // Redirect to settings with success
    const redirectUrl = new URL('/ads/settings', request.nextUrl.origin)
    redirectUrl.searchParams.set('connected', 'true')
    redirectUrl.searchParams.set('profiles', String(profiles.length))
    if (state) redirectUrl.searchParams.set('state', state)

    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.redirect(
      new URL(`/ads/settings?error=${encodeURIComponent(message)}`, request.nextUrl.origin),
    )
  }
}
