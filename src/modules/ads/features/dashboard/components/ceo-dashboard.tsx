// S01 — CEO Dashboard
// Design Ref: §5.3 S01
// Brand Pulse × 3, AI Status, Alert count, ROAS Trend 30d, ACoS Heatmap
'use client'

import { BrandPulseCard } from './brand-pulse-card'
import { AcosHeatmap } from './acos-heatmap'
import { RoasTrendChart } from './roas-trend-chart'
import type { CeoDashboardData } from '../types'

type CeoDashboardProps = {
  data: CeoDashboardData | null
  isLoading?: boolean
  errorMessage?: string | null
  onRetry?: () => void
}

const AI_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  healthy: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Healthy' },
  warning: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Warning' },
  error: { bg: 'bg-red-50', text: 'text-red-700', label: 'Error' },
}

const SkeletonCard = () => (
  <div className="h-48 animate-pulse rounded-lg border border-th-border bg-th-bg-hover" />
)

const CeoDashboard = ({ data, isLoading, errorMessage, onRetry }: CeoDashboardProps) => {
  if (errorMessage) {
    return (
      <div className="rounded-lg border border-th-border bg-surface-card p-6 text-center">
        <p className="text-sm text-red-700">{errorMessage}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-md bg-th-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Retry
          </button>
        ) : null}
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="h-48 animate-pulse rounded-lg border border-th-border bg-th-bg-hover" />
        <div className="h-32 animate-pulse rounded-lg border border-th-border bg-th-bg-hover" />
      </div>
    )
  }

  const aiStyle = AI_STATUS_STYLES[data.ai_status] ?? AI_STATUS_STYLES.healthy

  return (
    <div className="space-y-6">
      {/* Top bar: AI Status + Alert Count */}
      <div className="flex items-center gap-4">
        {/* AI Status signal — Design S01: "AI Status 신호등" */}
        <div className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 ${aiStyle.bg}`}>
          <span className={`h-2 w-2 rounded-full ${
            data.ai_status === 'healthy' ? 'bg-emerald-500' :
            data.ai_status === 'warning' ? 'bg-orange-500' : 'bg-red-500'
          }`} />
          <span className={`text-xs font-medium ${aiStyle.text}`}>AI: {aiStyle.label}</span>
        </div>

        {/* Alert count badge — Design S01: "Alert 카운트 뱃지" */}
        {data.alerts_count > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-1.5">
            <span className="text-xs font-medium text-red-700">
              {data.alerts_count} alert{data.alerts_count > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Brand Pulse Cards × 3 — Design S01 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {data.brands.length > 0 ? (
          data.brands.map((brand) => (
            <BrandPulseCard key={brand.brand_id} brand={brand} />
          ))
        ) : (
          <div className="col-span-3 text-center py-12 text-sm text-th-text-muted">
            No brand data available
          </div>
        )}
      </div>

      {/* ROAS Trend 30d — Design S01 */}
      <RoasTrendChart data={data.roas_trend_30d} />

      {/* ACoS Heatmap — Design S01: "Brand×Market ACoS 히트맵 3×4" */}
      <AcosHeatmap data={data.acos_heatmap} />
    </div>
  )
}

export { CeoDashboard }
