// S03 — Campaign Status KPI Strip (8 cards)
// Design Ref: §2.1, §5.3 S03 "KPI 카드 8칸 (개인<->팀 전환)"
'use client'

import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import { ProgressBar } from '@/modules/ads/shared/components/progress-bar'
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
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-lg border border-th-border bg-th-bg-hover" />
        ))}
      </div>
    )
  }

  const pacingPct = summary.total_budget_mtd > 0
    ? (summary.total_spend_mtd / summary.total_budget_mtd) * 100
    : 0

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {/* 1. Active Campaigns */}
      <KpiCard
        label="Active"
        value={summary.active_campaigns}
        suffix={` / ${summary.total_campaigns}`}
      />
      {/* 2. Spend MTD */}
      <KpiCard
        label="Spend MTD"
        value={formatCurrency(summary.total_spend_mtd)}
      />
      {/* 3. Sales MTD */}
      <KpiCard
        label="Sales MTD"
        value={formatCurrency(summary.total_sales_mtd)}
      />
      {/* 4. Budget Pacing */}
      <div className="rounded-lg border border-th-border bg-surface-card p-4">
        <p className="text-xs text-th-text-muted">Budget Pacing</p>
        <p className="mt-1 text-2xl font-semibold text-th-text">
          {pacingPct.toFixed(0)}%
        </p>
        <ProgressBar value={pacingPct} showPercent={false} className="mt-2" />
      </div>
      {/* 5. Avg ACoS */}
      <KpiCard
        label="Avg ACoS"
        value={formatPercent(summary.avg_acos)}
      />
      {/* 6. Avg ROAS */}
      <KpiCard
        label="Avg ROAS"
        value={summary.avg_roas != null ? `${summary.avg_roas.toFixed(2)}x` : '-'}
      />
      {/* 7. Orders MTD */}
      <KpiCard
        label="Orders MTD"
        value={summary.total_orders_mtd.toLocaleString()}
      />
      {/* 8. Budget MTD */}
      <KpiCard
        label="Budget MTD"
        value={formatCurrency(summary.total_budget_mtd)}
      />
    </div>
  )
}

export { CampaignStatusStrip }
