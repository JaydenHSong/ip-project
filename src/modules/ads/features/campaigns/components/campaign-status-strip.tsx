// S03 — Campaign Status KPI Strip (8 cards)
// Design Ref: §2.1, §5.3 S03 "KPI 카드 8칸 (개인<->팀 전환)"
'use client'

import { ProgressBar } from '@/modules/ads/shared/components/progress-bar'
import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import type { CampaignKpiSummary } from '../types'

type CampaignStatusStripProps = {
  summary: CampaignKpiSummary | null
  isLoading?: boolean
}

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

const formatPercent = (value: number | null) => {
  if (value == null) return '-'
  return `${value.toFixed(1)}%`
}

const CampaignStatusStrip = ({ summary, isLoading }: CampaignStatusStripProps) => {
  const gridClassName = 'grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-8'

  if (isLoading) {
    return (
      <div className={gridClassName}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-lg border border-th-border bg-th-bg-hover" />
        ))}
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="rounded-lg border border-th-border bg-surface-card p-3">
        <p className="text-sm text-th-text-muted">No KPI summary yet for the selected market.</p>
      </div>
    )
  }

  const pacingPct = summary.total_budget_mtd > 0
    ? (summary.total_spend_mtd / summary.total_budget_mtd) * 100
    : 0

  const compactItems: {
    label: string
    value: string | number
    suffix?: string
  }[] = [
    { label: 'Active', value: summary.active_campaigns, suffix: ` / ${summary.total_campaigns}` },
    { label: 'Spend MTD', value: formatCurrency(summary.total_spend_mtd) },
    { label: 'Sales MTD', value: formatCurrency(summary.total_sales_mtd) },
    { label: 'Avg ACoS', value: formatPercent(summary.avg_acos) },
    { label: 'Avg ROAS', value: summary.avg_roas != null ? `${summary.avg_roas.toFixed(2)}` : '-', suffix: summary.avg_roas != null ? 'x' : undefined },
    { label: 'Orders MTD', value: summary.total_orders_mtd.toLocaleString() },
    { label: 'Budget MTD', value: formatCurrency(summary.total_budget_mtd) },
  ]

  return (
    <div className={gridClassName}>
      {compactItems.map((item) => (
        <KpiCard
          key={item.label}
          variant="dense"
          label={item.label}
          value={item.value}
          suffix={item.suffix}
        />
      ))}

      <div className="rounded-lg border border-th-border bg-surface-card px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wide text-th-text-muted">Budget Pacing</p>
          <p className="text-sm font-semibold text-th-text">{pacingPct.toFixed(0)}%</p>
        </div>
        <ProgressBar value={pacingPct} showPercent={false} className="mt-1.5" />
        <p className="mt-1 text-[10px] text-th-text-muted">
          {formatCurrency(summary.total_spend_mtd)} / {formatCurrency(summary.total_budget_mtd)}
        </p>
      </div>
    </div>
  )
}

export { CampaignStatusStrip }
