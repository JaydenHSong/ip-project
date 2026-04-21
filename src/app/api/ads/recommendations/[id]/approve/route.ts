// POST /api/ads/recommendations/[id]/approve — Approve recommendation
// Design Ref: §4.2 + §4.6 — DB approve + write-back to Amazon

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'
import { approveRecommendation } from '@/modules/ads/features/optimization/queries'
import { createWriteBackService, isMockMode } from '@/modules/ads/api/factory'
import type { ApproveRequest } from '@/modules/ads/features/optimization/types'
import type { WriteBackAction } from '@/modules/ads/api/services/write-back-service'

export const POST = withAuth(async (req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'Recommendation ID is required' } },
      { status: 400 },
    )
  }

  try {
    const body = await req.json() as ApproveRequest
    const result = await approveRecommendation(id, body.adjusted_bid)

    // §4.6: Write-back to Amazon (if enabled)
    let amazonApplied = false
    if (!isMockMode()) {
      const profileId = process.env.AMAZON_ADS_PROFILE_ID_US ?? ''
      if (profileId) {
        // Fetch recommendation + campaign for Amazon IDs
        const ctx = createAdsAdminContext()
        const { data: rec } = await ctx.ads
          .from(ctx.adsTable('keyword_recommendations'))
          .select('recommendation_type, keyword_text, current_bid, suggested_bid, campaign_id')
          .eq('id', id)
          .single()

        if (rec) {
          const { data: campaign } = await ctx.ads
            .from(ctx.adsTable('campaigns'))
            .select('amazon_campaign_id, max_bid_cap')
            .eq('id', rec.campaign_id)
            .single()

          if (campaign?.amazon_campaign_id) {
            const writeBackService = createWriteBackService(profileId)
            const action: WriteBackAction = {
              type: mapRecommendationType(rec.recommendation_type),
              campaign_id: campaign.amazon_campaign_id,
              current_value: Number(rec.current_bid ?? 0),
              proposed_value: Number(body.adjusted_bid ?? rec.suggested_bid ?? 0),
              details: {
                recommendation_id: id,
                max_bid_cap: campaign.max_bid_cap,
              },
            }
            const writeResult = await writeBackService.execute(action)
            amazonApplied = writeResult.applied
          }
        }
      }
    }

    return NextResponse.json({ data: { ...result, amazon_applied: amazonApplied } })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])

function mapRecommendationType(type: string): WriteBackAction['type'] {
  switch (type) {
    case 'bid_adjust': return 'bid_adjust'
    case 'promote': return 'keyword_add'
    case 'negate': return 'keyword_negate'
    case 'new_keyword': return 'keyword_add'
    default: return 'bid_adjust'
  }
}
