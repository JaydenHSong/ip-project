// AD Optimizer — Layout
// Design Ref: §2.2 layout.tsx — 사이드바 + 헤더 + MarketProvider
'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { ModuleAccessGate } from '@/components/layout/ModuleAccessGate'
import { MarketContext } from '@/modules/ads/shared/hooks/use-market-context'
import type { MarketOption } from '@/modules/ads/shared/components/market-selector'

const AdsMarketProvider = ({ children }: { children: ReactNode }) => {
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null)

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await fetch('/api/ads/markets')
        if (!res.ok) return
        const json = await res.json() as { data: MarketOption[] }
        if (json.data.length > 0) {
          setSelectedMarketId(json.data[0].brand_market_id)
        }
      } catch { /* silent */ }
    }
    fetchMarkets()
  }, [])

  return (
    <MarketContext.Provider value={{ selectedMarketId, setSelectedMarketId }}>
      <div className="flex h-full flex-col">{children}</div>
    </MarketContext.Provider>
  )
}

const AdsLayout = ({ children }: { children: ReactNode }) => (
  <ModuleAccessGate minRole="owner" moduleName="AD Optimizer">
    <AdsMarketProvider>{children}</AdsMarketProvider>
  </ModuleAccessGate>
)

export default AdsLayout
