// S12 — Trend Alerts
// Design Ref: §2.1 spend-intelligence/components/trend-alerts.tsx
'use client'

import type { TrendAlertItem } from '../types'

type TrendAlertsProps = {
  items: TrendAlertItem[]
  className?: string
}

const SEV_STYLES: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-50',
  warning: 'border-l-orange-500 bg-orange-50',
  info: 'border-l-gray-300 bg-gray-50',
}

const DIR_ICONS: Record<string, string> = {
  worsening: '\u2198',  // ↘
  stable: '\u2192',      // →
  improving: '\u2197',   // ↗
}

const DIR_COLORS: Record<string, string> = {
  worsening: 'text-red-600',
  stable: 'text-gray-500',
  improving: 'text-emerald-600',
}

const TrendAlerts = ({ items, className = '' }: TrendAlertsProps) => {
  if (items.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Trend Alerts</h3>
        <p className="text-sm text-gray-400 text-center py-6">No concerning trends detected</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Trend Alerts</h3>
        <span className="text-xs text-gray-400">{items.length} alerts</span>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded border-l-2 px-3 py-2 ${SEV_STYLES[item.severity]}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${DIR_COLORS[item.direction]}`}>
                  {DIR_ICONS[item.direction]}
                </span>
                <span className="text-xs font-medium text-gray-700">
                  {item.metric}
                </span>
              </div>
              <span className="text-[10px] text-gray-400">
                {item.consecutive_weeks}w consecutive
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px]">
              <span className="text-gray-500">
                {item.previous_value.toFixed(1)} &rarr; {item.current_value.toFixed(1)}
              </span>
              {item.campaign_name && (
                <span className="text-gray-400">&middot; {item.campaign_name}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { TrendAlerts }
