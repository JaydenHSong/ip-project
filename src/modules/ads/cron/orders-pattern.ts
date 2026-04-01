// Cron: Orders DB → dayparting_hourly_weights (weekly)
// Analyzes order patterns to generate optimal hourly weights for dayparting

import { createAdminClient } from '@/lib/supabase/admin'

type PatternResult = {
  markets_analyzed: number
  weights_updated: number
  errors: number
}

export async function analyzeOrdersPattern(): Promise<PatternResult> {
  const supabase = createAdminClient()

  // TODO: When SP-API orders data is available:
  // 1. Fetch orders from the last 90 days grouped by marketplace
  // 2. Aggregate order counts by day_of_week + hour
  // 3. Normalize into 0.0–2.0 weight scale (1.0 = average)
  // 4. Upsert into ads.dayparting_hourly_weights
  // 5. Compare with previous weights and flag significant changes

  // Fetch distinct brand_markets that have campaigns
  const { data: brandMarkets, error } = await supabase
    .from('ads.campaigns')
    .select('brand_market_id')
    .eq('status', 'active')

  if (error) {
    throw new Error(`Failed to fetch brand markets: ${error.message}`)
  }

  // Deduplicate brand_market_ids
  const uniqueMarkets = [...new Set(brandMarkets?.map((c) => c.brand_market_id) ?? [])]

  const result: PatternResult = {
    markets_analyzed: uniqueMarkets.length,
    weights_updated: 0,
    errors: 0,
  }

  // TODO: Analyze order patterns per market and update weights
  void uniqueMarkets

  return result
}
