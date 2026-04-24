// POST /api/ads/rules/simulate — Dry-run rule simulation

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'
import { parseBody } from '@/lib/api/validate-body'
import { simulateRuleSchema } from '@/modules/ads/features/rules/schemas'

export const POST = withAuth(async (req) => {
  // Plan SC-3: Zod validation — covers required fields + lookback_days range.
  const parsed = await parseBody(req, simulateRuleSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  try {
    const ctx = createAdsAdminContext()
    const lookbackDays = body.lookback_days ?? 7

    // Fetch campaigns that match the brand_market for simulation
    const { data: campaigns, error } = await ctx.ads
      .from(ctx.adsTable('campaigns'))
      .select('id, name, status, target_acos, daily_budget')
      .eq('brand_market_id', body.brand_market_id)
      .eq('status', 'active')

    if (error) throw error

    // TODO: Apply rule conditions/actions against campaign data
    // For now, return matched campaigns count as simulation preview
    const simulationResult = {
      matched_campaigns: campaigns?.length ?? 0,
      affected_items: [],
      estimated_impact: {
        budget_change: 0,
        bid_change: 0,
      },
      lookback_days: lookbackDays,
      dry_run: true,
    }

    return NextResponse.json({ data: simulationResult })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])
