// S06 — Keyword Action Queue (promote/negate list)
// Design Ref: §2.1 optimization/components/keyword-action-queue.tsx
'use client'

import type { RecommendationItem } from '../types'

type KeywordActionQueueProps = {
  items: RecommendationItem[]
  onApprove: (id: string) => void
  onSkip: (id: string) => void
  className?: string
}

const KeywordActionQueue = ({ items, onApprove, onSkip, className = '' }: KeywordActionQueueProps) => {
  if (items.length === 0) return null

  return (
    <div className={`space-y-1 ${className}`}>
      {items.map((item) => {
        const isPromote = item.recommendation_type === 'promote'
        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 rounded border-l-2 bg-white px-3 py-2 ${
              isPromote ? 'border-l-emerald-500' : 'border-l-red-400 border-dashed'
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-700 truncate">{item.keyword_text}</p>
              <p className="text-[11px] text-gray-400">{item.campaign_name}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isPromote && item.suggested_bid && (
                <span className="text-xs font-mono text-emerald-600">+${item.suggested_bid.toFixed(2)}</span>
              )}
              <button onClick={() => onApprove(item.id)} className="rounded bg-gray-900 px-2 py-0.5 text-[10px] text-white hover:bg-gray-800">
                {isPromote ? 'Promote' : 'Negate'}
              </button>
              <button onClick={() => onSkip(item.id)} className="text-[10px] text-gray-400 hover:text-gray-600">Skip</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { KeywordActionQueue }
