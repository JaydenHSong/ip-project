// S06 — Keywords Management
// Design Ref: §5.3 S06
// Keyword Stats Strip + AI Action Queue (Promote/Negate tabs) + Bulk bar
'use client'

import { useState, useEffect } from 'react'
import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import { BulkActionBar } from '@/modules/ads/shared/components/bulk-action-bar'
import { EmptyState } from '@/modules/ads/shared/components/empty-state'
import { useSkipRecommendations } from '../hooks/use-skip-recommendations'
// Design Ref: ft-optimization-ui-wiring §3.2 S4
import type { RecommendationItem, KeywordStatsStrip as KeywordStats } from '../types'

type KeywordsManagementProps = {
  campaignId: string | null
  brandMarketId: string
  onApprove: (id: string) => Promise<void>
}

type FilterTab = 'all' | 'promote' | 'negate'

const KeywordsManagement = ({ campaignId, brandMarketId, onApprove }: KeywordsManagementProps) => {
  const [stats, setStats] = useState<KeywordStats | null>(null)
  const [recs, setRecs] = useState<RecommendationItem[]>([])
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  // Design Ref: ft-optimization-ui-wiring §3.2 S4 — Skip All 서버 연동
  const { skipAll, isRunning: isSkipping } = useSkipRecommendations(brandMarketId)

  useEffect(() => {
    if (!campaignId || !brandMarketId) return
    const fetch_ = async () => {
      setIsLoading(true)
      try {
        // C3 fix: fetch keyword stats AND recommendations in parallel so the
        // KPI strip is actually populated.
        const params = new URLSearchParams({ brand_market_id: brandMarketId, campaign_id: campaignId, status: 'pending' })
        const [recsRes, statsRes] = await Promise.all([
          fetch(`/api/ads/recommendations?${params}`),
          fetch(`/api/ads/optimization/keyword-stats/${campaignId}`),
        ])
        if (recsRes.ok) {
          const json = await recsRes.json() as { data: RecommendationItem[] }
          setRecs(json.data.filter((r) => r.recommendation_type === 'promote' || r.recommendation_type === 'negate'))
        }
        if (statsRes.ok) {
          const json = await statsRes.json() as { data: KeywordStats }
          setStats(json.data)
        }
      } catch (err) {
        // L1 fix: log fetch failures for devtools/Sentry visibility
        console.error('[keywords-management] fetch failed', err)
      }
      finally { setIsLoading(false) }
    }
    fetch_()
  }, [campaignId, brandMarketId])

  if (!campaignId) return <EmptyState title="Select a campaign" description="Choose a campaign to manage keywords" />

  const filtered = filterTab === 'all' ? recs
    : recs.filter((r) => r.recommendation_type === filterTab)

  return (
    <div className="space-y-6">
      {/* Keyword Stats Strip — Design S06: "4-col (Auto/Broad/Phrase/Exact)" */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <KpiCard label="Broad" value={stats.broad_count} />
          <KpiCard label="Phrase" value={stats.phrase_count} />
          <KpiCard label="Exact" value={stats.exact_count} />
          <KpiCard label="Pending" value={stats.pending_actions} />
        </div>
      )}

      {/* Filter tabs — Design S06: "Promote/Negate 필터 탭" */}
      <div className="flex gap-2">
        {(['all', 'promote', 'negate'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
              filterTab === tab ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-th-border text-th-text-muted'
            }`}
          >
            {tab === 'all' ? 'All' : tab === 'promote' ? 'Promote' : 'Negate'}
            <span className="ml-1 text-th-text-muted">
              ({tab === 'all' ? recs.length : recs.filter((r) => r.recommendation_type === tab).length})
            </span>
          </button>
        ))}
      </div>

      {/* Action Queue Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-th-bg-hover" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No pending keyword actions" description="All caught up!" />
      ) : (
        <div className="space-y-1">
          {filtered.map((rec) => {
            const isPromote = rec.recommendation_type === 'promote'
            return (
              <div
                key={rec.id}
                className={`flex items-center justify-between rounded border-l-2 bg-surface-card px-4 py-2.5 ${
                  isPromote ? 'border-l-emerald-500' : 'border-l-red-400 border-dashed'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(rec.id)}
                    onChange={() => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev)
                        next.has(rec.id) ? next.delete(rec.id) : next.add(rec.id)
                        return next
                      })
                    }}
                    className="rounded border-th-border text-orange-500"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-th-text-secondary truncate">{rec.keyword_text}</p>
                    <p className="text-[11px] text-th-text-muted">{rec.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {isPromote && rec.suggested_bid && (
                    <span className="text-xs font-mono text-emerald-600">+${rec.suggested_bid.toFixed(2)}</span>
                  )}
                  {!isPromote && rec.metrics?.spend && (
                    <span className="text-xs font-mono text-red-500">-${rec.metrics.spend.toFixed(2)}</span>
                  )}
                  <button
                    onClick={() => onApprove(rec.id)}
                    className="rounded bg-th-text px-2.5 py-1 text-xs font-medium text-white hover:bg-th-text"
                  >
                    {isPromote ? 'Promote' : 'Negate'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bulk Bar — Design S06: "#18181B: Approve All / Skip All" */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        actions={[
          { key: 'approve_all', label: 'Approve All' },
          { key: 'skip_all', label: isSkipping ? 'Skipping…' : 'Skip All' },
        ]}
        onAction={async (action) => {
          const ids = Array.from(selectedIds)
          if (action === 'approve_all') {
            for (const id of ids) await onApprove(id)
          } else if (action === 'skip_all') {
            // Design Ref: ft-optimization-ui-wiring §3.2 S4 — 서버 호출
            const result = await skipAll(ids)
            if (result.succeeded > 0) {
              setRecs((prev) => prev.filter((r) => !ids.includes(r.id) || result.failedIds.includes(r.id)))
            }
            if (result.failed > 0) {
              console.warn(`[keywords-management] skip: ${result.succeeded}/${result.total} succeeded`)
            }
          }
          setSelectedIds(new Set())
        }}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  )
}

export { KeywordsManagement }
