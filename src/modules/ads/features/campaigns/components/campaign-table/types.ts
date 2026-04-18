import type { CampaignListItem } from '../../types'
import type { CampaignMode, CampaignStatus } from '@/modules/ads/shared/types'

type CampaignFilters = {
  status: CampaignStatus | ''
  mode: CampaignMode | ''
  search: string
}

type SortConfig = {
  key: string
  dir: 'asc' | 'desc'
}

type CampaignTablePagination = {
  page: number
  limit: number
  total: number
}

type CampaignTableProps = {
  campaigns: CampaignListItem[]
  isLoading?: boolean
  filters: CampaignFilters
  sort: SortConfig
  pagination: CampaignTablePagination
  onPaginationChange: (updater: (prev: CampaignTablePagination) => CampaignTablePagination) => void
  onFiltersChange: (filters: CampaignFilters) => void
  onSortChange: (sort: SortConfig) => void
  onRowClick: (id: string) => void
  onCreateClick: () => void
}

type CampaignViewTab = 'all' | 'critical' | 'attention' | 'autopilot'
type CampaignSignal = 'critical' | 'attention' | 'normal'
type ScoredCampaign = CampaignListItem & {
  signal: CampaignSignal
}

const CAMPAIGN_VIEW_TABS: ReadonlyArray<readonly [CampaignViewTab, string]> = [
  ['all', 'All Campaigns'],
  ['critical', 'Critical'],
  ['attention', 'Attention'],
  ['autopilot', 'Auto Pilot'],
] as const

export type {
  CampaignFilters,
  SortConfig,
  CampaignTablePagination,
  CampaignTableProps,
  CampaignViewTab,
  CampaignSignal,
  ScoredCampaign,
}
export { CAMPAIGN_VIEW_TABS }
