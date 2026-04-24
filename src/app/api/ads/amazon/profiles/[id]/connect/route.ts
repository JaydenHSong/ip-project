// Design Ref: §4.2 — Connect a specific profile to a marketplace
// POST /api/ads/amazon/profiles/:id/connect

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'
import { parseBody } from '@/lib/api/validate-body'
import { connectProfileSchema } from '@/modules/ads/features/amazon/schemas'

export const POST = withAuth(async (request: NextRequest, { params }) => {
  const profileId = params.id

  // Plan SC-3: Zod validation — marketplace_id required.
  const parsed = await parseBody(request, connectProfileSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  const ctx = createAdsAdminContext()

  const { error } = await ctx.ads
    .from(ctx.adsTable('marketplace_profiles'))
    .upsert({
      profile_id: profileId,
      marketplace_id: body.marketplace_id,
      is_active: true,
      ads_api_authorized: true,
    }, { onConflict: 'profile_id' })

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: { connected: true, profile_id: profileId } })
}, ['admin', 'owner'])
