// Design Ref: §2.1 shared/components — 캠페인 셀렉터 (단일)
'use client'

import { useMarketContext } from '../hooks/use-market-context'
import { useCampaigns } from '../hooks/use-campaigns'
import type { CampaignStatus } from '../types'

type CampaignSelectorProps = {
  value: string | null
  onChange: (campaignId: string) => void
  statusFilter?: CampaignStatus
  className?: string
  placeholder?: string
}

const CampaignSelector = ({
  value,
  onChange,
  statusFilter,
  className = '',
  placeholder = 'Select campaign...',
}: CampaignSelectorProps) => {
  const { selectedMarketId } = useMarketContext()
  const { campaigns, isLoading } = useCampaigns(
    statusFilter ? { status: statusFilter } : {},
  )

  if (!selectedMarketId) {
    return (
      <select disabled className={`rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 ${className}`}>
        <option>Select market first</option>
      </select>
    )
  }

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={isLoading}
      className={`rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 ${className}`}
    >
      <option value="">{isLoading ? 'Loading...' : placeholder}</option>
      {campaigns.map((c) => (
        <option key={c.id} value={c.id}>
          [{c.marketing_code}] {c.name}
        </option>
      ))}
    </select>
  )
}

export { CampaignSelector }
