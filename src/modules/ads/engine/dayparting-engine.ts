// AD Optimizer — Dayparting Engine
// Design Ref: §2.1 engine/dayparting-engine.ts — 시간대별 bid multiplier

import type { DaypartMultiplier } from './types'

type WeightData = {
  day_of_week: number
  hour: number
  weight: number
}

const DEFAULT_MULTIPLIER = 1.0
const MIN_MULTIPLIER = 0.1
const MAX_MULTIPLIER = 3.0

/**
 * weight 데이터를 bid multiplier로 변환
 * weight 평균 = 1.0 기준, 높으면 bid 올리고 낮으면 내림
 */
const calculateMultipliers = (weights: WeightData[]): DaypartMultiplier[] => {
  if (weights.length === 0) return []

  // 전체 평균 weight
  const avgWeight = weights.reduce((sum, w) => sum + w.weight, 0) / weights.length

  return weights.map((w) => {
    const rawMultiplier = avgWeight > 0 ? w.weight / avgWeight : DEFAULT_MULTIPLIER
    const clamped = Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, rawMultiplier))

    return {
      day_of_week: w.day_of_week,
      hour: w.hour,
      multiplier: Math.round(clamped * 100) / 100,
      source: 'orders_db' as const,
    }
  })
}

/**
 * 현재 시각의 bid multiplier 조회
 */
const getCurrentMultiplier = (
  multipliers: DaypartMultiplier[],
  dayOfWeek: number,
  hour: number,
): number => {
  const match = multipliers.find(
    (m) => m.day_of_week === dayOfWeek && m.hour === hour,
  )
  return match?.multiplier ?? DEFAULT_MULTIPLIER
}

export { calculateMultipliers, getCurrentMultiplier, DEFAULT_MULTIPLIER }
