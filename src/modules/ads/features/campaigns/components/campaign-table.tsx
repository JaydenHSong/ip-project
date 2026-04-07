// S03 — Marketer Campaign Table
// Design Ref: §2.1 campaigns/components/campaign-table.tsx
'use client'

import { useState, useCallback } from 'react'
import { AdsStatusBadge } from '@/modules/ads/shared/components/status-badge'
import { CampaignBadge } from '@/modules/ads/shared/components/campaign-badge'
import { ProgressBar } from '@/modules/ads/shared/components/progress-bar'
import { EmptyState } from '@/modules/ads/shared/components/empty-state'
import { BulkActionBar } from '@/modules/ads/shared/components/bulk-action-bar'
import type { CampaignListItem } from '../types'
import type { CampaignStatus, CampaignMode } from '@/modules/ads/shared/types'

// ─── Filters ───

type CampaignFilters = {
  status: CampaignStatus | ''
  mode: CampaignMode | ''
  search: string
}

type SortConfig = {
  key: string
  dir: 'asc' | 'desc'
}

type CampaignTableProps = {
  campaigns: CampaignListItem[]
  isLoading?: boolean
  filters: CampaignFilters
  sort: SortConfig
  onFiltersChange: (filters: CampaignFilters) => void
  onSortChange: (sort: SortConfig) => void
  onRowClick: (id: string) => void
  onCreateClick: () => void
  onBulkAction: (action: string, ids: string[]) => void
}

// ─── Sort Header ───

const SortHeader = ({
  label,
  sortKey,
  currentSort,
  onSort,
  className = '',
}: {
  label: string
  sortKey: string
  currentSort: SortConfig
  onSort: (sort: SortConfig) => void
  className?: string
}) => {
  const isActive = currentSort.key === sortKey
  const handleClick = () => {
    onSort({
      key: sortKey,
      dir: isActive && currentSort.dir === 'asc' ? 'desc' : 'asc',
    })
  }

  return (
    <th
      className={`cursor-pointer select-none px-4 py-3 text-left text-xs font-medium text-th-text-muted hover:text-th-text-secondary ${className}`}
      onClick={handleClick}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          <span className="text-orange-500">{currentSort.dir === 'asc' ? '\u2191' : '\u2193'}</span>
        )}
      </span>
    </th>
  )
}

// ─── Skeleton Row ───

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-4 py-3"><div className="h-4 w-4 rounded bg-th-bg-tertiary" /></td>
    <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-th-bg-tertiary" /></td>
    <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-th-bg-tertiary" /></td>
    <td className="px-4 py-3"><div className="h-4 w-14 rounded bg-th-bg-tertiary" /></td>
    <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-th-bg-tertiary" /></td>
    <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-th-bg-tertiary" /></td>
    <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-th-bg-tertiary" /></td>
    <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-th-bg-tertiary" /></td>
    <td className="px-4 py-3"><div className="h-4 w-10 rounded bg-th-bg-tertiary" /></td>
  </tr>
)

// ─── Main Table ───

