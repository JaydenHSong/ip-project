// AD Optimizer — Budget Pacer
// Design Ref: §2.1 engine/budget-pacer.ts — Daily pacing 로직

import type { BudgetPacingResult } from './types'

type PacerInput = {
  campaign_id: string
  daily_budget: number
  spent_today: number
  current_hour: number  // 0-23
  hourly_weights?: number[]  // 24 values, sum = 1.0
}

// 균등 분배 (fallback)
const EVEN_WEIGHTS = Array.from({ length: 24 }, () => 1 / 24)

const calculatePacing = (input: PacerInput): BudgetPacingResult => {
  const { campaign_id, daily_budget, spent_today, current_hour, hourly_weights } = input
  const weights = hourly_weights ?? EVEN_WEIGHTS

  const remaining_budget = Math.max(0, daily_budget - spent_today)
  const utilization_pct = daily_budget > 0 ? (spent_today / daily_budget) * 100 : 0

  // 남은 시간의 weight 합산
  const remaining_weight_sum = weights
    .slice(current_hour)
    .reduce((sum, w) => sum + w, 0)

  // 다음 1시간 추천 지출
  const current_weight = weights[current_hour] ?? (1 / 24)
  const recommended_hourly_spend = remaining_weight_sum > 0
    ? remaining_budget * (current_weight / remaining_weight_sum)
    : 0

  // 예상 소진율 기준 on-pace 판단
  const expected_utilization = weights
    .slice(0, current_hour + 1)
    .reduce((sum, w) => sum + w, 0) * 100
  const is_on_pace = Math.abs(utilization_pct - expected_utilization) < 15

  return {
    campaign_id,
    daily_budget,
    spent_today,
    remaining_budget: Math.round(remaining_budget * 100) / 100,
    utilization_pct: Math.round(utilization_pct * 100) / 100,
    recommended_hourly_spend: Math.round(recommended_hourly_spend * 100) / 100,
    is_on_pace,
  }
}

export { calculatePacing, EVEN_WEIGHTS }
