// S03 — Marketer Campaign Table
// Design Ref: §2.1 campaigns/components/campaign-table.tsx
'use client'

import { useMemo, useState } from 'react'
import { EmptyState } from '@/modules/ads/shared/components/empty-state'
import { CampaignTableToolbar } from './campaign-table/toolbar'
import { CampaignTableHead } from './campaign-table/table-head'
import { SkeletonRow } from './campaign-table/skeleton-row'
import { CampaignTableRow } from './campaign-table/table-row'
import { TablePaginationFooter } from './campaign-table/table-pagination-footer'
import { computeTabCounts, scoreCampaigns } from './campaign-table/signals'
import type { CampaignTableProps, CampaignViewTab } from './campaign-table/types'

const CampaignTable = ({
  campaigns,
  isLoading,
  filters,
  sort,
  pagination,
  onPaginationChange,
  onFiltersChange,
  onSortChange,
  onRowClick,
  onCreateClick,
}: CampaignTableProps) => {
  const [viewTab, setViewTab] = useState<CampaignViewTab>('all')

  const scoredCampaigns = useMemo(() => scoreCampaigns(campaigns), [campaigns])

  const filteredCampaigns = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase()
    return scoredCampaigns.filter((campaign) => {
      if (filters.status && campaign.status !== filters.status) return false
      if (filters.mode && campaign.mode !== filters.mode) return false
      if (keyword) {
        const searchTarget = `${campaign.name} ${campaign.marketing_code}`.toLowerCase()
        if (!searchTarget.includes(keyword)) return false
      }
      if (viewTab === 'critical') return campaign.signal === 'critical'
      if (viewTab === 'attention') return campaign.signal === 'attention'
      if (viewTab === 'autopilot') return campaign.mode === 'autopilot'
      return true
    })
  }, [filters, scoredCampaigns, viewTab])

  const tabCounts = useMemo(() => computeTabCounts(scoredCampaigns), [scoredCampaigns])

  return (
    <div className="overflow-hidden rounded-xl border border-th-border bg-surface-card">
      <CampaignTableToolbar
        viewTab={viewTab}
        tabCounts={tabCounts}
        filters={filters}
        onViewTabChange={setViewTab}
        onFiltersChange={onFiltersChange}
        onCreateClick={onCreateClick}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <CampaignTableHead sort={sort} onSortChange={onSortChange} />
          <tbody className="divide-y divide-th-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filteredCampaigns.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    title="No campaigns found"
                    description="Create your first campaign to get started."
                    actionLabel="Create Campaign"
                    onAction={onCreateClick}
                  />
                </td>
              </tr>
            ) : (
              filteredCampaigns.map((campaign) => (
                <CampaignTableRow key={campaign.id} campaign={campaign} onRowClick={onRowClick} />
              ))
            )}
          </tbody>
        </table>
      </div>
      <TablePaginationFooter
        pagination={pagination}
        filteredRowCount={filteredCampaigns.length}
        loadedRowCount={campaigns.length}
        isLoading={isLoading}
        onPaginationChange={onPaginationChange}
      />
    </div>
  )
}

export { CampaignTable }
export type { CampaignFilters, SortConfig, CampaignTablePagination } from './campaign-table/types'
