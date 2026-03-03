import type { MarketplaceCode } from '@/constants/marketplaces'

export const CAMPAIGN_STATUSES = ['active', 'paused', 'completed', 'scheduled'] as const
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export const CAMPAIGN_FREQUENCIES = ['daily', 'every_12h', 'every_6h', 'every_3d', 'weekly'] as const
export type CampaignFrequency = (typeof CAMPAIGN_FREQUENCIES)[number]

export type Campaign = {
  id: string
  keyword: string
  marketplace: MarketplaceCode
  start_date: string
  end_date: string | null
  frequency: CampaignFrequency
  max_pages: number
  status: CampaignStatus
  created_by: string
  created_at: string
  updated_at: string
}
