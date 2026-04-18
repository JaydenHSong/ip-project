'use client'

import { useMemo } from 'react'
import { computeTabCounts, scoreCampaigns } from '@/modules/ads/features/campaigns/components/campaign-table/signals'
import { CampaignTable } from '@/modules/ads/features/campaigns/components/campaign-table'
import { CampaignsAiRecommendationsCard } from '@/modules/ads/features/campaigns/components/paper-s03/campaigns-ai-recommendations-card'
import { CampaignsBudgetPacingCard } from '@/modules/ads/features/campaigns/components/paper-s03/campaigns-budget-pacing-card'
import { CampaignsContextHeader } from '@/modules/ads/features/campaigns/components/paper-s03/campaigns-context-header'
import { CampaignsHealthDots } from '@/modules/ads/features/campaigns/components/paper-s03/campaigns-health-dots'
import type { CampaignFilters, SortConfig } from '@/modules/ads/features/campaigns/components/campaign-table'
import type { CampaignListItem, CampaignKpiSummary } from '@/modules/ads/features/campaigns/types'
import type { BudgetKpiData } from '@/modules/ads/features/budget-planning/types'
import type { RecommendationItem } from '@/modules/ads/features/optimization/types'

type Pagination = {
  page: number
  limit: number
  total: number
}

type CampaignsTabContentProps = {
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

const CampaignsTabContent = ({
  selectedMarketId,
  marketLabel,
  userDisplayName,
  campaigns,
  kpi,
  budgetKpi,
  recommendations,
  isLoading,
  recLoading,
  campaignsError,
  recError,
  filters,
  sort,
  pagination,
  onFiltersChange,
  onSortChange,
  onRowClick,
  onCreateClick,
  onRetryCampaigns,
  onRetryRecommendations,
  onRefreshSummaries,
  onPaginationChange,
}: CampaignsTabContentProps) => {
  const tabCounts = useMemo(() => computeTabCounts(scoreCampaigns(campaigns)), [campaigns])

  const onTrack = Math.max(0, tabCounts.all - tabCounts.critical - tabCounts.attention)

  const aiPending = useMemo(
    () => recommendations.filter((r) => r.status === 'pending').length,
    [recommendations],
  )

  if (!selectedMarketId) {
    return (
      <div className="rounded-lg border border-dashed border-th-border bg-surface-card p-8 text-center">
        <p className="text-sm text-th-text-muted">Select a market to view your campaign dashboard.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        <CampaignsContextHeader
          marketLabel={marketLabel}
          campaignTotal={kpi?.total_campaigns ?? pagination.total}
          userDisplayName={userDisplayName}
          isLoading={isLoading && campaigns.length === 0}
        />
        <CampaignsHealthDots
          critical={tabCounts.critical}
          attention={tabCounts.attention}
          onTrack={onTrack}
          isLoading={isLoading && campaigns.length === 0}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CampaignsBudgetPacingCard
            kpi={kpi}
            budgetKpi={budgetKpi}
            campaigns={campaigns}
            tabCritical={tabCounts.critical}
            tabAttention={tabCounts.attention}
            aiQueuePending={aiPending}
            isLoading={isLoading}
            error={campaignsError}
            onRetry={onRetryCampaigns}
          />
          <CampaignsAiRecommendationsCard
            brandMarketId={selectedMarketId}
            items={recommendations}
            isLoading={recLoading}
            error={recError}
            onRetry={onRetryRecommendations}
            onRefreshSummaries={onRefreshSummaries}
          />
        </div>
      </div>

      <CampaignTable
        campaigns={campaigns}
        isLoading={isLoading}
        filters={filters}
        sort={sort}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        onFiltersChange={onFiltersChange}
        onSortChange={onSortChange}
        onRowClick={onRowClick}
        onCreateClick={onCreateClick}
      />
    </>
  )
}

export { CampaignsTabContent }
