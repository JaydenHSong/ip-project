// AD Optimizer — Layout
// Design Ref: §2.2 layout.tsx — 사이드바 + 헤더 + MarketProvider
'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { ModuleAccessGate } from '@/components/layout/ModuleAccessGate'
import { MarketContext } from '@/modules/ads/shared/hooks/use-market-context'
import { MarketSelector, type MarketOption } from '@/modules/ads/shared/components/market-selector'

type MarketsApiRow = {
  brand_market_id: string
  brand_name: string
  marketplace: string
  region: string
}

const toMarketOptions = (rows: MarketsApiRow[]): MarketOption[] =>
  rows.map((m) => ({
    brand_market_id: m.brand_market_id,
    brand: m.brand_name,
    marketplace: m.marketplace,
    region: m.region,
  }))

const AdsMarketProvider = ({ children }: { children: ReactNode }) => {
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null)
  const [marketOptions, setMarketOptions] = useState<MarketOption[]>([])

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await fetch('/api/ads/markets')
        if (!res.ok) return
        const json = await res.json() as { data: MarketsApiRow[] }
        const opts = toMarketOptions(json.data ?? [])
        setMarketOptions(opts)
        setSelectedMarketId((prev) => {
          if (prev !== null) return prev
          return opts.length > 0 ? opts[0].brand_market_id : null
        })
      } catch { /* silent */ }
    }
    fetchMarkets()
  }, [])

  return (
    <MarketContext.Provider value={{ selectedMarketId, setSelectedMarketId }}>
      <div className="flex h-full flex-col">
        {marketOptions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-th-border bg-th-bg-secondary/80 px-4 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-th-text-muted">Market</span>
            <MarketSelector markets={marketOptions} />
            <span className="text-[11px] text-th-text-muted">Campaigns · Budget · reports use this market.</span>
          </div>
        ) : null}
        {children}
      </div>
    </MarketContext.Provider>
  )
}

const AdsLayout = ({ children }: { children: ReactNode }) => (
  <ModuleAccessGate minRole="owner" moduleName="AD Optimizer">
    <AdsMarketProvider>{children}</AdsMarketProvider>
  </ModuleAccessGate>
)

export default AdsLayout
