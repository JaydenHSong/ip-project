// AD Optimizer — Bid Calculator
// Design Ref: §2.1 engine/bid-calculator.ts — ACoS 기반 bid 계산
// Formula: suggested_bid = target_acos × AOV × CVR

import type { BidCalculation } from './types'

type BidCalcInput = {
  campaign_id: string
  keyword_id: string
  current_bid: number
  target_acos: number
  actual_acos: number
  cvr: number
  aov: number
  clicks: number
  orders: number
}

const MIN_CLICKS_FOR_CALC = 10
const MIN_CONFIDENCE = 0.3

const calculateBid = (input: BidCalcInput): BidCalculation => {
  const { campaign_id, keyword_id, current_bid, target_acos, actual_acos, cvr, aov, clicks, orders } = input

  // 데이터 부족 시 현재 bid 유지
  if (clicks < MIN_CLICKS_FOR_CALC || cvr === 0) {
    return {
      campaign_id,
      keyword_id,
      current_bid,
      suggested_bid: current_bid,
      target_acos,
      actual_acos,
      cvr,
      aov,
      confidence: 0,
    }
  }

  // Core formula: bid = target_acos × AOV × CVR
  const rawBid = (target_acos / 100) * aov * (cvr / 100)

  // Confidence based on data volume
  const confidence = Math.min(1, Math.sqrt(orders / 30))

  // Blend: low confidence → closer to current bid
  const blendedBid = confidence >= MIN_CONFIDENCE
    ? current_bid * (1 - confidence) + rawBid * confidence
    : current_bid

  // Round to 2 decimal places
  const suggested_bid = Math.round(blendedBid * 100) / 100

  return {
    campaign_id,
    keyword_id,
    current_bid,
    suggested_bid: Math.max(0.02, suggested_bid),
    target_acos,
    actual_acos,
    cvr,
    aov,
    confidence: Math.round(confidence * 100) / 100,
  }
}

export { calculateBid, MIN_CLICKS_FOR_CALC }
