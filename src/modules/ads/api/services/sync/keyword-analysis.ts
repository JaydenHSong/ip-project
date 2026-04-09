// Design Ref: §3.3 P2 — Search term analysis → keyword recommendations

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdsPort, DateRange } from '../../ports/ads-port'
import type { AnalysisResult } from './index'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export async function analyzeKeywordsImpl(
  adsPort: AdsPort,
  db: SupabaseClient<any, any>,
  profileId: string,
): Promise<AnalysisResult> {
  const result: AnalysisResult = {
    campaigns_analyzed: 0,
    recommendations_created: 0,
    negative_keywords_found: 0,
    errors: 0,
  }

  try {
    const { data: mpProfile } = await db
      .from('marketplace_profiles')
      .select('id, brand_market_id')
      .eq('ads_profile_id', profileId)
      .single()

    if (!mpProfile) {
      result.errors = 1
      return result
    }

    const { data: campaigns } = await db
      .from('campaigns')
      .select('id, amazon_campaign_id, target_acos, brand_market_id')
      .eq('marketplace_profile_id', mpProfile.id)
      .eq('status', 'active')
      .in('campaign_type', ['sp'])

    if (!campaigns?.length) return result

    const dateRange: DateRange = {
      start: daysAgo(14),
      end: daysAgo(1),
    }

    for (const campaign of campaigns) {
      if (!campaign.amazon_campaign_id) continue

      try {
        const searchTerms = await adsPort.getSearchTermReport(
          campaign.amazon_campaign_id,
          dateRange,
        )
        result.campaigns_analyzed += 1

        const targetAcos = Number(campaign.target_acos) || 30

        // Expire old pending recommendations
        await db
          .from('keyword_recommendations')
          .update({ status: 'expired' })
          .eq('campaign_id', campaign.id)
          .eq('status', 'pending')

        for (const term of searchTerms) {
          // High performer: promote
          if (term.orders > 0 && term.acos < targetAcos && term.clicks >= 5) {
            const { error } = await db
              .from('keyword_recommendations')
              .insert({
                campaign_id: campaign.id,
                brand_market_id: campaign.brand_market_id,
                recommendation_type: 'promote',
                keyword_text: term.search_term,
                match_type: 'exact',
                suggested_bid: Math.round(term.cost / term.clicks * 100) / 100,
                estimated_impact: term.sales,
                impact_level: term.orders >= 3 ? 'high' : term.orders >= 1 ? 'medium' : 'low',
                reason: `ACoS ${term.acos.toFixed(1)}% < target ${targetAcos}%, ${term.orders} orders`,
                source: 'search_term_analysis',
                look_back_days: 14,
                metrics: { impressions: term.impressions, clicks: term.clicks, cost: term.cost, sales: term.sales, orders: term.orders, acos: term.acos },
                status: 'pending',
              })

            if (!error) result.recommendations_created += 1
          }

          // Waster: negate
          if (term.orders === 0 && term.clicks > 10 && term.cost > 5) {
            const { error } = await db
              .from('keyword_recommendations')
              .insert({
                campaign_id: campaign.id,
                brand_market_id: campaign.brand_market_id,
                recommendation_type: 'negate',
                keyword_text: term.search_term,
                match_type: 'negative',
                estimated_impact: term.cost,
                impact_level: term.cost > 20 ? 'high' : term.cost > 10 ? 'medium' : 'low',
                reason: `${term.clicks} clicks, $${term.cost.toFixed(2)} spend, 0 orders`,
                source: 'search_term_analysis',
                look_back_days: 14,
                metrics: { impressions: term.impressions, clicks: term.clicks, cost: term.cost, sales: 0, orders: 0, acos: 0 },
                status: 'pending',
              })

            if (!error) {
              result.recommendations_created += 1
              result.negative_keywords_found += 1
            }
          }
        }
      } catch {
        result.errors += 1
      }
    }
  } catch (err) {
    result.errors += 1
    throw err
  }

  return result
}
