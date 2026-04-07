// M02 — AI Action Queue Preview
// Design Ref: §2.1 campaigns/components/ai-queue-preview.tsx
// Shows pending AI recommendations for a specific campaign
'use client'

import { useState, useEffect } from 'react'

type QueueItem = {
  id: string
  recommendation_type: string
  keyword_text: string
  suggested_bid: number | null
  current_bid: number | null
  estimated_impact: number | null
  impact_level: 'high' | 'medium' | 'low'
  reason: string
  created_at: string
}

type AiQueuePreviewProps = {
  campaignId: string
  brandMarketId: string
  maxItems?: number
  className?: string
}

const IMPACT_COLORS: Record<string, string> = {
  high: 'bg-emerald-50 text-emerald-700',
  medium: 'bg-orange-50 text-orange-700',
  low: 'bg-th-bg-hover text-th-text-secondary',
}

const TYPE_LABELS: Record<string, string> = {
  bid_adjust: 'Bid Adjust',
  promote: 'Promote',
  negate: 'Negate',
  new_keyword: 'New Keyword',
  trend_alert: 'Trend Alert',
}

const AiQueuePreview = ({
  campaignId,
  brandMarketId,
  maxItems = 5,
  className = '',
}: AiQueuePreviewProps) => {
  const [items, setItems] = useState<QueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchQueue = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          brand_market_id: brandMarketId,
          campaign_id: campaignId,
          status: 'pending',
          limit: String(maxItems),
        })
        const res = await fetch(`/api/ads/recommendations?${params}`)
        if (res.ok) {
          const json = await res.json() as { data: QueueItem[] }
          setItems(json.data)
        }
      } catch {
        // API not yet implemented — silent fail
      } finally {
        setIsLoading(false)
      }
    }

    if (campaignId && brandMarketId) fetchQueue()
  }, [campaignId, brandMarketId, maxItems])

  if (isLoading) {
    return (
      <div className={`rounded-lg border border-th-border bg-surface-card p-4 ${className}`}>
        <h3 className="text-sm font-medium text-th-text mb-3">AI Action Queue</h3>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-th-bg-hover" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-th-border bg-surface-card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-th-text">AI Action Queue</h3>
        {items.length > 0 && (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
            {items.length} pending
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-th-text-muted py-4 text-center">No pending actions</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-md border border-th-border bg-th-bg-hover px-3 py-2"
            >
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${IMPACT_COLORS[item.impact_level]}`}>
                {item.impact_level.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-th-text-secondary truncate">
                  {TYPE_LABELS[item.recommendation_type] ?? item.recommendation_type}
                  {item.keyword_text && `: ${item.keyword_text}`}
                </p>
                <p className="text-[11px] text-th-text-muted truncate">{item.reason}</p>
              </div>
              {item.suggested_bid != null && (
                <span className="shrink-0 text-xs font-mono text-th-text-secondary">
                  ${item.suggested_bid.toFixed(2)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { AiQueuePreview }
