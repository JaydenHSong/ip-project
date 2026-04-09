// S11 — AI Recommendations (full list with Approve All / Skip All)
// Design Ref: §5.3 S11
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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

const TYPE_LABELS: Record<string, string> = {
  bid_adjust: 'Bid Adjustments',
  promote: 'Keyword Promotions',
  negate: 'Negative Keywords',
  new_keyword: 'New Keywords',
}

const CATEGORY_ORDER = ['bid_adjust', 'promote', 'negate', 'new_keyword']

const AiRecommendations = ({ brandMarketId, onApprove }: AiRecommendationsProps) => {
  const [recs, setRecs] = useState<RecommendationItem[]>([])
  const [summary, setSummary] = useState<RecommendationSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set())

  // Filter state — Brand/Market filtering is already applied via brandMarketId prop
  const [campaignFilter, setCampaignFilter] = useState<string>('all')

  // H4 fix: extract fetch so we can re-run it after approve actions
  const fetchRecs = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/ads/recommendations?brand_market_id=${brandMarketId}&status=pending`)
      if (res.ok) {
        const json = await res.json() as { data: RecommendationItem[]; summary: RecommendationSummary }
        setRecs(json.data)
        setSummary(json.summary)
      }
    } catch (err) {
      // L1 fix: log fetch failures
      console.error('[ai-recommendations] fetch failed', err)
    }
    finally { setIsLoading(false) }
  }, [brandMarketId])

  useEffect(() => { fetchRecs() }, [fetchRecs])

  const handleApprove = useCallback(async (id: string) => {
    await onApprove(id)
    await fetchRecs()
  }, [onApprove, fetchRecs])

  const handleSkip = useCallback((id: string) => {
    setSkippedIds((prev) => new Set(prev).add(id))
  }, [])

  // Derive unique filter options
  const campaignOptions = useMemo(() => {
    const names = [...new Set(recs.map((r) => r.campaign_name))].sort()
    return names
  }, [recs])

  // Filtered recs (also drops locally-skipped items)
  const filteredRecs = useMemo(() => {
    return recs.filter((r) => {
      if (skippedIds.has(r.id)) return false
      if (campaignFilter !== 'all' && r.campaign_name !== campaignFilter) return false
      return true
    })
  }, [recs, campaignFilter, skippedIds])

  // Category grouping — Design S11: "Category Groups: Bid Adjustments / Negative Keywords / Keyword Promotions"
  const groupedRecs = useMemo(() => {
    const groups: Record<string, RecommendationItem[]> = {}
    for (const rec of filteredRecs) {
      const type = rec.recommendation_type
      if (!groups[type]) groups[type] = []
      groups[type].push(rec)
    }
    return groups
  }, [filteredRecs])

  if (isLoading) return <div className="h-64 animate-pulse rounded-lg border border-th-border bg-th-bg-hover" />

  return (
    <div className="space-y-6">
      {/* Header — Design S11: "Beta 뱃지 + Manual campaigns only" */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-th-text">AI Recommendations</h2>
          <span className="rounded border border-orange-500 px-1.5 py-0.5 text-[10px] font-medium text-orange-600">Beta</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              // H4 fix: parallel approve + refetch
              await Promise.allSettled(filteredRecs.map((r) => onApprove(r.id)))
              await fetchRecs()
            }}
            className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600"
          >
            Approve All
          </button>
          <button
            onClick={() => {
              setSkippedIds((prev) => {
                const next = new Set(prev)
                filteredRecs.forEach((r) => next.add(r.id))
                return next
              })
            }}
            className="rounded-md border border-th-border px-3 py-1.5 text-xs font-medium text-th-text-secondary hover:bg-th-bg-hover"
          >
            Skip All
          </button>
        </div>
      </div>
      <p className="text-xs text-th-text-muted -mt-4">Manual campaigns only</p>

      {/* Impact Summary Bar — Design S11 */}
      {summary && (
        <div className="grid grid-cols-4 gap-3">
          <KpiCard label="Pending" value={summary.total_pending} />
          <KpiCard label="Est. ACoS Impact" value={`${summary.est_acos_impact.toFixed(1)}%`} />
          <KpiCard label="Est. Revenue" value={`$${summary.est_revenue_impact.toFixed(0)}`} />
          <KpiCard label="Waste Reduction" value={`$${summary.est_waste_reduction.toFixed(0)}`} />
        </div>
      )}

      {/* Filter Row — Campaign filter (Brand/Market already scoped by brandMarketId) */}
      <div className="flex items-center gap-3 rounded-lg border border-th-border bg-th-bg-hover px-4 py-2.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-th-text-muted">Filters</span>
        <select
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
          className="rounded border border-th-border bg-surface-card px-2 py-1 text-xs text-th-text-secondary focus:border-orange-500 focus:outline-none"
        >
          <option value="all">All Campaigns</option>
          {campaignOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        {campaignFilter !== 'all' && (
          <button
            onClick={() => setCampaignFilter('all')}
            className="text-[10px] text-orange-600 hover:text-orange-700"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-[10px] text-th-text-muted">{filteredRecs.length} recommendations</span>
      </div>

      {/* Category Grouped Recommendation Cards — Design S11 */}
      {filteredRecs.length === 0 ? (
        <EmptyState title="No recommendations" description="AI will generate recommendations after analyzing campaign data." />
      ) : (
        <div className="space-y-6">
          {CATEGORY_ORDER.map((type) => {
            const items = groupedRecs[type]
            if (!items || items.length === 0) return null
            return (
              <div key={type}>
                {/* Category Header */}
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-th-text">{TYPE_LABELS[type] ?? type}</h3>
                  <span className="rounded-full bg-th-bg-tertiary px-2 py-0.5 text-[10px] font-medium text-th-text-secondary">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((rec) => (
                    <div key={rec.id} className={`rounded-lg border bg-surface-card p-4 ${TYPE_COLORS[rec.recommendation_type] ?? ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-th-text">{rec.campaign_name}</span>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              rec.impact_level === 'high' ? 'bg-emerald-100 text-emerald-800' : 'bg-th-bg-tertiary text-th-text-secondary'
                            }`}>
                              {rec.impact_level}
                            </span>
                          </div>
                          <p className="text-sm text-th-text-secondary">{rec.keyword_text}</p>
                          <p className="text-xs text-th-text-muted mt-1">{rec.reason}</p>
                          {rec.current_bid != null && rec.suggested_bid != null && (
                            <p className="text-xs font-mono mt-1">
                              <span className="text-th-text-muted">${rec.current_bid.toFixed(2)}</span>
                              <span className="mx-1">&rarr;</span>
                              <span className="font-semibold text-emerald-600">${rec.suggested_bid.toFixed(2)}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 ml-3 shrink-0">
                          {/* H4 fix: per-row approve refetches; skip removes locally */}
                          <button onClick={() => handleApprove(rec.id)} className="rounded bg-th-text px-3 py-1 text-xs font-medium text-white hover:bg-th-text">
                            Approve
                          </button>
                          <button onClick={() => handleSkip(rec.id)} className="rounded bg-th-bg-tertiary px-3 py-1 text-xs text-th-text-secondary hover:bg-th-bg-hover">
                            Skip
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { AiRecommendations }
