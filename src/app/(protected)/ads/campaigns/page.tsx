// /ads/campaigns → S03 Marketer Campaign Table
// Design Ref: §2.2 — Track A
// Page Tabs: Campaigns | Budget Planning (Design S03)
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMarketContext } from '@/modules/ads/shared/hooks/use-market-context'
import { CampaignStatusStrip } from '@/modules/ads/features/campaigns/components/campaign-status-strip'
import { CampaignTable } from '@/modules/ads/features/campaigns/components/campaign-table'
import { CampaignCreateModal } from '@/modules/ads/features/campaigns/components/campaign-create-modal'
import { AiQueuePreview } from '@/modules/ads/features/campaigns/components/ai-queue-preview'
import type { CampaignFilters, SortConfig } from '@/modules/ads/features/campaigns/components/campaign-table'
import type { CampaignListItem, CampaignKpiSummary, CreateCampaignRequest } from '@/modules/ads/features/campaigns/types'

type PageTab = 'campaigns' | 'budget_planning'
type KpiView = 'personal' | 'team'

const AdsCampaignsPage = () => {
  const router = useRouter()
  const { selectedMarketId } = useMarketContext()

  // Page-level state
  const [pageTab, setPageTab] = useState<PageTab>('campaigns')
  const [kpiView, setKpiView] = useState<KpiView>('team')

  // Campaign state
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])
  const [kpi, setKpi] = useState<CampaignKpiSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })
  const [filters, setFilters] = useState<CampaignFilters>({
    status: '',
    mode: '',
    search: '',
  })
  const [sort, setSort] = useState<SortConfig>({ key: 'created_at', dir: 'desc' })

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    if (!selectedMarketId) {
      setCampaigns([])
      setKpi(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        brand_market_id: selectedMarketId,
        include_kpi: 'true',
        page: String(pagination.page),
        limit: String(pagination.limit),
        sort_by: sort.key,
        sort_dir: sort.dir,
      })
      if (filters.status) params.set('status', filters.status)
      if (filters.mode) params.set('mode', filters.mode)
      if (filters.search) params.set('search', filters.search)
      // Personal/Team KPI toggle — Design S03 "개인<->팀 전환"
      if (kpiView === 'personal') params.set('assigned_to', 'me')

      const res = await fetch(`/api/ads/campaigns?${params}`)
      if (!res.ok) throw new Error('Failed to fetch campaigns')

      const json = await res.json() as {
        data: CampaignListItem[]
        pagination: { page: number; limit: number; total: number }
        kpi: CampaignKpiSummary | null
      }

      setCampaigns(json.data)
      setPagination(json.pagination)
      if (json.kpi) setKpi(json.kpi)
    } catch {
      setCampaigns([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedMarketId, pagination.page, pagination.limit, sort, filters, kpiView])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

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
    await fetchCampaigns()
  }

  const handleBulkAction = async (action: string, ids: string[]) => {
    const statusMap: Record<string, string> = {
      pause: 'paused',
      resume: 'active',
      archive: 'archived',
    }

    const newStatus = statusMap[action]
    if (!newStatus) return

    await Promise.all(
      ids.map((id) =>
        fetch(`/api/ads/campaigns/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }),
      ),
    )
    await fetchCampaigns()
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page header + Tab bar — Design S03 */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Campaigns</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Manage your Amazon ad campaigns across all brands and markets.
            </p>
          </div>
        </div>

        {/* Page Tabs: Campaigns | Budget Planning — Design S03 */}
        <div className="mt-4 flex border-b border-gray-200">
          <button
            onClick={() => setPageTab('campaigns')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              pageTab === 'campaigns'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Campaigns
          </button>
          <button
            onClick={() => setPageTab('budget_planning')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              pageTab === 'budget_planning'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Budget Planning
          </button>
        </div>
      </div>

      {pageTab === 'campaigns' ? (
        <>
          {/* KPI Strip with personal/team toggle — Design S03 */}
          <div>
            <div className="mb-2 flex items-center justify-end">
              <div className="inline-flex rounded-md border border-gray-200 bg-white">
                <button
                  onClick={() => setKpiView('personal')}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    kpiView === 'personal'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  } rounded-l-md`}
                >
                  Personal
                </button>
                <button
                  onClick={() => setKpiView('team')}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    kpiView === 'team'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  } rounded-r-md`}
                >
                  Team
                </button>
              </div>
            </div>
            <CampaignStatusStrip summary={kpi} isLoading={isLoading} />
          </div>

          {/* AI Queue Preview — Design S03: "AI Queue 미리보기 4칸" */}
          {selectedMarketId && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">AI Action Queue</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {campaigns.filter((c) => c.mode === 'autopilot').slice(0, 4).map((c) => (
                  <AiQueuePreview
                    key={c.id}
                    campaignId={c.id}
                    brandMarketId={selectedMarketId}
                    maxItems={3}
                    className="h-full"
                  />
                ))}
                {campaigns.filter((c) => c.mode === 'autopilot').length === 0 && !isLoading && (
                  <p className="col-span-full text-sm text-gray-400 py-4 text-center">
                    No Auto Pilot campaigns — AI Queue is empty
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Campaign Table */}
          <CampaignTable
            campaigns={campaigns}
            isLoading={isLoading}
            filters={filters}
            sort={sort}
            onFiltersChange={setFilters}
            onSortChange={setSort}
            onRowClick={handleRowClick}
            onCreateClick={() => setIsCreateOpen(true)}
            onBulkAction={handleBulkAction}
          />

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  className="rounded border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.page * pagination.limit >= pagination.total}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  className="rounded border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Budget Planning Tab — placeholder for Track B */
        <div className="rounded-lg border border-gray-200 bg-white py-16 text-center">
          <div className="mb-3 mx-auto h-12 w-12 rounded-full bg-gray-100" />
          <p className="text-sm font-medium text-gray-900">Budget Planning</p>
          <p className="mt-1 text-sm text-gray-500">Annual budget planning with 12-month grid — Track B</p>
        </div>
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
