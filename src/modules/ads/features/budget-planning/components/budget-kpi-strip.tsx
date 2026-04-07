// S13 — Budget KPI Strip (5 cards)
// Design Ref: §5.3 S13 "KPI Strip 5카드 (Annual/YTD Spent/YTD Planned/Remaining/Auto Pilot)"
'use client'

import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import type { BudgetKpiData } from '../types'

type BudgetKpiStripProps = {
  data: BudgetKpiData | null
  isLoading?: boolean
}

const fmt = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

const BudgetKpiStrip = ({ data, isLoading }: BudgetKpiStripProps) => {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-lg border border-th-border bg-th-bg-hover" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <KpiCard label="Annual Planned" value={fmt(data.annual_planned)} />
      <KpiCard label="YTD Spent" value={fmt(data.ytd_spent)} />
      <KpiCard label="YTD Planned" value={fmt(data.ytd_planned)} />
      <KpiCard label="Remaining" value={fmt(data.remaining)} />
      <KpiCard label="Auto Pilot" value={fmt(data.autopilot_total)} />
    </div>
  )
}

export { BudgetKpiStrip }
