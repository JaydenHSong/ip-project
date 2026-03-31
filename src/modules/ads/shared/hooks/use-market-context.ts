// Design Ref: §2.1 shared/hooks — 현재 선택된 마켓 컨텍스트
'use client'

import { createContext, useContext } from 'react'

type MarketContextValue = {
  selectedMarketId: string | null
  setSelectedMarketId: (id: string) => void
}

const MarketContext = createContext<MarketContextValue>({
  selectedMarketId: null,
  setSelectedMarketId: () => {},
})

const useMarketContext = () => {
  const ctx = useContext(MarketContext)
  if (!ctx.selectedMarketId) {
    // 컨텍스트가 있지만 마켓이 선택 안 된 경우 — 정상 (첫 로드)
  }
  return ctx
}

export { MarketContext, useMarketContext }