const CampaignTable = ({
  campaigns,
  isLoading,
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  onRowClick,
  onCreateClick,
  onBulkAction,
}: CampaignTableProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === campaigns.length
        ? new Set()
        : new Set(campaigns.map((c) => c.id)),
    )
  }, [campaigns])

  const handleBulkAction = (action: string) => {
    onBulkAction(action, Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  return (
    <div>
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-t-lg border border-b-0 border-th-border bg-th-bg-hover px-4 py-3">
        <input
          type="text"
          placeholder="Search campaigns..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="w-56 rounded-md border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text-secondary placeholder-th-text-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        <select
          value={filters.status}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as CampaignStatus | '' })}
          className="rounded-md border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text-secondary focus:border-orange-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="active">Running</option>
          <option value="learning">Learning</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={filters.mode}
          onChange={(e) => onFiltersChange({ ...filters, mode: e.target.value as CampaignMode | '' })}
          className="rounded-md border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text-secondary focus:border-orange-500 focus:outline-none"
        >
          <option value="">All Mode</option>
          <option value="autopilot">Auto Pilot</option>
          <option value="manual">Manual</option>
        </select>
        <div className="ml-auto">
          <button
            onClick={onCreateClick}
            className="rounded-md bg-orange-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
          >
            + New Campaign
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-b-lg border border-th-border">
        <table className="w-full text-sm">
          <thead className="border-b border-th-border bg-surface-card">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.size === campaigns.length && campaigns.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-th-border text-orange-500 focus:ring-orange-500"
                />
              </th>
              <SortHeader label="Campaign" sortKey="name" currentSort={sort} onSort={onSortChange} className="min-w-[200px]" />
              <th className="px-4 py-3 text-left text-xs font-medium text-th-text-muted">Mode</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-th-text-muted">Status</th>
              <SortHeader label="Budget" sortKey="daily_budget" currentSort={sort} onSort={onSortChange} />
              <SortHeader label="Spend Today" sortKey="spend_today" currentSort={sort} onSort={onSortChange} />
              <SortHeader label="ACoS" sortKey="acos" currentSort={sort} onSort={onSortChange} />
              <SortHeader label="ROAS" sortKey="roas" currentSort={sort} onSort={onSortChange} />
              <SortHeader label="Orders 7d" sortKey="orders_7d" currentSort={sort} onSort={onSortChange} />
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    title="No campaigns found"
                    description="Create your first campaign to get started."
                    actionLabel="Create Campaign"
                    onAction={onCreateClick}
                  />
                </td>
              </tr>
            ) : (
              campaigns.map((c) => {
                const budgetPacing = c.daily_budget
                  ? (c.spend_today / c.daily_budget) * 100
                  : 0

                return (
                  <tr
                    key={c.id}
                    className="cursor-pointer hover:bg-th-bg-hover transition-colors"
                    onClick={() => onRowClick(c.id)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded border-th-border text-orange-500 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-th-text truncate max-w-[240px]">{c.name}</p>
                        <p className="text-xs text-th-text-muted mt-0.5">
                          {c.marketing_code} &middot; {c.campaign_type.toUpperCase()}
                          {c.assigned_to && ` \u00B7 ${c.assigned_to.name}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <CampaignBadge mode={c.mode} />
                    </td>
                    <td className="px-4 py-3">
                      <AdsStatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24">
                        <p className="text-th-text">
                          ${(c.daily_budget ?? c.weekly_budget ?? 0).toFixed(0)}
                          <span className="text-xs text-th-text-muted">
                            /{c.daily_budget ? 'd' : 'w'}
                          </span>
                        </p>
                        {c.daily_budget && (
                          <ProgressBar value={budgetPacing} showPercent={false} size="sm" className="mt-1" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-th-text-secondary">
                      ${c.spend_today.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={c.acos != null && c.target_acos != null && c.acos > c.target_acos ? 'text-red-600 font-medium' : 'text-th-text-secondary'}>
                        {c.acos != null ? `${c.acos.toFixed(1)}%` : '-'}
                      </span>
                      {c.target_acos != null && (
                        <p className="text-xs text-th-text-muted">target {c.target_acos}%</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-th-text-secondary">
                      {c.roas != null ? `${c.roas.toFixed(2)}x` : '-'}
                    </td>
                    <td className="px-4 py-3 text-th-text-secondary">
                      {c.orders_7d.toLocaleString()}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        actions={[
          { key: 'pause', label: 'Pause' },
          { key: 'resume', label: 'Resume' },
          { key: 'assign', label: 'Assign' },
          { key: 'archive', label: 'Archive', variant: 'danger' },
        ]}
        onAction={handleBulkAction}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  )
}

export { CampaignTable }
export type { CampaignFilters, SortConfig }
