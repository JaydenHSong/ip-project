// S12 — Quick Fix Actions
// Design Ref: §2.1 spend-intelligence/components/quick-fix-actions.tsx
'use client'

import type { QuickFixAction } from '../types'

type QuickFixActionsProps = {
  items: QuickFixAction[]
  onExecute: (action: QuickFixAction) => void
  className?: string
}

const SEV_STYLES: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-orange-500',
  low: 'border-l-gray-300',
}

const ACTION_LABELS: Record<string, string> = {
  pause: 'Pause Campaign',
  reduce_budget: 'Reduce Budget',
  adjust_bids: 'Adjust Bids',
}

const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(0)}`

const QuickFixActions = ({ items, onExecute, className = '' }: QuickFixActionsProps) => {
  if (items.length === 0) {
    return (
      <div className={`rounded-lg border border-th-border bg-surface-card p-4 ${className}`}>
        <h3 className="text-sm font-medium text-th-text mb-3">Quick Fixes</h3>
        <p className="text-sm text-th-text-muted text-center py-6">No quick fixes available</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-th-border bg-surface-card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-th-text">Quick Fixes</h3>
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
          {items.length} available
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between rounded border-l-2 bg-th-bg-hover px-3 py-2.5 ${SEV_STYLES[item.severity]}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-th-bg-tertiary px-1.5 py-0.5 text-[10px] font-medium text-th-text-secondary">
                  {ACTION_LABELS[item.action_type] ?? item.action_type}
                </span>
                <span className="text-xs text-th-text-muted truncate">{item.campaign_name}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-th-text-muted">{item.description}</p>
              {item.estimated_impact > 0 && (
                <p className="mt-0.5 text-[10px] text-emerald-600">
                  Est. savings: {fmt(item.estimated_impact)}/week
                </p>
              )}
            </div>
            <button
              onClick={() => onExecute(item)}
              className="ml-3 shrink-0 rounded-md bg-th-text px-3 py-1 text-xs font-medium text-white hover:bg-th-text transition-colors"
            >
              Apply
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export { QuickFixActions }
