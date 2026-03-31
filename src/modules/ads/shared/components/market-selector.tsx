// Design Ref: §2.1 shared/components — 마켓 셀렉터 (단일 선택)
'use client'

import { useMarketContext } from '../hooks/use-market-context'

type MarketOption = {
  brand_market_id: string
  brand: string
  marketplace: string
  region: string
}

type MarketSelectorProps = {
  markets: MarketOption[]
  className?: string
}

const REGION_FLAGS: Record<string, string> = {
  US: '🇺🇸', CA: '🇨🇦', DE: '🇩🇪', JP: '🇯🇵', UK: '🇬🇧', FR: '🇫🇷', IT: '🇮🇹', ES: '🇪🇸',
}

const MarketSelector = ({ markets, className = '' }: MarketSelectorProps) => {
  const { selectedMarketId, setSelectedMarketId } = useMarketContext()

  return (
    <select
      value={selectedMarketId ?? ''}
      onChange={(e) => setSelectedMarketId(e.target.value)}
      className={`rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 ${className}`}
    >
      {markets.map((m) => (
        <option key={m.brand_market_id} value={m.brand_market_id}>
          {REGION_FLAGS[m.marketplace] ?? ''} {m.brand} {m.marketplace}
        </option>
      ))}
    </select>
  )
}

export { MarketSelector }
export type { MarketOption }
