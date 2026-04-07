// AD Optimizer — Layout
// Design Ref: §2.2 layout.tsx — 사이드바 + 헤더 + MarketProvider
'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { MarketContext } from '@/modules/ads/shared/hooks/use-market-context'
import type { MarketOption } from '@/modules/ads/shared/components/market-selector'

const AdsLayout = ({ children }: { children: ReactNode }) => {
  const router = useRouter()
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null)
  const [markets, setMarkets] = useState<MarketOption[]>([])
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    const init = async () => {
      // Check user role — owner only
      try {
        const userRes = await fetch('/api/users/me')
        if (userRes.ok) {
          const userJson = await userRes.json() as { user: { role: string } }
          if (userJson.user.role !== 'owner') {
            setAccessDenied(true)
            return
          }
        }
      } catch { /* silent */ }

      // Fetch markets
      try {
        const res = await fetch('/api/ads/markets')
        if (!res.ok) return
        const json = await res.json() as { data: MarketOption[] }
        setMarkets(json.data)
        if (json.data.length > 0) {
          setSelectedMarketId(json.data[0].brand_market_id)
        }
      } catch { /* silent */ }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (accessDenied) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-th-text">AD Optimizer</p>
          <p className="mt-2 text-sm text-th-text-muted">Coming Soon</p>
          <button
            onClick={() => router.push('/ip/dashboard')}
            className="mt-4 rounded-lg bg-th-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <MarketContext.Provider value={{ selectedMarketId, setSelectedMarketId }}>
      <div className="flex h-full flex-col">
        {children}
      </div>
    </MarketContext.Provider>
  )
}

export default AdsLayout
