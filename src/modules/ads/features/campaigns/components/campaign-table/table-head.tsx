'use client'

import { SortHeader } from './sort-header'
import type { SortConfig } from './types'

type CampaignTableHeadProps = {
  sort: SortConfig
  onSortChange: (sort: SortConfig) => void
}

const CampaignTableHead = ({ sort, onSortChange }: CampaignTableHeadProps) => (
  <thead className="border-b border-th-border bg-th-bg-hover/40">
    <tr>
      <SortHeader label="Campaign" sortKey="name" currentSort={sort} onSort={onSortChange} className="min-w-[200px]" />
      <SortHeader label="Status" sortKey="status" currentSort={sort} onSort={onSortChange} />
      <SortHeader label="Budget" sortKey="daily_budget" currentSort={sort} onSort={onSortChange} className="text-right" />
      <SortHeader label="Spend" sortKey="spend_today" currentSort={sort} onSort={onSortChange} className="text-right" />
      <SortHeader label="ACoS" sortKey="acos" currentSort={sort} onSort={onSortChange} className="text-right" />
      <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wide text-th-text-muted">CTR</th>
      <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wide text-th-text-muted">Impr</th>
      <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wide text-th-text-muted">Mode</th>
    </tr>
  </thead>
)

export { CampaignTableHead }
