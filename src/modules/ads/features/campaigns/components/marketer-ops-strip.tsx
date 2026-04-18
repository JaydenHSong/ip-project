'use client'

import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import type { MarketerDashboardData } from '@/modules/ads/features/dashboard/types'

const formatSnakeTitle = (value: string) =>
  value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')

type MarketerOpsStripProps = {
  data: MarketerDashboardData | null
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

const MarketerOpsStrip = ({ data, isLoading, error, onRetry }: MarketerOpsStripProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-lg border border-th-border bg-th-bg-hover" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="text-sm font-medium text-red-700">Unable to load marketer summary</p>
        <p className="mt-1 text-xs text-red-600">{error}</p>
        {onRetry ? (
          <button
            onClick={onRetry}
            className="mt-2 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        ) : null}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-th-border bg-surface-card p-3">
        <p className="text-sm text-th-text-muted">No marketer summary available for the selected market.</p>
      </div>
    )
  }

  const criticalAlerts = data.alerts.filter((alert) => alert.severity === 'critical').length
  const highPriorityRecs = data.recommendations.filter((rec) => rec.priority >= 8).length
  const alertItems = data.alerts.slice(0, 3)
  const recommendationItems = data.recommendations.slice(0, 3)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <KpiCard
          variant="dense"
          label="Campaigns in market"
          value={data.campaign_count}
          hint="Total campaigns for this brand market"
        />
        <KpiCard
          variant="dense"
          label="Open alerts"
          value={data.alert_count}
          hint={
            criticalAlerts > 0
              ? `${criticalAlerts} critical in recent list`
              : 'Unresolved alerts for this market'
          }
        />
        <KpiCard
          variant="dense"
          label="Pending recommendations"
          value={data.recommendation_count}
          hint={
            highPriorityRecs > 0
              ? `${highPriorityRecs} high-impact in recent list`
              : 'Keyword / bid actions awaiting review'
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-th-border bg-surface-card p-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-th-text-muted">Recent alerts</h3>
          <div className="mt-2 space-y-1.5">
            {alertItems.length === 0 ? (
              <p className="text-xs text-th-text-muted">No open alerts.</p>
            ) : (
              alertItems.map((alert) => (
                <div key={alert.id} className="rounded border border-th-border bg-th-bg-hover px-2 py-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-th-text">{alert.title}</p>
                      <p className="truncate text-[10px] text-th-text-muted">{formatSnakeTitle(alert.alert_type)}</p>
                    </div>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      alert.severity === 'critical'
                        ? 'bg-red-50 text-red-700'
                        : alert.severity === 'warning'
                        ? 'bg-orange-50 text-orange-700'
                        : 'bg-th-bg-tertiary text-th-text-muted'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-th-border bg-surface-card p-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-th-text-muted">Top recommendations</h3>
          <div className="mt-2 space-y-1.5">
            {recommendationItems.length === 0 ? (
              <p className="text-xs text-th-text-muted">No pending recommendations.</p>
            ) : (
              recommendationItems.map((recommendation) => (
                <div key={recommendation.id} className="rounded border border-th-border bg-th-bg-hover px-2 py-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-th-text">{recommendation.keyword_text}</p>
                      <p className="truncate text-[10px] text-th-text-muted">{formatSnakeTitle(recommendation.type)}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-th-text-muted">P{recommendation.priority}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { MarketerOpsStrip }
