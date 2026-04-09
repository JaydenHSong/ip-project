// /ads/campaigns/[id] → M02 Campaign Detail
// Design Ref: §2.2 — Track A
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { CampaignDetailPanel } from '@/modules/ads/features/campaigns/components/campaign-detail-panel'
import type { CampaignDetail, UpdateCampaignRequest } from '@/modules/ads/features/campaigns/types'

const CampaignDetailPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params)
  const router = useRouter()
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCampaign = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/ads/campaigns/${id}`)
      if (!res.ok) throw new Error('Failed to fetch campaign')
      const json = await res.json() as { data: CampaignDetail }
      setCampaign(json.data)
    } catch (err) {
      // L1 fix: log fetch failures
      console.error('[ads/campaigns/[id]] fetch failed', err)
      setCampaign(null)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCampaign()
  }, [fetchCampaign])

  const handleUpdate = async (campaignId: string, data: UpdateCampaignRequest) => {
    const res = await fetch(`/api/ads/campaigns/${campaignId}`, {
      // L3 fix: PATCH is the RESTful verb for partial updates
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json() as { error: { message: string } }
      throw new Error(err.error.message)
    }
    await fetchCampaign()
  }

  const handleClose = () => {
    router.push('/ads/campaigns')
  }

  return (
    <CampaignDetailPanel
      campaign={campaign}
      isOpen={true}
      isLoading={isLoading}
      onClose={handleClose}
      onUpdate={handleUpdate}
    />
  )
}

export default CampaignDetailPage
