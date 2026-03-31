// AD Optimizer — Layout
// Design Ref: §2.2 layout.tsx — 사이드바 + 헤더 + MarketProvider
'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { MarketContext } from '@/modules/ads/shared/hooks/use-market-context'
import type { MarketOption } from '@/modules/ads/shared/components/market-selector'

const AdsLayout = ({ children }: { children: ReactNode }) => {
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null)
  const [markets, setMarkets] = useState<MarketOption[]>([])

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await fetch('/api/ads/markets')
        if (!res.ok) return
        const data = await res.json() as { data: MarketOption[] }
        setMarkets(data.data)
        if (data.data.length > 0 && !selectedMarketId) {
          setSelectedMarketId(data.data[0].brand_market_id)
        }
      } catch {
        // 마켓 로드 실패 시 무시 — API 미구현 상태에서 정상
      }
    }
    fetchMarkets()
  }, [selectedMarketId])

  return (
    <MarketContext.Provider value={{ selectedMarketId, setSelectedMarketId }}>
      <div className="flex h-full flex-col">
        {children}
      </div>
    </MarketContext.Provider>
  )
}

export default AdsLayout
