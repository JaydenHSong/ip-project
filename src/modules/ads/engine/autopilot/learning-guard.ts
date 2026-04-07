// AD Optimizer — AutoPilot Learning Guard (FR-06)
// Design Ref: §3.2 — 학습 단계별 스킬 제약
// Plan SC: Learning Week 1 예산 50% 미만

import type { AutoPilotAction, AutoPilotSkipped } from '../types'

type LearningPhase = 'week1' | 'week2' | 'graduated'

type LearningConstraints = {
  max_budget_utilization: number
  max_bid_change_pct: number
  allow_negate: boolean
  negate_min_clicks: number
  allow_harvest: boolean
  max_actions_per_cycle: number
}

const PHASES: Record<LearningPhase, LearningConstraints> = {
  week1: {
    max_budget_utilization: 50,
    max_bid_change_pct: 10,
    allow_negate: false,
    negate_min_clicks: Infinity,
    allow_harvest: false,
    max_actions_per_cycle: 5,
  },
  week2: {
    max_budget_utilization: 70,
    max_bid_change_pct: 20,
    allow_negate: true,
    negate_min_clicks: 30,
    allow_harvest: true,
    max_actions_per_cycle: 15,
  },
  graduated: {
    max_budget_utilization: 100,
    max_bid_change_pct: 30,
    allow_negate: true,
    negate_min_clicks: 15,
    allow_harvest: true,
    max_actions_per_cycle: 50,
  },
}

/** day 14+ AND confidence ≥ 60 → graduated. day 7~13 → week2. else week1. */
function getLearningPhase(learningDay: number, confidenceScore: number): LearningPhase {
  if (learningDay >= 14 && confidenceScore >= 60) return 'graduated'
  if (learningDay >= 7) return 'week2'
  return 'week1'
}

function getConstraints(phase: LearningPhase): LearningConstraints {
  return PHASES[phase]
}

/** Filter actions by learning constraints. Returns allowed + blocked lists. */
function filterByConstraints(
  actions: AutoPilotAction[],
  constraints: LearningConstraints,
): { allowed: AutoPilotAction[]; blocked: AutoPilotSkipped[] } {
  const allowed: AutoPilotAction[] = []
  const blocked: AutoPilotSkipped[] = []

  for (const action of actions) {
    // Cap total actions per cycle
    if (allowed.length >= constraints.max_actions_per_cycle) {
      blocked.push({
        action,
        blocked_by: 'learning_guard',
        guard_reason: `Max ${constraints.max_actions_per_cycle} actions/cycle in learning phase`,
      })
      continue
    }

    // Block negate if not allowed
    if (action.type === 'keyword_negate' && !constraints.allow_negate) {
      blocked.push({
        action,
        blocked_by: 'learning_guard',
        guard_reason: 'Keyword negate not allowed in current learning phase',
      })
      continue
    }

    // Block bid changes exceeding learning limit
    if (action.type === 'bid_adjust' && action.current_value > 0) {
      const changePct = Math.abs(action.proposed_value - action.current_value) / action.current_value * 100
      if (changePct > constraints.max_bid_change_pct) {
        blocked.push({
          action,
          blocked_by: 'learning_guard',
          guard_reason: `Bid change ${changePct.toFixed(0)}% exceeds learning limit ${constraints.max_bid_change_pct}%`,
        })
        continue
      }
    }

    allowed.push(action)
  }

  return { allowed, blocked }
}

export { getLearningPhase, getConstraints, filterByConstraints, PHASES }
export type { LearningPhase, LearningConstraints }
