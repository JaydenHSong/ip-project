// AD Optimizer — AutoPilot Action Builder
// Design Ref: §3.6 — 엔진 결과 → WriteBackAction[] 변환
// Plan SC: 모든 AI 액션 reason 로그 100%

import type { BidCalculation, AutoPilotAction, AutoPilotContext } from '../types'
import type { GoalStrategy } from './goal-strategy'

/** Convert bid calculation results to AutoPilot actions with reason. */
function buildBidActions(
  bids: BidCalculation[],
  strategy: GoalStrategy,
  context: AutoPilotContext,
  daypartMultipliers: Map<string, number>,
): AutoPilotAction[] {
  const actions: AutoPilotAction[] = []

  for (const bid of bids) {
    const daypartMult = daypartMultipliers.get(bid.keyword_id) ?? 1.0
    const adjustedBid = bid.suggested_bid * strategy.bid_multiplier * daypartMult

    // Clamp to max bid cap if set
    const maxCap = context.max_bid_cap
    const finalBid = maxCap ? Math.min(adjustedBid, maxCap) : adjustedBid

    // Round to 2 decimal places
    const roundedBid = Math.round(finalBid * 100) / 100

    // Skip if no meaningful change (< $0.01 difference)
    if (Math.abs(roundedBid - bid.current_bid) < 0.01) continue

    const direction = roundedBid > bid.current_bid ? 'increase' : 'decrease'
    const changePct = ((roundedBid - bid.current_bid) / bid.current_bid * 100).toFixed(1)

    actions.push({
      type: 'bid_adjust',
      campaign_id: context.campaign_id,
      keyword_id: bid.keyword_id,
      current_value: bid.current_bid,
      proposed_value: roundedBid,
      reason: `${context.goal_mode} mode: bid ${direction} ${changePct}% `
        + `(target ACoS ${context.target_acos}%, actual ${bid.actual_acos.toFixed(1)}%, `
        + `CVR ${bid.cvr.toFixed(1)}%, confidence ${bid.confidence}%)`,
      source: 'autopilot_formula',
      confidence: bid.confidence,
    })
  }

  return actions
}

/** Build campaign-level budget action. */
function buildBudgetAction(
  campaignId: string,
  currentBudget: number,
  proposedBudget: number,
  reason: string,
): AutoPilotAction {
  return {
    type: 'budget_adjust',
    campaign_id: campaignId,
    current_value: currentBudget,
    proposed_value: Math.round(proposedBudget * 100) / 100,
    reason,
    source: 'autopilot_formula',
    confidence: 80,
  }
}

/** Build campaign state action (pause/resume). */
function buildStateAction(
  campaignId: string,
  targetState: 'pause' | 'resume',
  reason: string,
): AutoPilotAction {
  return {
    type: 'campaign_state',
    campaign_id: campaignId,
    current_value: targetState === 'pause' ? 1 : 0,
    proposed_value: targetState === 'pause' ? 0 : 1,
    reason,
    source: 'autopilot_formula',
    confidence: 90,
  }
}

/** Convert keyword harvest/negate results to AutoPilot actions. */
function buildKeywordActions(
  harvests: { search_term: string; campaign_id: string; from_match: string }[],
  negates: { keyword_id: string; keyword_text: string; reason: string }[],
  context: AutoPilotContext,
): AutoPilotAction[] {
  const actions: AutoPilotAction[] = []

  for (const h of harvests) {
    actions.push({
      type: 'keyword_add',
      campaign_id: h.campaign_id,
      current_value: 0,
      proposed_value: 1,
      reason: `Auto harvest: "${h.search_term}" promoted from ${h.from_match} to exact`,
      source: 'autopilot_formula',
      confidence: 85,
    })
  }

  for (const n of negates) {
    actions.push({
      type: 'keyword_negate',
      campaign_id: context.campaign_id,
      keyword_id: n.keyword_id,
      current_value: 1,
      proposed_value: 0,
      reason: `Auto negate: ${n.reason}`,
      source: 'autopilot_formula',
      confidence: 80,
    })
  }

  return actions
}

export { buildBidActions, buildBudgetAction, buildStateAction, buildKeywordActions }
