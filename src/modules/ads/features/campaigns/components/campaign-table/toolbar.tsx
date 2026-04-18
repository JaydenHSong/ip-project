'use client'

import type { CampaignMode, CampaignStatus } from '@/modules/ads/shared/types'
import { CAMPAIGN_VIEW_TABS } from './types'
import type { CampaignFilters, CampaignViewTab } from './types'

type CampaignTableToolbarProps = {
  viewTab: CampaignViewTab
  tabCounts: Record<CampaignViewTab, number>
  filters: CampaignFilters
  onViewTabChange: (tab: CampaignViewTab) => void
  onFiltersChange: (filters: CampaignFilters) => void
  onCreateClick: () => void
}

const CampaignTableToolbar = ({
  viewTab,
  tabCounts,
  filters,
  onViewTabChange,
  onFiltersChange,
  onCreateClick,
}: CampaignTableToolbarProps) => (
  <>
    <div className="flex items-center justify-between border-b border-th-border px-3">
      <div className="flex">
        {CAMPAIGN_VIEW_TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => onViewTabChange(key)}
            className={`border-b-2 px-2.5 py-2 text-[11px] transition-colors ${
              viewTab === key
                ? 'border-orange-500 text-th-text'
                : 'border-transparent text-th-text-muted hover:text-th-text-secondary'
            }`}
          >
            {label}
            <span className="ml-1 text-[10px] text-th-text-muted">({tabCounts[key]})</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 py-2">
        <input
          type="text"
          placeholder="Search campaigns..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="w-48 rounded-md border border-th-border bg-th-bg-hover px-2.5 py-1.5 text-[11px] text-th-text-secondary placeholder-th-text-muted focus:border-orange-500 focus:outline-none"
        />
        <button
          onClick={onCreateClick}
          className="rounded-md bg-orange-500 px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-orange-600"
        >
          + New Campaign
        </button>
      </div>
    </div>

    <div className="flex items-center gap-1.5 border-b border-th-border bg-th-bg-hover/70 px-3 py-1.5">
      <span className="text-[10px] uppercase tracking-wide text-th-text-muted">Filters</span>
      <select
        value={filters.status}
        onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as CampaignStatus | '' })}
        className="rounded-md border border-th-border bg-surface-card px-2 py-1 text-[10px] text-th-text-secondary focus:border-orange-500 focus:outline-none"
      >
        <option value="">Status</option>
        <option value="active">Running</option>
        <option value="learning">Learning</option>
        <option value="paused">Paused</option>
        <option value="archived">Archived</option>
      </select>
      <select
        value={filters.mode}
        onChange={(e) => onFiltersChange({ ...filters, mode: e.target.value as CampaignMode | '' })}
        className="rounded-md border border-th-border bg-surface-card px-2 py-1 text-[10px] text-th-text-secondary focus:border-orange-500 focus:outline-none"
      >
        <option value="">Type</option>
        <option value="autopilot">Auto Pilot</option>
        <option value="manual">Manual</option>
      </select>
      <select
        disabled
        className="cursor-not-allowed rounded-md border border-th-border bg-th-bg-hover px-2 py-1 text-[10px] text-th-text-muted"
      >
        <option>Match</option>
      </select>
    </div>
  </>
)

export { CampaignTableToolbar }
