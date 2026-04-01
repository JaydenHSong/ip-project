// M01 — Marketing Code Input (6-digit code generator)
// Design Ref: §2.1 campaigns/components/marketing-code-input.tsx
// Format: [Brand 2][Market 2][Seq 2] e.g. SGUS01
'use client'

import { useState, useEffect } from 'react'
import type { MarketingCodeSegment } from '../types'

type MarketingCodeInputProps = {
  brandMarketId: string
  value: string
  onChange: (code: string) => void
  className?: string
}

const BRAND_CODES: Record<string, string> = {
  spigen: 'SG',
  cyrill: 'CY',
  legato: 'LG',
}

const MARKET_CODES: Record<string, string> = {
  US: 'US', CA: 'CA', DE: 'DE', JP: 'JP',
  UK: 'UK', FR: 'FR', IT: 'IT', ES: 'ES',
}

const parseSegment = (code: string): MarketingCodeSegment => ({
  brand: code.slice(0, 2),
  market: code.slice(2, 4),
  sequence: code.slice(4, 6),
})

const MarketingCodeInput = ({
  brandMarketId,
  value,
  onChange,
  className = '',
}: MarketingCodeInputProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const segments = value ? parseSegment(value) : null

  // Auto-generate code on mount when brand_market_id available
  useEffect(() => {
    if (value || !brandMarketId) return

    const generateCode = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/ads/campaigns/next-code?brand_market_id=${brandMarketId}`)
        if (res.ok) {
          const data = await res.json() as { code: string }
          onChange(data.code)
        }
      } catch {
        // fallback: user can type manually
      } finally {
        setIsLoading(false)
      }
    }

    generateCode()
  }, [brandMarketId, value, onChange])

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Marketing Code
      </label>
      <div className="flex items-center gap-2">
        <div className="flex rounded-md border border-gray-300 bg-white overflow-hidden">
          {/* Brand segment */}
          <div className="flex items-center border-r border-gray-200 bg-gray-50 px-2">
            <span className="text-xs text-gray-400">Brand</span>
          </div>
          <input
            type="text"
            maxLength={2}
            value={segments?.brand ?? ''}
            onChange={(e) => {
              const brand = e.target.value.toUpperCase().slice(0, 2)
              const rest = value.slice(2)
              onChange(`${brand}${rest}`)
            }}
            className="w-10 px-1.5 py-1.5 text-center text-sm font-mono font-semibold text-gray-900 focus:outline-none"
            placeholder="SG"
          />
          {/* Market segment */}
          <div className="flex items-center border-x border-gray-200 bg-gray-50 px-2">
            <span className="text-xs text-gray-400">Mkt</span>
          </div>
          <input
            type="text"
            maxLength={2}
            value={segments?.market ?? ''}
            onChange={(e) => {
              const brand = value.slice(0, 2)
              const market = e.target.value.toUpperCase().slice(0, 2)
              const seq = value.slice(4)
              onChange(`${brand}${market}${seq}`)
            }}
            className="w-10 px-1.5 py-1.5 text-center text-sm font-mono font-semibold text-gray-900 focus:outline-none"
            placeholder="US"
          />
          {/* Sequence segment */}
          <div className="flex items-center border-x border-gray-200 bg-gray-50 px-2">
            <span className="text-xs text-gray-400">Seq</span>
          </div>
          <input
            type="text"
            maxLength={2}
            value={segments?.sequence ?? ''}
            onChange={(e) => {
              const prefix = value.slice(0, 4)
              const seq = e.target.value.replace(/\D/g, '').slice(0, 2)
              onChange(`${prefix}${seq}`)
            }}
            className="w-10 px-1.5 py-1.5 text-center text-sm font-mono font-semibold text-gray-900 focus:outline-none"
            placeholder="01"
          />
        </div>
        {isLoading && (
          <span className="text-xs text-gray-400">generating...</span>
        )}
        {value && (
          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-mono font-semibold text-gray-700">
            {value}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-400">
        6-digit code: Brand(2) + Market(2) + Sequence(2)
      </p>
    </div>
  )
}

export { MarketingCodeInput, BRAND_CODES, MARKET_CODES }
