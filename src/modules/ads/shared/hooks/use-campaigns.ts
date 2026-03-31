// Design Ref: §2.1 shared/hooks — 캠페인 목록 훅
'use client'

import { useState, useEffect } from 'react'
import { useMarketContext } from './use-market-context'
import type { Campaign } from '../types'

type UseCampaignsOptions = {
  status?: string
  mode?: string
}

const useCampaigns = (options: UseCampaignsOptions = {}) => {
  const { selectedMarketId } = useMarketContext()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedMarketId) {
      setCampaigns([])
      setIsLoading(false)
      return
    }

    const fetchCampaigns = async () => {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({ brand_market_id: selectedMarketId })
      if (options.status) params.set('status', options.status)
      if (options.mode) params.set('mode', options.mode)

      try {
        const res = await fetch(`/api/ads/campaigns?${params}`)
        if (!res.ok) throw new Error('Failed to fetch campaigns')
        const data = await res.json() as { data: Campaign[] }
        setCampaigns(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCampaigns()
  }, [selectedMarketId, options.status, options.mode])

  return { campaigns, isLoading, error }
}

export { useCampaigns }
