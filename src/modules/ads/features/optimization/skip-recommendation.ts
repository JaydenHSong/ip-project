// Persist "Skip" for keyword_recommendations (Paper S03 / S11)
// Design Ref: ads-dashboard-s01-s03-matching Plan §9

import { createAdsAdminClient } from '@/lib/supabase/admin'

const skipRecommendation = async (id: string, brandMarketId: string) => {
  const supabase = createAdsAdminClient()

  const { data: rec, error } = await supabase
    .from('keyword_recommendations')
    .select('id, status, brand_market_id')
    .eq('id', id)
    .single()

  if (error || !rec) throw new Error('Recommendation not found')
  if (rec.brand_market_id !== brandMarketId) throw new Error('Market mismatch')
  if (rec.status !== 'pending') throw new Error('Recommendation is not pending')

  const { error: upErr } = await supabase
    .from('keyword_recommendations')
    .update({ status: 'skipped' })
    .eq('id', id)

  if (upErr) throw upErr
  return { success: true as const }
}

export { skipRecommendation }
