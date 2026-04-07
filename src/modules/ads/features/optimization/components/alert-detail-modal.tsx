// M04 — Alert Detail Modal
// Design Ref: §5.3 M04
'use client'

import type { AlertDetailData } from '../types'

type AlertDetailModalProps = {
  alert: AlertDetailData | null
  isOpen: boolean
  onClose: () => void
  onAction: (alertId: string, actionKey: string) => void
}

const SEV_STYLES: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-orange-50 text-orange-700 border-orange-200',
  info: 'bg-th-bg-hover text-th-text-secondary border-th-border',
}

const SEV_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-orange-500',
  info: 'bg-gray-400',
}

const SEV_PROGRESS_BG: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-orange-500',
  info: 'bg-gray-400',
}

const AlertDetailModal = ({ alert, isOpen, onClose, onAction }: AlertDetailModalProps) => {
  if (!isOpen || !alert) return null

  const hourlySpend = alert.hourly_spend ?? []
  const kpiCards = alert.kpi_cards ?? []
  const heroProgress = alert.hero_progress ?? 0

  // Compute max for mini line chart
  const maxSpend = hourlySpend.length > 0 ? Math.max(...hourlySpend.map((h) => h.spend), 1) : 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-surface-card shadow-xl">
        {/* Header — Design M04: "Alert type dot + 캠페인명 + 메시지" */}
        <div className="flex items-center justify-between border-b border-th-border px-6 py-4">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${SEV_DOT[alert.severity]}`} />
            <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEV_STYLES[alert.severity]}`}>
              {alert.severity}
            </span>
            <h2 className="text-sm font-semibold text-th-text">{alert.alert_type}</h2>
          </div>
          <button onClick={onClose} className="text-th-text-muted hover:text-th-text-secondary text-lg leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Campaign + message */}
          <div>
            <p className="text-xs text-th-text-muted">{alert.campaign_name}</p>
            <p className="mt-0.5 text-sm text-th-text-secondary">{alert.message}</p>
            <p className="text-[10px] text-th-text-muted mt-1">{new Date(alert.created_at).toLocaleString()}</p>
          </div>

          {/* Hero Number + Critical Progress Bar — Design M04 */}
          {alert.hero_number && (
            <div className="rounded-lg border border-th-border bg-th-bg-hover p-4 text-center">
              <p className="text-3xl font-bold text-th-text">{alert.hero_number}</p>
              {alert.hero_label && (
                <p className="text-xs text-th-text-muted mt-1">{alert.hero_label}</p>
              )}
              <div className="mt-3 h-2 w-full rounded-full bg-th-bg-tertiary">
                <div
                  className={`h-2 rounded-full transition-all ${SEV_PROGRESS_BG[alert.severity]}`}
                  style={{ width: `${Math.min(heroProgress, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-th-text-muted mt-1">{heroProgress.toFixed(0)}% of budget consumed</p>
            </div>
          )}

          {/* KPI 3 Cards — Design M04: "Run Rate / Orders / ACoS" */}
          {kpiCards.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {kpiCards.map((kpi, idx) => (
                <div key={idx} className="rounded-lg border border-th-border bg-surface-card p-3 text-center">
                  <p className="text-[10px] text-th-text-muted uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-lg font-bold text-th-text mt-1">{kpi.value}</p>
                  {kpi.delta && (
                    <p className={`text-[10px] font-medium mt-0.5 ${
                      kpi.delta_type === 'positive' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {kpi.delta}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Spend Today 24h Mini Line Chart — Design M04 */}
          {hourlySpend.length > 0 && (
            <div className="rounded-lg border border-th-border bg-surface-card p-3">
              <p className="text-[10px] font-medium text-th-text-muted uppercase tracking-wide mb-2">Spend Today (24h)</p>
              <div className="relative h-16">
                {/* SVG line chart */}
                <svg className="h-full w-full" viewBox={`0 0 ${hourlySpend.length * 10} 64`} preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="16" x2={hourlySpend.length * 10} y2="16" stroke="#E5E7EB" strokeWidth="0.5" />
                  <line x1="0" y1="32" x2={hourlySpend.length * 10} y2="32" stroke="#E5E7EB" strokeWidth="0.5" />
                  <line x1="0" y1="48" x2={hourlySpend.length * 10} y2="48" stroke="#E5E7EB" strokeWidth="0.5" />
                  {/* Area fill */}
                  <path
                    d={`M0,64 ${hourlySpend.map((h, i) => `L${i * 10},${64 - (h.spend / maxSpend) * 56}`).join(' ')} L${(hourlySpend.length - 1) * 10},64 Z`}
                    fill="#F3F4F6"
                  />
                  {/* Line */}
                  <polyline
                    points={hourlySpend.map((h, i) => `${i * 10},${64 - (h.spend / maxSpend) * 56}`).join(' ')}
                    fill="none"
                    stroke="#18181B"
                    strokeWidth="1.5"
                  />
                </svg>
                {/* Hour labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between translate-y-4">
                  <span className="text-[8px] text-th-text-muted">0h</span>
                  <span className="text-[8px] text-th-text-muted">6h</span>
                  <span className="text-[8px] text-th-text-muted">12h</span>
                  <span className="text-[8px] text-th-text-muted">18h</span>
                  <span className="text-[8px] text-th-text-muted">24h</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions — Design M04: "RECOMMENDED 강조" */}
          <div className="flex gap-2">
            {alert.quick_actions.map((action) => {
              const isRecommended = action.recommended === true
              return (
                <button
                  key={action.key}
                  onClick={() => onAction(alert.id, action.key)}
                  className={`relative flex-1 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    isRecommended
                      ? 'bg-orange-500 text-white hover:bg-orange-600 ring-2 ring-orange-300 ring-offset-1'
                      : action.variant === 'danger'
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-th-text text-white hover:bg-th-text'
                  }`}
                >
                  {isRecommended && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded bg-orange-600 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
                      Recommended
                    </span>
                  )}
                  {action.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export { AlertDetailModal }
