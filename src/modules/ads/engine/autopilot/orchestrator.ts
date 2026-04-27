// AD Optimizer — AutoPilot Orchestrator (FR-01)
// Design Ref: §3.5 — 실행 순서 제어 (핵심)
// Plan SC: Target ACoS 천장, 이중 안전장치 무결성, reason 100%

import type { AnyAdsDb } from '@/lib/supabase/ads-context'
import type { AutoPilotContext, AutoPilotSkipped, MetricsSnapshot, BidCalculation } from '../types'
import type { WriteBackAction, WriteBackResult } from '@/modules/ads/api/services/write-back-service'
import type { AiRecommendation } from './ai-reviewer'
import { getStrategy, getInternalAcosTarget } from './goal-strategy'
import { getLearningPhase, getConstraints, filterByConstraints } from './learning-guard'
import { filterBySoftGuard } from './soft-guard'
import { buildBidActions, buildStateAction } from './action-builder'
import { checkRetailSignals } from './retail-signal'
import { calculateBid } from '../bid-calculator'
import { checkGuardrails } from '../guardrails'

type OrchestratorDeps = {
  db: AnyAdsDb
  executeBatch: (actions: WriteBackAction[]) => Promise<WriteBackResult[]>
  aiReviewRecommendations?: AiRecommendation[]
}

type OrchestratorOutput = {
  executed: WriteBackResult[]
  skipped: AutoPilotSkipped[]
  total_actions: number
  total_blocked: number
}

/** Run AutoPilot for a single campaign. */
async function runAutoPilot(
  campaign: AutoPilotContext,
  metrics: MetricsSnapshot,
  deps: OrchestratorDeps,
): Promise<OrchestratorOutput> {
  const allSkipped: AutoPilotSkipped[] = []

  // 1. Strategy + internal target
  const strategy = getStrategy(campaign.goal_mode)
  const internalTarget = getInternalAcosTarget(campaign.target_acos, campaign.goal_mode)

  // 2. Learning phase constraints
  const phase = getLearningPhase(campaign.learning_day, campaign.confidence_score)
  const constraints = getConstraints(phase)

  // 3. Retail Signal check — inventory 0 → instant pause, BuyBox lost → reduce
  const [retailSignal] = await checkRetailSignals([campaign], deps.db)
  if (retailSignal?.recommended_action === 'pause') {
    const pauseAction: WriteBackAction = {
      type: 'campaign_state',
      campaign_id: campaign.campaign_id,
      current_value: 1,
      proposed_value: 0,
      details: { reason: retailSignal.reason, source: 'autopilot_formula' },
    }
    const executed = await deps.executeBatch([pauseAction])
    return { executed, skipped: [], total_actions: 1, total_blocked: 0 }
  }
  const retailMultiplier = retailSignal?.bid_multiplier ?? 1.0

  // 4. Fetch active keywords for bid calculation
  const keywords = await fetchKeywordMetrics(campaign, deps.db)

  // 5. Calculate bids for each keyword
  const bidResults: BidCalculation[] = keywords.map(kw => calculateBid({
    campaign_id: campaign.campaign_id,
    keyword_id: kw.keyword_id,
    current_bid: kw.current_bid,
    target_acos: internalTarget,
    actual_acos: kw.acos,
    cvr: kw.cvr,
    aov: kw.aov,
    clicks: kw.clicks,
    orders: kw.orders,
  }))

  // 5b. Apply retail signal multiplier + AI review recommendations (±10%)
  const adjustedBids = bidResults.map(bid => {
    let adjusted = bid.suggested_bid * retailMultiplier
    // AI review: find matching recommendation and apply within ±10%
    const aiRec = deps.aiReviewRecommendations?.find(
      r => r.campaign_id === bid.campaign_id && r.recommendation_type === 'bid_strategy',
    )
    if (aiRec && aiRec.confidence >= 0.7) {
      const aiMultiplier = Math.max(0.9, Math.min(1.1, parseFloat(aiRec.suggested_value) || 1.0))
      adjusted = adjusted * aiMultiplier
    }
    return { ...bid, suggested_bid: adjusted }
  })

  // 6. Build actions (bid adjustments)
  const daypartMultipliers = new Map<string, number>()
  const rawActions = buildBidActions(adjustedBids, strategy, campaign, daypartMultipliers)

  // 7. Soft Guard filter (Layer 1 — 예측 선제 차단)
  const softResult = filterBySoftGuard(rawActions, metrics, campaign.target_acos, internalTarget)
  allSkipped.push(...softResult.blocked)

  // 8. Learning Guard filter
  const learnResult = filterByConstraints(softResult.allowed, constraints)
  allSkipped.push(...learnResult.blocked)

  // 9. Hard Guard filter (Layer 2 — G01~G10 + HG01~05)
  const finalActions: WriteBackAction[] = []
  let cycleActionCount = 0

  for (const action of learnResult.allowed) {
    const guardrail = checkGuardrails({
      action_type: action.type,
      campaign_id: action.campaign_id,
      current_value: action.current_value,
      proposed_value: action.proposed_value,
      max_bid_cap: campaign.max_bid_cap ?? undefined,
      confidence_score: campaign.confidence_score,
      current_acos_7d: metrics.acos_7d ?? undefined,
      target_acos: campaign.target_acos,
      learning_day: campaign.learning_day,
      cycle_action_count: cycleActionCount,
    })

    if (guardrail.blocked) {
      allSkipped.push({
        action,
        blocked_by: 'hard_guard',
        guard_reason: guardrail.reason ?? 'Blocked by hard guard',
      })
      continue
    }

    finalActions.push({
      type: action.type,
      campaign_id: action.campaign_id,
      keyword_id: action.keyword_id,
      current_value: action.current_value,
      proposed_value: action.proposed_value,
      details: {
        reason: action.reason,
        source: action.source,
        confidence: action.confidence,
        goal_mode: campaign.goal_mode,
        learning_phase: phase,
        max_bid_cap: campaign.max_bid_cap,
      },
    })
    cycleActionCount += 1
  }

  // 10. Execute via WriteBackService
  const executed = finalActions.length > 0
    ? await deps.executeBatch(finalActions)
    : []

  return {
    executed,
    skipped: allSkipped,
    total_actions: finalActions.length,
    total_blocked: allSkipped.length,
  }
}

// ─── Internal helpers ───

type KeywordMetric = {
  keyword_id: string
  current_bid: number
  acos: number
  cvr: number
  aov: number
  clicks: number
  orders: number
}

async function fetchKeywordMetrics(
  campaign: AutoPilotContext,
  db: AnyAdsDb,
): Promise<KeywordMetric[]> {
  const { data } = await db
    .from('keywords')
    .select('amazon_keyword_id, bid, acos_7d, cvr_7d, aov_7d, clicks_7d, orders_7d')
    .eq('campaign_id', campaign.campaign_id)
    .eq('state', 'enabled')
    .gt('clicks_7d', 0)

  if (!data?.length) return []

  return data.map(row => ({
    keyword_id: row.amazon_keyword_id as string,
    current_bid: (row.bid as number) ?? 0,
    acos: (row.acos_7d as number) ?? 0,
    cvr: (row.cvr_7d as number) ?? 0,
    aov: (row.aov_7d as number) ?? 50,
    clicks: (row.clicks_7d as number) ?? 0,
    orders: (row.orders_7d as number) ?? 0,
  }))
}

export { runAutoPilot }
export type { OrchestratorDeps, OrchestratorOutput }
