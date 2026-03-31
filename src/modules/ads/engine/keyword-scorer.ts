// AD Optimizer — Keyword Scorer
// Design Ref: §2.1 engine/keyword-scorer.ts — 키워드 점수화
// Formula: score = (CVR × relevance) / ACoS

import type { KeywordScore } from './types'

type KeywordScoreInput = {
  keyword_id: string
  keyword_text: string
  cvr: number
  acos: number
  clicks: number
  orders: number
  impressions: number
  spend: number
  sales: number
}

const MIN_CLICKS = 5

const scoreKeyword = (input: KeywordScoreInput): KeywordScore => {
  const { keyword_id, keyword_text, cvr, acos, clicks, orders, impressions, spend, sales } = input

  // 데이터 부족
  if (clicks < MIN_CLICKS) {
    return {
      keyword_id,
      keyword_text,
      score: 0,
      cvr,
      acos,
      relevance: 0,
      recommendation: 'keep',
    }
  }

  // Relevance: CTR 기반 (높을수록 관련성 높음)
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
  const relevance = Math.min(1, ctr / 2)  // CTR 2%+ → relevance 1.0

  // Score: (CVR × relevance) / max(ACoS, 1)
  const effectiveAcos = Math.max(acos, 1)
  const score = (cvr * relevance) / effectiveAcos * 100

  // Recommendation logic
  let recommendation: KeywordScore['recommendation'] = 'keep'
  if (orders === 0 && spend > 10) {
    recommendation = 'negate'
  } else if (acos > 0 && acos < 20 && orders >= 3) {
    recommendation = 'promote'
  } else if (acos > 50 || (clicks > 20 && sales === 0)) {
    recommendation = 'negate'
  } else if (score > 0) {
    recommendation = 'adjust_bid'
  }

  return {
    keyword_id,
    keyword_text,
    score: Math.round(score * 100) / 100,
    cvr,
    acos,
    relevance: Math.round(relevance * 100) / 100,
    recommendation,
  }
}

export { scoreKeyword, MIN_CLICKS }
