// /ads/optimization → S04 Bid Optimization (default tab)
// Design Ref: §2.2 — Track C
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useMarketContext } from '@/modules/ads/shared/hooks/use-market-context'
import { useCampaigns } from '@/modules/ads/shared/hooks/use-campaigns'
import { OptimizationLayout } from '@/modules/ads/features/optimization/components/optimization-layout'
import { BidOptimization } from '@/modules/ads/features/optimization/components/bid-optimization'
import { DailyBudgetPacing } from '@/modules/ads/features/optimization/components/daily-budget-pacing'
import { KeywordsManagement } from '@/modules/ads/features/optimization/components/keywords-management'
import { DaypartingSchedule } from '@/modules/ads/features/optimization/components/dayparting-schedule'
import type { OptimizationTab } from '@/modules/ads/features/optimization/components/optimization-layout'

const AdsOptimizationPage = () => {
  const { selectedMarketId } = useMarketContext()
  const { campaigns } = useCampaigns()
  const [activeTab, setActiveTab] = useState<OptimizationTab>('bidding')
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)

  // Auto-select first campaign
  useEffect(() => {
    if (!selectedCampaignId && campaigns.length > 0) {
      setSelectedCampaignId(campaigns[0].id)
    }
  }, [selectedCampaignId, campaigns])

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId)

  const handleApprove = useCallback(async (id: string) => {
    await fetch(`/api/ads/recommendations/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  }, [])

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-th-text">Optimization</h1>
          <p className="mt-0.5 text-sm text-th-text-muted">Bid, budget, keyword, and dayparting optimization.</p>
        </div>
        <select
          value={selectedCampaignId ?? ''}
          onChange={(e) => setSelectedCampaignId(e.target.value || null)}
          className="rounded-md border border-th-border bg-surface-card px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
        >
          <option value="">Select Campaign</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <OptimizationLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        campaignId={selectedCampaignId}
        campaignName={selectedCampaign?.name ?? null}
      >
        {activeTab === 'bidding' && (
          <BidOptimization campaignId={selectedCampaignId} brandMarketId={selectedMarketId ?? ''} onApprove={handleApprove} />
        )}
        {activeTab === 'budget' && (
          <DailyBudgetPacing campaignId={selectedCampaignId} />
        )}
        {activeTab === 'keywords' && (
          <KeywordsManagement campaignId={selectedCampaignId} brandMarketId={selectedMarketId ?? ''} onApprove={handleApprove} />
        )}
        {activeTab === 'dayparting' && (
          <DaypartingSchedule brandMarketId={selectedMarketId ?? ''} />
        )}
      </OptimizationLayout>
    </div>
  )
}

export default AdsOptimizationPage
