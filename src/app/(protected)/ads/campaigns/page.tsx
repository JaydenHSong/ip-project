// /ads/campaigns → S03 Marketer Campaign Table
// Design Ref: §2.2 — Track A
// Page Tabs: Campaigns | Budget Planning (Design S03)
'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMarketContext } from '@/modules/ads/shared/hooks/use-market-context'
import { CampaignCreateModal } from '@/modules/ads/features/campaigns/components/campaign-create-modal'
import type { CampaignFilters, SortConfig } from '@/modules/ads/features/campaigns/components/campaign-table'
import type { CreateCampaignRequest } from '@/modules/ads/features/campaigns/types'
import { PageTabsHeader } from './components/page-tabs-header'
import type { PageTab } from './components/page-tabs-header'
import { MarketerDashboard } from './components/marketer-dashboard'
import { BudgetPlanningTabContent } from './components/budget-planning-tab-content'
import { useCampaignsPageData } from './hooks/use-campaigns-page-data'

const AdsCampaignsPage = () => {
  const router = useRouter()
  const { selectedMarketId } = useMarketContext()
  const [pageTab, setPageTab] = useState<PageTab>('campaigns')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [filters, setFilters] = useState<CampaignFilters>({
    status: '',
    mode: '',
    search: '',
  })
  /** status asc: active → archived → learning → paused(lexicographic), then newest first */
  const [sort, setSort] = useState<SortConfig>({ key: 'status', dir: 'asc' })

  const currentYear = new Date().getFullYear()
  const {
    campaigns,
    kpi,
    marketLabel,
    marketplace,
    userDisplayName,
    userRole,
    recommendations,
    budgetData,
    budgetKpi,
    budgetOrgUnitId,
    setBudgetOrgUnitId,
    isLoading,
    recLoading,
    isBudgetLoading,
    budgetError,
    fetchBudget,
    campaignsError,
    recError,
    pagination,
    setPagination,
    fetchCampaigns,
    fetchRecommendations,
    handleBudgetSave,
  } = useCampaignsPageData({
    selectedMarketId,
    pageTab,
    currentYear,
    filters,
    sort,
  })

  // Handlers
  const handleRowClick = (id: string) => {
    router.push(`/ads/campaigns/${id}`)
  }

  const handleCreateSubmit = async (data: CreateCampaignRequest) => {
    const res = await fetch('/api/ads/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json() as { error: { message: string } }
      throw new Error(err.error.message)
    }
    await Promise.all([fetchCampaigns(), fetchRecommendations()])
  }

  const refreshSummaries = useCallback(
    () => Promise.all([fetchCampaigns(), fetchRecommendations()]).then(() => undefined),
    [fetchCampaigns, fetchRecommendations],
  )

  return (
    <div className="space-y-5 p-6">
      <PageTabsHeader pageTab={pageTab} onTabChange={setPageTab} />

      {pageTab === 'campaigns' ? (
        <MarketerDashboard
          selectedMarketId={selectedMarketId}
          marketLabel={marketLabel}
          userDisplayName={userDisplayName}
          campaigns={campaigns}
          kpi={kpi}
          budgetKpi={budgetKpi}
          recommendations={recommendations}
          isLoading={isLoading}
          recLoading={recLoading}
          campaignsError={campaignsError}
          recError={recError}
          filters={filters}
          sort={sort}
          pagination={pagination}
          onFiltersChange={setFilters}
          onSortChange={setSort}
          onRowClick={handleRowClick}
          onCreateClick={() => setIsCreateOpen(true)}
          onRetryCampaigns={fetchCampaigns}
          onRetryRecommendations={fetchRecommendations}
          onRefreshSummaries={refreshSummaries}
          onPaginationChange={setPagination}
        />
      ) : (
        <BudgetPlanningTabContent
          selectedMarketId={selectedMarketId}
          currentYear={currentYear}
          budgetData={budgetData}
          budgetKpi={budgetKpi}
          isBudgetLoading={isBudgetLoading}
          budgetError={budgetError}
          onRetryBudget={fetchBudget}
          onBudgetSave={handleBudgetSave}
          userRole={userRole}
          budgetOrgUnitId={budgetOrgUnitId}
          onBudgetTeamChange={(id) => setBudgetOrgUnitId(id)}
          marketLabel={marketLabel}
          marketplace={marketplace}
        />
      )}

      {/* Create Modal */}
      <CampaignCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
      />
    </div>
  )
}

export default AdsCampaignsPage
