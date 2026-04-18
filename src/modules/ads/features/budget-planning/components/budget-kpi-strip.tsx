// S13 — Budget KPI Strip (4 cards: team total; autopilot included in spend/plan semantics)
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-lg border border-th-border bg-th-bg-hover" />
        ))}
      </div>
    )
  }

  const useMarketSpendForCard = data.ytd_spent === 0 && data.ytd_spent_market > 0
  const teamVsMarketHint = useMarketSpendForCard
    ? 'Team-attributed YTD is $0 (no spend on campaigns linked to your org for this market). Showing market-wide YTD from the same snapshot data as campaign KPIs.'
    : undefined

  const ytdSpentDisplay = useMarketSpendForCard ? data.ytd_spent_market : data.ytd_spent

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard label="Annual Planned" value={fmt(data.annual_planned)} />
      <KpiCard
        label={useMarketSpendForCard ? 'YTD Spent (market)' : 'YTD Spent'}
        value={fmt(ytdSpentDisplay)}
        hint={teamVsMarketHint}
      />
      <KpiCard label="YTD Planned" value={fmt(data.ytd_planned)} />
      <KpiCard label="Remaining" value={fmt(data.remaining)} />
    </div>
  )
}

export { BudgetKpiStrip }
