// AD Optimizer — AutoPilot Keyword Pipeline (FR-05)
// Design Ref: §3.7 — 자동 수확 + 제거 파이프라인
// Plan SC: SC-05 키워드 수확, SC-06 키워드 제거 (전환 오탈 0)

import type { AnyAdsDb } from '@/lib/supabase/ads-context'
import type { AutoPilotContext } from '../types'
import type { GoalStrategy } from './goal-strategy'
import { getStrategy, getInternalAcosTarget } from './goal-strategy'

type HarvestCandidate = {
  search_term: string
  campaign_id: string
  ad_group_id: string
  orders: number
  clicks: number
  acos: number
  spend: number
}

type NegateCandidate = {
  keyword_id: string
  keyword_text: string
  campaign_id: string
  clicks: number
  spend: number
  orders: number
}

type HarvestResult = {
  promoted: { search_term: string; campaign_id: string; from_match: string }[]
  negated: { keyword_id: string; keyword_text: string; reason: string }[]
  skipped_harvest: number
  skipped_negate: number
}

/**
 * 수확: search_term_reports에서 전환 검색어 추출 → Exact 승격.
 * 조건: orders ≥ strategy.keyword_harvest_min_orders
 *       AND ACoS < internal_acos_target AND clicks ≥ 10
 */
async function findHarvestCandidates(
  campaign: AutoPilotContext,
  strategy: GoalStrategy,
  db: AnyAdsDb,
): Promise<HarvestCandidate[]> {
  const internalTarget = getInternalAcosTarget(campaign.target_acos, campaign.goal_mode)

  const { data } = await db
    .from('search_term_reports')
    .select('search_term, campaign_id, ad_group_id, orders_7d, clicks_7d, acos_7d, spend_7d')
    .eq('campaign_id', campaign.campaign_id)
    .gte('orders_7d', strategy.keyword_harvest_min_orders)
    .gte('clicks_7d', 10)
    .lt('acos_7d', internalTarget)

  if (!data?.length) return []

  return data.map(row => ({
    search_term: row.search_term as string,
    campaign_id: row.campaign_id as string,
    ad_group_id: row.ad_group_id as string,
    orders: (row.orders_7d as number) ?? 0,
    clicks: (row.clicks_7d as number) ?? 0,
    acos: (row.acos_7d as number) ?? 0,
    spend: (row.spend_7d as number) ?? 0,
  }))
}

/**
 * 제거: active 키워드 중 orders=0, clicks ≥ threshold, spend > $5.
 * G09 guardrail 체크 — 전환 있는 키워드는 절대 negate 하지 않음.
 */
async function findNegateCandidates(
  campaign: AutoPilotContext,
  strategy: GoalStrategy,
  db: AnyAdsDb,
): Promise<NegateCandidate[]> {
  const { data } = await db
    .from('keywords')
    .select('amazon_keyword_id, keyword_text, campaign_id, clicks_7d, spend_7d, orders_7d')
    .eq('campaign_id', campaign.campaign_id)
    .eq('state', 'enabled')
    .eq('orders_7d', 0)
    .gte('clicks_7d', strategy.keyword_negate_min_clicks)
    .gt('spend_7d', 5)

  if (!data?.length) return []

  return data.map(row => ({
    keyword_id: row.amazon_keyword_id as string,
    keyword_text: row.keyword_text as string,
    campaign_id: row.campaign_id as string,
    clicks: (row.clicks_7d as number) ?? 0,
    spend: (row.spend_7d as number) ?? 0,
    orders: (row.orders_7d as number) ?? 0,
  }))
}

/** Filter out search terms already existing as exact keywords. */
async function filterExistingExact(
  candidates: HarvestCandidate[],
  db: AnyAdsDb,
): Promise<HarvestCandidate[]> {
  if (!candidates.length) return []

  const terms = candidates.map(c => c.search_term)
  const { data: existing } = await db
    .from('keywords')
    .select('keyword_text')
    .in('keyword_text', terms)
    .eq('match_type', 'exact')
    .eq('state', 'enabled')

  const existingSet = new Set((existing ?? []).map(r => r.keyword_text as string))
  return candidates.filter(c => !existingSet.has(c.search_term))
}

/** Run the full keyword pipeline for autopilot campaigns in a profile. */
async function runKeywordPipeline(
  profileId: string,
  campaigns: AutoPilotContext[],
  db: AnyAdsDb,
): Promise<HarvestResult> {
  const result: HarvestResult = { promoted: [], negated: [], skipped_harvest: 0, skipped_negate: 0 }

  for (const campaign of campaigns) {
    const strategy = getStrategy(campaign.goal_mode)

    // Harvest
    const harvestRaw = await findHarvestCandidates(campaign, strategy, db)
    const harvestFiltered = await filterExistingExact(harvestRaw, db)
    result.skipped_harvest += harvestRaw.length - harvestFiltered.length

    for (const candidate of harvestFiltered) {
      result.promoted.push({
        search_term: candidate.search_term,
        campaign_id: candidate.campaign_id,
        from_match: 'auto',
      })
    }

    // Negate — G09 safety: orders > 0 already filtered out in query (orders_7d = 0)
    const negateCandidates = await findNegateCandidates(campaign, strategy, db)
    for (const candidate of negateCandidates) {
      // Double-check: never negate if any orders exist (G09 safety)
      if (candidate.orders > 0) {
        result.skipped_negate += 1
        continue
      }
      result.negated.push({
        keyword_id: candidate.keyword_id,
        keyword_text: candidate.keyword_text,
        reason: `Zero conversions after ${candidate.clicks} clicks, $${candidate.spend.toFixed(2)} spend`,
      })
    }
  }

  return result
}

export { runKeywordPipeline, findHarvestCandidates, findNegateCandidates }
export type { HarvestResult, HarvestCandidate, NegateCandidate }
