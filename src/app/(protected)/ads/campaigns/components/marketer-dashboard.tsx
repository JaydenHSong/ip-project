'use client'

import { CampaignsTabContent } from './campaigns-tab-content'
import type { CampaignFilters, SortConfig } from '@/modules/ads/features/campaigns/components/campaign-table'
import type { CampaignListItem, CampaignKpiSummary } from '@/modules/ads/features/campaigns/types'
import type { BudgetKpiData } from '@/modules/ads/features/budget-planning/types'
import type { RecommendationItem } from '@/modules/ads/features/optimization/types'

type Pagination = {
  page: number
  limit: number
  total: number
}

type MarketerDashboardProps = {
  selectedMarketId: string | null
  marketLabel: string | null
  userDisplayName: string | null
  campaigns: CampaignListItem[]
  kpi: CampaignKpiSummary | null
  budgetKpi: BudgetKpiData | null
  recommendations: RecommendationItem[]
  isLoading: boolean
  recLoading: boolean
  campaignsError: string | null
  recError: string | null
  filters: CampaignFilters
  sort: SortConfig
  pagination: Pagination
  onFiltersChange: (filters: CampaignFilters) => void
  onSortChange: (sort: SortConfig) => void
  onRowClick: (id: string) => void
  onCreateClick: () => void
  onRetryCampaigns: () => void
  onRetryRecommendations: () => void
  onRefreshSummaries: () => Promise<void>
  onPaginationChange: (updater: (prev: Pagination) => Pagination) => void
}

const MarketerDashboard = (props: MarketerDashboardProps) => <CampaignsTabContent {...props} />

export { MarketerDashboard }
