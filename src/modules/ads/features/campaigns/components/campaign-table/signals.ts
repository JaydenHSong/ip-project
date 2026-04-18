// S03 — Campaign health signal (shared: table tabs + Paper status dots)
// Design Ref: Plan Phase 2 §9 — 단일 진실

import type { CampaignListItem } from '../../types'
import type { CampaignSignal, CampaignViewTab, ScoredCampaign } from './types'

const MS_24H = 24 * 60 * 60 * 1000

const isWithinLast24h = (iso: string | null | undefined) => {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t < MS_24H
}

const scoreCampaignSignal = (campaign: CampaignListItem): CampaignSignal => {
  const budgetBase = campaign.daily_budget ?? (campaign.weekly_budget ? campaign.weekly_budget / 7 : 0)
  const spendRatio = budgetBase > 0 ? campaign.spend_today / budgetBase : 0

  /**
   * 일예산(또는 주간÷7) 소진으로 멈춘 직후 pause: 최근 24h 이내 전환 + 지출이 예산의 상당 부분 사용.
   * 오래된 pause·수동 pause(당일이어도 지출 비율 낮음)는 Attention 아님(normal).
   */
  if (campaign.status === 'paused') {
    const recent =
      isWithinLast24h(campaign.paused_at ?? null) || isWithinLast24h(campaign.updated_at ?? null)
    const depleted = budgetBase > 0 && spendRatio >= 0.9
    if (recent && depleted) {
      return 'attention'
    }
    return 'normal'
  }

  const acosRatio =
    campaign.acos != null && campaign.target_acos != null && campaign.target_acos > 0
      ? campaign.acos / campaign.target_acos
      : 0
  const isCritical = spendRatio >= 1.05 || acosRatio >= 1.2
  const isAttention = !isCritical && (spendRatio >= 0.8 || acosRatio >= 1 || campaign.mode === 'autopilot')

  return isCritical ? 'critical' : isAttention ? 'attention' : 'normal'
}

const scoreCampaigns = (campaigns: CampaignListItem[]): ScoredCampaign[] =>
  campaigns.map((c) => ({ ...c, signal: scoreCampaignSignal(c) }))

const computeTabCounts = (scored: ScoredCampaign[]): Record<CampaignViewTab, number> => ({
  all: scored.length,
  critical: scored.filter((c) => c.signal === 'critical').length,
  attention: scored.filter((c) => c.signal === 'attention').length,
  autopilot: scored.filter((c) => c.mode === 'autopilot').length,
})

export { scoreCampaigns, computeTabCounts }
