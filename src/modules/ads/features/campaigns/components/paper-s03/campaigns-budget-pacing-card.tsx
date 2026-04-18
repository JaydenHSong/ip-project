'use client'

import { ProgressBar } from '@/modules/ads/shared/components/progress-bar'
import type { CampaignKpiSummary, CampaignListItem } from '@/modules/ads/features/campaigns/types'
import type { BudgetKpiData } from '@/modules/ads/features/budget-planning/types'

type CampaignsBudgetPacingCardProps = {
  kpi: CampaignKpiSummary | null
  budgetKpi: BudgetKpiData | null
  campaigns: CampaignListItem[]
  tabCritical: number
  tabAttention: number
  aiQueuePending: number
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${Math.round(value).toLocaleString()}`
}

const monthDayLabel = () => {
  const now = new Date()
  const day = now.getDate()
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return `Day ${day}/${last}`
}

const CampaignsBudgetPacingCard = ({
  kpi,
  budgetKpi,
  campaigns,
  tabCritical,
  tabAttention,
  aiQueuePending,
  isLoading,
  error,
  onRetry,
}: CampaignsBudgetPacingCardProps) => {
  if (isLoading) {
    return (
      <div className="h-48 animate-pulse rounded-lg border border-th-border bg-th-bg-hover" />
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50/90 p-3 dark:bg-red-950/30">
        <p className="text-sm font-medium text-red-700 dark:text-red-300">Unable to load budget pacing</p>
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-th-bg-hover dark:text-red-200"
          >
            Retry
          </button>
        ) : null}
      </div>
    )
  }

  if (!kpi) {
    return (
      <div className="rounded-lg border border-th-border bg-surface-card p-4">
        <p className="text-sm text-th-text-muted">No KPI data for this market.</p>
      </div>
    )
  }

  const spend = kpi.total_spend_mtd
  const budget = kpi.total_budget_mtd
  const spendPct = budget > 0 ? (spend / budget) * 100 : 0
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const targetPct = (now.getDate() / lastDay) * 100
  const delta = spendPct - targetPct
  const paceLabel =
    Math.abs(delta) < 3 ? 'On Pace' : delta > 0 ? 'Ahead of linear pace' : 'Below linear pace'

  const targets = campaigns.filter((c) => c.target_acos != null && c.target_acos > 0)
  const avgTargetAcos =
    targets.length > 0
      ? targets.reduce((s, c) => s + (c.target_acos ?? 0), 0) / targets.length
      : null

  const spendForYtdPct =
    budgetKpi && budgetKpi.ytd_spent > 0 ? budgetKpi.ytd_spent : (budgetKpi?.ytd_spent_market ?? 0)

  const ytdPct =
    budgetKpi && budgetKpi.annual_planned > 0
      ? Math.round((spendForYtdPct / budgetKpi.annual_planned) * 100)
      : null

  return (
    <div className="rounded-lg border border-th-border bg-surface-card p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-th-text">My Budget Pacing</h2>
        <span className="text-[11px] text-th-text-muted">{monthDayLabel()}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-th-text">{formatCurrency(spend)}</p>
      <div className="mt-2">
        <ProgressBar value={Math.min(spendPct, 100)} showPercent={false} />
        <div className="mt-1 flex justify-between text-[11px] text-th-text-muted">
          <span>{spendPct.toFixed(0)}% spent</span>
          <span>/ {formatCurrency(budget)}</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-th-text-secondary">
        <span className="text-th-text-muted">●</span> {paceLabel} — {spendPct.toFixed(0)}% spent, target{' '}
        {targetPct.toFixed(0)}%
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-th-border pt-3 sm:grid-cols-4">
        <div className="rounded border border-th-border bg-th-bg-hover/50 px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-th-text-muted">YTD · Annual</p>
          <p className="text-xs font-medium text-th-text">
            {ytdPct != null ? `${ytdPct}%` : '—'}
          </p>
        </div>
        <div className="rounded border border-th-border bg-th-bg-hover/50 px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-th-text-muted">ACoS vs target</p>
          <p className="text-xs font-medium text-th-text">
            {kpi.avg_acos != null && avgTargetAcos != null ? (
              <>
                <span className={kpi.avg_acos <= avgTargetAcos ? 'text-emerald-600' : 'text-orange-600'}>
                  {kpi.avg_acos.toFixed(1)}%
                </span>
                <span className="text-th-text-muted"> vs {avgTargetAcos.toFixed(1)}%</span>
              </>
            ) : (
              '—'
            )}
          </p>
        </div>
        <div className="rounded border border-th-border bg-th-bg-hover/50 px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-th-text-muted">Critical / Attention</p>
          <p className="text-xs font-medium text-th-text">
            {tabCritical} / {tabAttention}
          </p>
        </div>
        <div className="rounded border border-th-border bg-th-bg-hover/50 px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-th-text-muted">AI Queue</p>
          <p className="text-xs font-medium text-orange-600">{aiQueuePending}</p>
        </div>
      </div>
    </div>
  )
}

export { CampaignsBudgetPacingCard }
