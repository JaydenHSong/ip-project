// S04 — Bid Optimization
// Design Ref: §5.3 S04
// Strategy Strip + Today's Focus × 3 + Apply Top 3 Bar + Keyword Table
'use client'

import { useState, useEffect, useMemo } from 'react'
import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import { BulkActionBar } from '@/modules/ads/shared/components/bulk-action-bar'
import { EmptyState } from '@/modules/ads/shared/components/empty-state'
import { RuleCreateModal } from './rule-create-modal'
import { useSkipRecommendations } from '../hooks/use-skip-recommendations'
import { useRowSelection } from '@/modules/ads/shared/hooks/use-row-selection'
// Design Ref: ft-optimization-ui-wiring §2.1.2 — useRowSelection hook 재사용
import type { RecommendationItem, StrategyStripData, FocusCard, RuleFormData } from '../types'

type BidOptimizationProps = {
  campaignId: string | null
  brandMarketId: string
  onApprove: (id: string, adjustedBid?: number) => Promise<void>
}

const BidOptimization = ({ campaignId, brandMarketId, onApprove }: BidOptimizationProps) => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([])
  const [strategy, setStrategy] = useState<StrategyStripData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set())
  const [isApplyingTop3, setIsApplyingTop3] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [ruleModalOpen, setRuleModalOpen] = useState(false)

  // Design Ref: ft-optimization-ui-wiring §2.1.2 — useRowSelection for checkbox state
  const tableRecs = useMemo(
    () => recommendations.filter((r) => !skippedIds.has(r.id)).slice(3),
    [recommendations, skippedIds],
  )
  const {
    selectedIds,
    toggle: toggleSelect,
    toggleAll: toggleAllTable,
    clear: clearSelection,
    allSelected: allTableSelected,
    isSelected,
  } = useRowSelection<RecommendationItem>(tableRecs)

  // Design Ref: ft-optimization-ui-wiring §3.2 S4 — Skip All 서버 연동
  const { skipAll, isRunning: isSkipping } = useSkipRecommendations(brandMarketId)

  // Design Ref: ft-optimization-ui-wiring §3.2 S1 — M03 Rule Create submit handler
  const handleCreateRule = async (data: RuleFormData) => {
    const res = await fetch('/api/ads/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, brand_market_id: brandMarketId }),
    })
    if (!res.ok) throw new Error(`Rule create failed: ${res.status}`)
    // Refetch strategy to bump active_rules count
    if (campaignId) {
      const rulesRes = await fetch(`/api/ads/rules?brand_market_id=${brandMarketId}&is_active=true`)
      if (rulesRes.ok) {
        const rulesJson = await rulesRes.json() as { data: unknown[] }
        setStrategy((prev) => prev ? { ...prev, active_rules: rulesJson.data?.length ?? 0 } : prev)
      }
    }
  }

  const handleSkip = async (id: string) => {
    // Design Ref: ft-optimization-ui-wiring §3.2 S4 — per-row skip도 서버 호출
    const result = await skipAll([id])
    if (result.failed === 0) {
      setSkippedIds((prev) => new Set(prev).add(id))
    }
  }

  const handleApplyTop3 = async () => {
    setIsApplyingTop3(true)
    setApplyError(null)
    const results = await Promise.allSettled(top3.map((rec) => onApprove(rec.id)))
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      setApplyError(`${failed}/${top3.length} approvals failed. Please retry.`)
    } else {
      // Remove approved items from local state
      setRecommendations((prev) => prev.filter((r) => !top3.some((t) => t.id === r.id)))
    }
    setIsApplyingTop3(false)
  }

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
          } catch (err) {
            // L1 fix: log rules fetch failures
            console.error('[bid-optimization] rules fetch failed', err)
          }

          setStrategy({
            target_acos: campJson.data.target_acos,
            max_bid: campJson.data.max_bid_cap,
            daily_limit: campJson.data.daily_budget,
            active_rules: rulesCount,
          })
        }
      } catch (err) {
        // L1 fix: log recommendations fetch failures
        console.error('[bid-optimization] fetch failed', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetch_()
  }, [campaignId, brandMarketId])

  // H1 fix: skipped items hidden from active lists
  const visibleRecs = recommendations.filter((r) => !skippedIds.has(r.id))
  const top3 = visibleRecs.slice(0, 3)
  const allRecs = visibleRecs

  if (!campaignId) {
    return <EmptyState title="Select a campaign" description="Choose a campaign to see bid recommendations" />
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-th-border bg-th-bg-hover" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Strategy Strip + New Rule CTA — Design S04 + ft-optimization-ui-wiring §3.2 S1 */}
      {strategy && (
        <div className="flex items-start gap-3">
          <div className="grid flex-1 grid-cols-4 gap-3">
            <KpiCard label="Target ACoS" value={strategy.target_acos ? `${strategy.target_acos}%` : '-'} />
            <KpiCard label="Max Bid" value={strategy.max_bid ? `$${strategy.max_bid}` : '-'} />
            <KpiCard label="Daily Limit" value={strategy.daily_limit ? `$${strategy.daily_limit}` : '-'} />
            <KpiCard label="Active Rules" value={strategy.active_rules} />
          </div>
          <button
            type="button"
            onClick={() => setRuleModalOpen(true)}
            className="h-[48px] whitespace-nowrap rounded-md border border-th-border bg-th-bg-hover px-3 text-sm font-medium text-th-text-secondary hover:bg-th-bg"
          >
            + New Rule
          </button>
        </div>
      )}

      {/* M03 Rule Create Modal */}
      <RuleCreateModal
        isOpen={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        onSubmit={handleCreateRule}
      />


      {/* Today's Focus × 3 — Design S04 */}
      {top3.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-th-text mb-3">Today&apos;s Focus</h3>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {top3.map((rec) => (
              <div key={rec.id} className="rounded-lg border border-th-border bg-surface-card p-4">
                <p className="text-xs font-medium text-th-text-secondary truncate">{rec.keyword_text}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-th-text-muted">${rec.current_bid?.toFixed(2) ?? '-'}</span>
                  <span className="text-th-text-muted">&rarr;</span>
                  <span className="text-sm font-semibold text-emerald-600">${rec.suggested_bid?.toFixed(2) ?? '-'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    rec.impact_level === 'high' ? 'bg-emerald-50 text-emerald-700'
                    : rec.impact_level === 'medium' ? 'bg-orange-50 text-orange-700'
                    : 'bg-th-bg-hover text-th-text-secondary'
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
                    {/* H1 fix: Skip button now removes the recommendation locally */}
                    <button
                      onClick={() => handleSkip(rec.id)}
                      className="rounded bg-th-bg-tertiary px-2 py-0.5 text-xs text-th-text-secondary hover:bg-th-bg-hover"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Apply Top 3 Bar — Design S04: "#18181B 다크" */}
          {/* H3 fix: parallel execution + loading + error feedback */}
          <div className="mt-3 flex items-center justify-center rounded-lg bg-th-text px-4 py-2.5">
            <button
              onClick={handleApplyTop3}
              disabled={isApplyingTop3 || top3.length === 0}
              className="text-sm font-medium text-white hover:text-orange-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplyingTop3 ? 'Applying…' : 'Apply Top 3 Recommendations'}
            </button>
          </div>
          {applyError && (
            <p className="mt-2 text-center text-xs text-red-500">{applyError}</p>
          )}
        </div>
      ) : (
        <EmptyState title="All caught up!" description="No pending bid recommendations for this campaign." />
      )}

      {/* Keyword Table — Design S04 */}
      {allRecs.length > 3 && (
        <div className="rounded-lg border border-th-border bg-surface-card">
          <div className="px-4 py-3 border-b border-th-border">
            <h3 className="text-sm font-medium text-th-text">All Bid Recommendations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-th-border">
                  <th className="w-8 px-3 py-2">
                    {/* Design Ref: §2.1.2 — useRowSelection.toggleAll */}
                    <input
                      type="checkbox"
                      checked={allTableSelected}
                      onChange={toggleAllTable}
                      className="rounded border-th-border text-orange-500"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-th-text-muted">Keyword</th>
                  <th className="px-3 py-2 text-right text-th-text-muted">Current</th>
                  <th className="px-3 py-2 text-right text-th-text-muted">Suggested</th>
                  <th className="px-3 py-2 text-center text-th-text-muted">Impact</th>
                  <th className="px-3 py-2 text-left text-th-text-muted">Reason</th>
                  <th className="px-3 py-2 text-center text-th-text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {tableRecs.map((rec) => (
                  <tr key={rec.id} className={`border-b border-th-border ${rec.source === 'algorithm' ? 'border-l-2 border-l-orange-400' : ''}`}>
                    <td className="px-3 py-2">
                      {/* Design Ref: §2.1.2 — useRowSelection.isSelected */}
                      <input
                        type="checkbox"
                        checked={isSelected(rec.id)}
                        onChange={() => toggleSelect(rec.id)}
                        className="rounded border-th-border text-orange-500"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-th-text-secondary">{rec.keyword_text}</td>
                    <td className="px-3 py-2 text-right font-mono text-th-text-muted">${rec.current_bid?.toFixed(2) ?? '-'}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-600">${rec.suggested_bid?.toFixed(2) ?? '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        rec.impact_level === 'high' ? 'bg-emerald-50 text-emerald-700' : 'bg-th-bg-hover text-th-text-secondary'
                      }`}>{rec.impact_level}</span>
                    </td>
                    <td className="px-3 py-2 text-th-text-muted truncate max-w-[160px]">{rec.reason}</td>
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
          { key: 'skip_all', label: isSkipping ? 'Skipping…' : 'Skip All' },
        ]}
        onAction={async (action) => {
          // Design Ref: ft-optimization-ui-wiring §3.2 S4 — Skip All 서버 호출
          const ids = Array.from(selectedIds)
          if (action === 'approve_all') {
            await Promise.allSettled(ids.map((id) => onApprove(id)))
          } else if (action === 'skip_all') {
            const result = await skipAll(ids)
            setSkippedIds((prev) => {
              const next = new Set(prev)
              ids.forEach((id) => { if (!result.failedIds.includes(id)) next.add(id) })
              return next
            })
            if (result.failed > 0) {
              console.warn(`[bid-optimization] skip: ${result.succeeded}/${result.total} succeeded, ${result.failed} failed`)
            }
          }
          clearSelection()
        }}
        onClear={clearSelection}
      />
    </div>
  )
}

export { BidOptimization }
