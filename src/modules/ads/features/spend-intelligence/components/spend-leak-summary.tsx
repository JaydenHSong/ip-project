// S12 — Spend Leak Summary
// Design Ref: §2.1 spend-intelligence/components/spend-leak-summary.tsx
'use client'

import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import type { SpendLeakSummary } from '../types'

type SpendLeakSummaryProps = {
  data: SpendLeakSummary | null
  isLoading?: boolean
}

const fmt = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

const DIAGNOSIS_LABELS: Record<string, string> = {
  underspend: 'Underspend',
  overspend: 'Overspend',
  waste: 'Waste',
  trend_decline: 'Declining Trend',
  none: 'All Clear',
}

const SpendLeakSummaryCard = ({ data, isLoading }: SpendLeakSummaryProps) => {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard
        label="Total Waste (7d)"
        value={fmt(data.total_waste)}
      />
      <KpiCard
        label="Campaigns Affected"
        value={data.total_campaigns_affected}
      />
      <KpiCard
        label="Top Issue"
        value={DIAGNOSIS_LABELS[data.top_issue] ?? data.top_issue}
      />
      <KpiCard
        label="Leak Items"
        value={data.items.length}
      />
    </div>
  )
}

export { SpendLeakSummaryCard }
