// /ads/reports → S12 Spend Intelligence
// Design Ref: §2.2 — Track B
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMarketContext } from '@/modules/ads/shared/hooks/use-market-context'
import { SpendLeakSummaryCard } from '@/modules/ads/features/spend-intelligence/components/spend-leak-summary'
import { TopWastersTable } from '@/modules/ads/features/spend-intelligence/components/top-wasters-table'
import { TrendAlerts } from '@/modules/ads/features/spend-intelligence/components/trend-alerts'
import { AiDiagnosisCard } from '@/modules/ads/features/spend-intelligence/components/ai-diagnosis-card'
import { QuickFixActions } from '@/modules/ads/features/spend-intelligence/components/quick-fix-actions'
import type { SpendIntelligenceResponse } from '@/modules/ads/features/spend-intelligence/types'
import type { QuickFixAction } from '@/modules/ads/features/spend-intelligence/types'

const AdsReportsPage = () => {
  const { selectedMarketId } = useMarketContext()
  const [data, setData] = useState<SpendIntelligenceResponse['data'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!selectedMarketId) {
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/ads/reports/spend-intelligence?brand_market_id=${selectedMarketId}`)
      if (res.ok) {
        const json = await res.json() as SpendIntelligenceResponse
        setData(json.data)
      }
    } catch (err) {
      // L1 fix: log fetch failures
      console.error('[ads/reports] fetch failed', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedMarketId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleQuickFix = async (action: QuickFixAction) => {
    // C5 fix: use server-calculated recommended values instead of hardcoding 0.
    // Server (spend-intelligence/queries.ts) pre-computes recommended_daily_budget
    // (80% of current) and recommended_max_bid_cap (85% of current) so the client
    // never has to fall back to a destructive default.
    let body: Record<string, unknown> | null = null

    if (action.action_type === 'pause') {
      body = { status: 'paused' }
    } else if (action.action_type === 'reduce_budget') {
      if (action.recommended_daily_budget == null) return
      body = { daily_budget: action.recommended_daily_budget }
    } else if (action.action_type === 'adjust_bids') {
      if (action.recommended_max_bid_cap == null) return
      body = { max_bid_cap: action.recommended_max_bid_cap }
    }

    if (!body) return

    await fetch(`/api/ads/campaigns/${action.campaign_id}`, {
      // L3 fix: PATCH is the RESTful verb for partial updates
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    await fetchData()
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-th-text">Spend Intelligence</h1>
        <p className="mt-0.5 text-sm text-th-text-muted">
          Identify waste, track trends, and act on AI-powered recommendations.
        </p>
      </div>

      {/* KPI Summary */}
      <SpendLeakSummaryCard data={data?.summary ?? null} isLoading={isLoading} />

      {/* Two-column: Top Wasters + Trend Alerts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopWastersTable items={data?.top_wasters ?? []} />
        <TrendAlerts items={data?.trend_alerts ?? []} />
      </div>

      {/* Two-column: AI Diagnosis + Quick Fixes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AiDiagnosisCard items={data?.ai_diagnosis ?? []} />
        <QuickFixActions items={data?.quick_fixes ?? []} onExecute={handleQuickFix} />
      </div>
    </div>
  )
}

export default AdsReportsPage
