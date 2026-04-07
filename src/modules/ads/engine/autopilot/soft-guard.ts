// AD Optimizer — AutoPilot Soft Guard (Layer 1)
// Design Ref: §3.3 — 예측 기반 선제 차단
// Plan SC: Target ACoS = 천장, 이중 안전장치

import type { AutoPilotAction, AutoPilotSkipped, MetricsSnapshot } from '../types'

type SoftGuardInput = {
  action: AutoPilotAction
  current_metrics: MetricsSnapshot
  target_acos: number
  internal_acos_target: number
}

type SoftGuardResult = {
  allowed: boolean
  reason: string | null
  predicted_acos_after: number | null
}

/**
 * Layer 1 Soft Guard — 예측 ACoS 기반 선제 차단.
 * - ACoS가 이미 internal target 초과 → bid 인상 전부 차단
 * - bid 인상 시 예측 ACoS > target → 차단
 */
function checkSoftGuard(input: SoftGuardInput): SoftGuardResult {
  const { action, current_metrics, target_acos, internal_acos_target } = input
  const currentAcos = current_metrics.acos_7d

  // Non-bid actions pass through soft guard
  if (action.type !== 'bid_adjust') {
    return { allowed: true, reason: null, predicted_acos_after: null }
  }

  const isBidIncrease = action.proposed_value > action.current_value

  // Rule 1: ACoS already at or above internal target → block all bid increases
  if (currentAcos !== null && currentAcos >= internal_acos_target && isBidIncrease) {
    return {
      allowed: false,
      reason: `ACoS ${currentAcos.toFixed(1)}% already at internal target ${internal_acos_target.toFixed(1)}%. Bid increase blocked.`,
      predicted_acos_after: null,
    }
  }

  // Rule 2: Predict ACoS after bid change (linear approximation)
  if (isBidIncrease && currentAcos !== null && action.current_value > 0) {
    const bidRatio = action.proposed_value / action.current_value
    const predictedAcos = currentAcos * bidRatio

    if (predictedAcos > target_acos) {
      return {
        allowed: false,
        reason: `Predicted ACoS ${predictedAcos.toFixed(1)}% would exceed target ${target_acos}%`,
        predicted_acos_after: predictedAcos,
      }
    }

    return { allowed: true, reason: null, predicted_acos_after: predictedAcos }
  }

  // Bid decreases always pass soft guard
  return { allowed: true, reason: null, predicted_acos_after: null }
}

/** Batch filter: run soft guard on all actions, split into allowed + blocked. */
function filterBySoftGuard(
  actions: AutoPilotAction[],
  metrics: MetricsSnapshot,
  targetAcos: number,
  internalTarget: number,
): { allowed: AutoPilotAction[]; blocked: AutoPilotSkipped[] } {
  const allowed: AutoPilotAction[] = []
  const blocked: AutoPilotSkipped[] = []

  for (const action of actions) {
    const result = checkSoftGuard({
      action,
      current_metrics: metrics,
      target_acos: targetAcos,
      internal_acos_target: internalTarget,
    })

    if (result.allowed) {
      allowed.push(action)
    } else {
      blocked.push({
        action,
        blocked_by: 'soft_guard',
        guard_reason: result.reason ?? 'Blocked by soft guard',
      })
    }
  }

  return { allowed, blocked }
}

export { checkSoftGuard, filterBySoftGuard }
export type { SoftGuardInput, SoftGuardResult }
