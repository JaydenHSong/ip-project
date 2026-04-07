// AD Optimizer — AutoPilot Goal Strategy (FR-02)
// Design Ref: §3.1 — 4종 Goal Mode 전략 파라미터
// Plan SC: Target ACoS = 천장 (acos_internal_target_ratio로 구현)

type GoalMode = 'launch' | 'growth' | 'profit' | 'defend'

type GoalStrategy = {
  bid_multiplier: number
  budget_utilization_target: number
  acos_internal_target_ratio: number
  keyword_harvest_min_orders: number
  keyword_negate_min_clicks: number
  sov_priority: boolean
}

const STRATEGIES: Record<GoalMode, GoalStrategy> = {
  launch: {
    bid_multiplier: 1.3,
    budget_utilization_target: 90,
    acos_internal_target_ratio: 0.80,
    keyword_harvest_min_orders: 1,
    keyword_negate_min_clicks: 25,
    sov_priority: true,
  },
  growth: {
    bid_multiplier: 1.1,
    budget_utilization_target: 85,
    acos_internal_target_ratio: 0.85,
    keyword_harvest_min_orders: 2,
    keyword_negate_min_clicks: 15,
    sov_priority: false,
  },
  profit: {
    bid_multiplier: 0.85,
    budget_utilization_target: 75,
    acos_internal_target_ratio: 0.70,
    keyword_harvest_min_orders: 3,
    keyword_negate_min_clicks: 10,
    sov_priority: false,
  },
  defend: {
    bid_multiplier: 1.0,
    budget_utilization_target: 80,
    acos_internal_target_ratio: 0.90,
    keyword_harvest_min_orders: 2,
    keyword_negate_min_clicks: 20,
    sov_priority: true,
  },
}

function getStrategy(mode: GoalMode): GoalStrategy {
  return STRATEGIES[mode]
}

/** Target ACoS × ratio = AI 내부 운영 목표. 항상 Target 아래. */
function getInternalAcosTarget(targetAcos: number, mode: GoalMode): number {
  return targetAcos * STRATEGIES[mode].acos_internal_target_ratio
}

export { getStrategy, getInternalAcosTarget, STRATEGIES }
export type { GoalMode, GoalStrategy }
