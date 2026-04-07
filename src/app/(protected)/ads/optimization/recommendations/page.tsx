// /ads/optimization/recommendations → S11 AI Recommendations
// Design Ref: §2.2 — Track C
'use client'

import { useCallback } from 'react'
import { useMarketContext } from '@/modules/ads/shared/hooks/use-market-context'
import { AiRecommendations } from '@/modules/ads/features/optimization/components/ai-recommendations'

const AdsRecommendationsPage = () => {
  const { selectedMarketId } = useMarketContext()

  const handleApprove = useCallback(async (id: string) => {
    await fetch(`/api/ads/recommendations/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  }, [])

  return (
    <div className="p-6">
      {selectedMarketId ? (
        <AiRecommendations brandMarketId={selectedMarketId} onApprove={handleApprove} />
      ) : (
        <div className="text-center py-12 text-sm text-th-text-muted">Select a market to view recommendations</div>
      )}
    </div>
  )
}

export default AdsRecommendationsPage
