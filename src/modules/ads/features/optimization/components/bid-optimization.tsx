// S04 — Bid Optimization
// Design Ref: §5.3 S04
// Strategy Strip + Today's Focus × 3 + Apply Top 3 Bar + Keyword Table
'use client'

import { useState, useEffect } from 'react'
import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import { BulkActionBar } from '@/modules/ads/shared/components/bulk-action-bar'
import { EmptyState } from '@/modules/ads/shared/components/empty-state'
import type { RecommendationItem, StrategyStripData, FocusCard } from '../types'

type BidOptimizationProps = {
  campaignId: string | null
  brandMarketId: string
  onApprove: (id: string, adjustedBid?: number) => Promise<void>
}

const BidOptimization = ({ campaignId, brandMarketId, onApprove }: BidOptimizationProps) => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([])
  const [strategy, setStrategy] = useState<StrategyStripData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!campaignId || !brandMarketId) return

    const fetch_ = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          brand_market_id: brandMarketId,
          campaign_id: campaignId,
          type: 'bid_adjust',
          status: 'pending',
        })
        const res = await fetch(`/api/ads/recommendations?${params}`)
        if (res.ok) {
          const json = await res.json() as { data: RecommendationItem[] }
          setRecommendations(json.data)
        }

        // Get campaign strategy
        const campRes = await fetch(`/api/ads/campaigns/${campaignId}`)
        if (campRes.ok) {
          const campJson = await campRes.json() as { data: { target_acos: number | null; max_bid_cap: number | null; daily_budget: number | null; brand_market_id: string } }

          // Get active rules count
          let rulesCount = 0
          try {
            const rulesRes = await fetch(`/api/ads/rules?brand_market_id=${campJson.data.brand_market_id}&is_active=true`)
            if (rulesRes.ok) {
              const rulesJson = await rulesRes.json() as { data: unknown[] }
              rulesCount = rulesJson.data?.length ?? 0
            }
          } catch { /* silent */ }

          setStrategy({
            target_acos: campJson.data.target_acos,
            max_bid: campJson.data.max_bid_cap,
            daily_limit: campJson.data.daily_budget,
            active_rules: rulesCount,
          })
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false)
      }
    }

    fetch_()
  }, [campaignId, brandMarketId])

  const top3 = recommendations.slice(0, 3)
  const allRecs = recommendations

  if (!campaignId) {
    return <EmptyState title="Select a campaign" description="Choose a campaign to see bid recommendations" />
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Strategy Strip — Design S04 */}
      {strategy && (
        <div className="grid grid-cols-4 gap-3">
          <KpiCard label="Target ACoS" value={strategy.target_acos ? `${strategy.target_acos}%` : '-'} />
          <KpiCard label="Max Bid" value={strategy.max_bid ? `$${strategy.max_bid}` : '-'} />
          <KpiCard label="Daily Limit" value={strategy.daily_limit ? `$${strategy.daily_limit}` : '-'} />
          <KpiCard label="Active Rules" value={strategy.active_rules} />
        </div>
      )}

      {/* Today's Focus × 3 — Design S04 */}
      {top3.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Today&apos;s Focus</h3>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {top3.map((rec) => (
              <div key={rec.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-700 truncate">{rec.keyword_text}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-400">${rec.current_bid?.toFixed(2) ?? '-'}</span>
                  <span className="text-gray-300">&rarr;</span>
                  <span className="text-sm font-semibold text-emerald-600">${rec.suggested_bid?.toFixed(2) ?? '-'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    rec.impact_level === 'high' ? 'bg-emerald-50 text-emerald-700'
                    : rec.impact_level === 'medium' ? 'bg-orange-50 text-orange-700'
                    : 'bg-gray-50 text-gray-600'
                  }`}>
                    {rec.impact_level.toUpperCase()}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onApprove(rec.id)}
                      className="rounded bg-emerald-500 px-2 py-0.5 text-xs text-white hover:bg-emerald-600"
                    >
                      Approve
                    </button>
                    <button className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200">
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Apply Top 3 Bar — Design S04: "#18181B 다크" */}
          <div className="mt-3 flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5">
            <button
              onClick={async () => {
                for (const rec of top3) await onApprove(rec.id)
              }}
              className="text-sm font-medium text-white hover:text-orange-300 transition-colors"
            >
              Apply Top 3 Recommendations
            </button>
          </div>
        </div>
      ) : (
        <EmptyState title="All caught up!" description="No pending bid recommendations for this campaign." />
      )}

      {/* Keyword Table — Design S04 */}
      {allRecs.length > 3 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">All Bid Recommendations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="w-8 px-3 py-2">
                    <input type="checkbox" className="rounded border-gray-300 text-orange-500" />
                  </th>
                  <th className="px-3 py-2 text-left text-gray-500">Keyword</th>
                  <th className="px-3 py-2 text-right text-gray-500">Current</th>
                  <th className="px-3 py-2 text-right text-gray-500">Suggested</th>
                  <th className="px-3 py-2 text-center text-gray-500">Impact</th>
                  <th className="px-3 py-2 text-left text-gray-500">Reason</th>
                  <th className="px-3 py-2 text-center text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {allRecs.slice(3).map((rec) => (
                  <tr key={rec.id} className={`border-b border-gray-50 ${rec.source === 'algorithm' ? 'border-l-2 border-l-orange-400' : ''}`}>
                    <td className="px-3 py-2">
                      <input type="checkbox" className="rounded border-gray-300 text-orange-500" />
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-700">{rec.keyword_text}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-500">${rec.current_bid?.toFixed(2) ?? '-'}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-600">${rec.suggested_bid?.toFixed(2) ?? '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        rec.impact_level === 'high' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-600'
                      }`}>{rec.impact_level}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 truncate max-w-[160px]">{rec.reason}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => onApprove(rec.id)} className="text-orange-500 hover:text-orange-700 font-medium">
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BulkActionBar
        selectedCount={selectedIds.size}
        actions={[
          { key: 'approve_all', label: 'Approve All' },
          { key: 'skip_all', label: 'Skip All' },
        ]}
        onAction={() => setSelectedIds(new Set())}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  )
}

export { BidOptimization }
