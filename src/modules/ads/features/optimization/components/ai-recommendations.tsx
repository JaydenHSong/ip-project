// S11 — AI Recommendations (full list with Approve All / Skip All)
// Design Ref: §5.3 S11
'use client'

import { useState, useEffect } from 'react'
import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import { EmptyState } from '@/modules/ads/shared/components/empty-state'
import type { RecommendationItem, RecommendationSummary } from '../types'

type AiRecommendationsProps = {
  brandMarketId: string
  onApprove: (id: string) => Promise<void>
}

const TYPE_COLORS: Record<string, string> = {
  bid_adjust: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  promote: 'bg-blue-50 text-blue-700 border-blue-200',
  negate: 'bg-red-50 text-red-700 border-red-200',
  new_keyword: 'bg-orange-50 text-orange-700 border-orange-200',
}

const AiRecommendations = ({ brandMarketId, onApprove }: AiRecommendationsProps) => {
  const [recs, setRecs] = useState<RecommendationItem[]>([])
  const [summary, setSummary] = useState<RecommendationSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetch_ = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/ads/recommendations?brand_market_id=${brandMarketId}&status=pending`)
        if (res.ok) {
          const json = await res.json() as { data: RecommendationItem[]; summary: RecommendationSummary }
          setRecs(json.data)
          setSummary(json.summary)
        }
      } catch { /* silent */ }
      finally { setIsLoading(false) }
    }
    fetch_()
  }, [brandMarketId])

  if (isLoading) return <div className="h-64 animate-pulse rounded-lg border border-gray-200 bg-gray-50" />

  return (
    <div className="space-y-6">
      {/* Header — Design S11: "Beta 뱃지 + Manual campaigns only" */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-900">AI Recommendations</h2>
          <span className="rounded border border-orange-500 px-1.5 py-0.5 text-[10px] font-medium text-orange-600">Beta</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => { for (const r of recs) await onApprove(r.id) }}
            className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600"
          >
            Approve All
          </button>
          <button className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            Skip All
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-400 -mt-4">Manual campaigns only</p>

      {/* Impact Summary Bar — Design S11 */}
      {summary && (
        <div className="grid grid-cols-4 gap-3">
          <KpiCard label="Pending" value={summary.total_pending} />
          <KpiCard label="Est. ACoS Impact" value={`${summary.est_acos_impact.toFixed(1)}%`} />
          <KpiCard label="Est. Revenue" value={`$${summary.est_revenue_impact.toFixed(0)}`} />
          <KpiCard label="Waste Reduction" value={`$${summary.est_waste_reduction.toFixed(0)}`} />
        </div>
      )}

      {/* Recommendation Cards */}
      {recs.length === 0 ? (
        <EmptyState title="No recommendations" description="AI will generate recommendations after analyzing campaign data." />
      ) : (
        <div className="space-y-2">
          {recs.map((rec) => (
            <div key={rec.id} className={`rounded-lg border bg-white p-4 ${TYPE_COLORS[rec.recommendation_type] ?? ''}`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-900">{rec.campaign_name}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      rec.impact_level === 'high' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {rec.impact_level}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{rec.keyword_text}</p>
                  <p className="text-xs text-gray-500 mt-1">{rec.reason}</p>
                  {rec.current_bid != null && rec.suggested_bid != null && (
                    <p className="text-xs font-mono mt-1">
                      <span className="text-gray-400">${rec.current_bid.toFixed(2)}</span>
                      <span className="mx-1">&rarr;</span>
                      <span className="font-semibold text-emerald-600">${rec.suggested_bid.toFixed(2)}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-1 ml-3 shrink-0">
                  <button onClick={() => onApprove(rec.id)} className="rounded bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-800">
                    Approve
                  </button>
                  <button className="rounded bg-gray-100 px-3 py-1 text-xs text-gray-600 hover:bg-gray-200">
                    Skip
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { AiRecommendations }
