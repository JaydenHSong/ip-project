// S02 — Budget Pacing Bar (full-width brand×market progress bars)
// Design Ref: §5.3 S02 "Budget Pacing 전폭 (브랜드×마켓 프로그레스바 + 타겟 마커)"
'use client'

import type { BudgetPacingItem } from '../types'

type BudgetPacingBarProps = {
  items: BudgetPacingItem[]
  className?: string
}

const formatCurrency = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

const getBarColor = (pct: number, onTrack: boolean): string => {
  if (!onTrack && pct > 100) return 'bg-red-500'
  if (!onTrack) return 'bg-orange-500'
  return 'bg-emerald-500'
}

const BudgetPacingBar = ({ items, className = '' }: BudgetPacingBarProps) => {
  if (items.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Budget Pacing</h3>
        <p className="text-sm text-gray-400 text-center py-8">No budget data for this period</p>
      </div>
    )
  }

  // Expected pacing based on day of month
  const dayOfMonth = new Date().getDate()
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const expectedPct = (dayOfMonth / daysInMonth) * 100

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Budget Pacing</h3>
        <span className="text-xs text-gray-400">
          Day {dayOfMonth}/{daysInMonth} &middot; Expected: {expectedPct.toFixed(0)}%
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={`${item.brand_market_id}-${item.channel}`}>
            {/* Row header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">
                  {item.brand} {item.market}
                </span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-500">
                  {item.channel.toUpperCase()}
                </span>
                {!item.on_track && (
                  <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                    Off Track
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {formatCurrency(item.actual)} / {formatCurrency(item.planned)}
              </div>
            </div>

            {/* Progress bar with target marker */}
            <div className="relative h-2.5 w-full rounded-full bg-gray-100">
              {/* Actual spend bar */}
              <div
                className={`h-2.5 rounded-full transition-all ${getBarColor(item.pacing_pct, item.on_track)}`}
                style={{ width: `${Math.min(item.pacing_pct, 100)}%` }}
              />
              {/* Expected pacing marker */}
              <div
                className="absolute top-0 h-2.5 w-0.5 bg-gray-900"
                style={{ left: `${Math.min(expectedPct, 100)}%` }}
                title={`Expected: ${expectedPct.toFixed(0)}%`}
              />
            </div>

            {/* Pacing percentage */}
            <div className="mt-0.5 text-right">
              <span className={`text-[11px] font-medium ${
                item.on_track ? 'text-emerald-600' : 'text-orange-600'
              }`}>
                {item.pacing_pct.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { BudgetPacingBar }
