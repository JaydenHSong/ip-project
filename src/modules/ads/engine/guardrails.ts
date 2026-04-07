// AD Optimizer — 10 Guardrails (FR-G01~G10)
// Design Ref: §2.1 engine/guardrails.ts — 10개 안전장치
// Plan SC: 모든 자동화 액션에 guardrail 선행

import type { GuardrailCheckParams } from './types'

type GuardrailResult = {
  blocked: boolean
  guardrail_id: string | null
  reason: string | null
}

const GUARDRAILS: Record<string, (p: GuardrailCheckParams) => GuardrailResult | null> = {
  // FR-G01: Max bid cap — bid가 캠페인 max_bid_cap 초과 불가
  'G01_MAX_BID': (p) => {
    if (p.action_type !== 'bid_adjust' || !p.max_bid_cap) return null
    if (p.proposed_value > p.max_bid_cap) {
      return { blocked: true, guardrail_id: 'G01', reason: `Bid $${p.proposed_value} exceeds max cap $${p.max_bid_cap}` }
    }
    return null
  },

  // FR-G02: Bid change limit — 한 번에 ±30% 이상 변경 불가
  'G02_BID_CHANGE_LIMIT': (p) => {
    if (p.action_type !== 'bid_adjust') return null
    const changePct = Math.abs(p.proposed_value - p.current_value) / p.current_value
    if (changePct > 0.3) {
      return { blocked: true, guardrail_id: 'G02', reason: `Bid change ${(changePct * 100).toFixed(0)}% exceeds 30% limit` }
    }
    return null
  },

  // FR-G03: Daily budget floor — budget $0 이하 불가
  'G03_BUDGET_FLOOR': (p) => {
    if (p.action_type !== 'budget_adjust') return null
    if (p.proposed_value <= 0) {
      return { blocked: true, guardrail_id: 'G03', reason: 'Budget cannot be zero or negative' }
    }
    return null
  },

  // FR-G04: Budget change limit — 한 번에 ±30% 이상 변경 불가
  'G04_BUDGET_CHANGE_LIMIT': (p) => {
    if (p.action_type !== 'budget_adjust') return null
    const changePct = Math.abs(p.proposed_value - p.current_value) / p.current_value
    if (changePct > 0.3) {
      return { blocked: true, guardrail_id: 'G04', reason: `Budget change ${(changePct * 100).toFixed(0)}% exceeds 30% limit` }
    }
    return null
  },

  // FR-G05: Learning period protection — learning 상태 캠페인 bid 변경 불가
  'G05_LEARNING_PROTECT': (p) => {
    if (p.action_type !== 'bid_adjust') return null
    if (p.confidence_score !== undefined && p.confidence_score < 50) {
      return { blocked: true, guardrail_id: 'G05', reason: 'Campaign is in learning period (confidence < 50%)' }
    }
    return null
  },

  // FR-G06: Minimum bid floor — bid $0.02 미만 불가
  'G06_MIN_BID': (p) => {
    if (p.action_type !== 'bid_adjust') return null
    if (p.proposed_value < 0.02) {
      return { blocked: true, guardrail_id: 'G06', reason: `Bid $${p.proposed_value} below minimum $0.02` }
    }
    return null
  },

  // FR-G07: Pause protection — 7일 내 이미 pause/resume 2회 이상이면 차단
  'G07_PAUSE_THROTTLE': (p) => {
    if (p.action_type !== 'campaign_pause' && p.action_type !== 'campaign_resume') return null
    if (p.recent_pause_count !== undefined && p.recent_pause_count >= 2) {
      return { blocked: true, guardrail_id: 'G07', reason: `Campaign already paused/resumed ${p.recent_pause_count} times in last 7 days` }
    }
    return null
  },

  // FR-G08: Bulk action limit — 한 번에 100개 이상 키워드 변경 불가
  'G08_BULK_LIMIT': (p) => {
    if (p.affected_count !== undefined && p.affected_count > 100) {
      return { blocked: true, guardrail_id: 'G08', reason: `Bulk action affects ${p.affected_count} keywords, exceeds 100 limit` }
    }
    return null
  },

  // FR-G09: Negative keyword safety — 전환 있는 키워드 negate 차단
  'G09_NEGATE_SAFETY': (p) => {
    if (p.action_type !== 'keyword_negate') return null
    if (p.keyword_orders !== undefined && p.keyword_orders > 0) {
      return { blocked: true, guardrail_id: 'G09', reason: `Cannot negate keyword with ${p.keyword_orders} orders — has active conversions` }
    }
    return null
  },

  // FR-G10: Rollback window — 자동화 액션 후 2시간 내만 롤백 가능
  'G10_ROLLBACK_WINDOW': (p) => {
    if (p.action_type !== 'rollback') return null
    if (p.last_action_at) {
      const elapsed = Date.now() - new Date(p.last_action_at).getTime()
      const twoHours = 2 * 60 * 60 * 1000
      if (elapsed > twoHours) {
        return { blocked: true, guardrail_id: 'G10', reason: `Rollback window expired — action was ${Math.round(elapsed / 3600000)}h ago (max 2h)` }
      }
    }
    return null
  },

  // ─── AutoPilot Hard Guards (HG-01~05) ───
  // Design Ref: §3.4 — Layer 2 절대 규칙

  // HG-01: Target ACoS 천장 — ACoS > Target 시 bid 인상 차단
  'HG01_ACOS_CEILING': (p) => {
    if (p.current_acos_7d === undefined || p.target_acos === undefined) return null
    if (p.current_acos_7d > p.target_acos && p.action_type === 'bid_adjust' && p.proposed_value > p.current_value) {
      return { blocked: true, guardrail_id: 'HG01', reason: `ACoS ${p.current_acos_7d}% exceeds target ${p.target_acos}%. Bid increase blocked.` }
    }
    return null
  },

  // HG-02: 일일 예산 80% 도달 → bid 인상 중단
  'HG02_DAILY_BUDGET_80': (p) => {
    if (p.daily_spend_pct === undefined) return null
    if (p.daily_spend_pct >= 80 && p.action_type === 'bid_adjust' && p.proposed_value > p.current_value) {
      return { blocked: true, guardrail_id: 'HG02', reason: `Daily budget ${p.daily_spend_pct.toFixed(0)}% spent. Bid increase blocked.` }
    }
    return null
  },

  // HG-03: 주간 예산 100% 도달 → 전체 액션 차단
  'HG03_WEEKLY_BUDGET_FULL': (p) => {
    if (p.weekly_spend_pct === undefined) return null
    if (p.weekly_spend_pct >= 100) {
      return { blocked: true, guardrail_id: 'HG03', reason: `Weekly budget fully spent (${p.weekly_spend_pct.toFixed(0)}%). All actions blocked.` }
    }
    return null
  },

  // HG-04: Learning 기간 스킬 위반 최종 차단 (week1에서 과격한 bid 변경)
  'HG04_LEARNING_VIOLATION': (p) => {
    if (p.learning_day === undefined || p.learning_day >= 14) return null
    if (p.action_type === 'bid_adjust' && p.current_value > 0) {
      const changePct = Math.abs(p.proposed_value - p.current_value) / p.current_value * 100
      const limit = p.learning_day < 7 ? 10 : 20
      if (changePct > limit) {
        return { blocked: true, guardrail_id: 'HG04', reason: `Learning day ${p.learning_day}: bid change ${changePct.toFixed(0)}% exceeds hard limit ${limit}%` }
      }
    }
    return null
  },

  // HG-05: 한 사이클 액션 수 상한 50개
  'HG05_ACTION_LIMIT': (p) => {
    if (p.cycle_action_count === undefined) return null
    if (p.cycle_action_count >= 50) {
      return { blocked: true, guardrail_id: 'HG05', reason: `Cycle action limit reached (${p.cycle_action_count}/50)` }
    }
    return null
  },
}

const checkGuardrails = (params: GuardrailCheckParams): GuardrailResult => {
  for (const [, check] of Object.entries(GUARDRAILS)) {
    const result = check(params)
    if (result?.blocked) return result
  }
  return { blocked: false, guardrail_id: null, reason: null }
}

export { checkGuardrails, GUARDRAILS }
export type { GuardrailResult }
