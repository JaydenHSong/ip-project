'use client'

import { SearchIcon } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { VIOLATION_TYPES } from '@/constants/violations'
import type { TableFilters as TableFiltersType } from '@/types/table'

const MARKETPLACES = ['US', 'JP', 'UK', 'DE', 'FR', 'IT', 'ES', 'CA', 'AU', 'IN'] as const

type TableFiltersProps = {
  filters: TableFiltersType
  onFiltersChange: (filters: TableFiltersType) => void
  showViolationType?: boolean
  showMarketplace?: boolean
}

export const TableFilters = ({
  filters,
  onFiltersChange,
  showViolationType = true,
  showMarketplace = true,
}: TableFiltersProps) => {
  const { t } = useI18n()

  const updateFilter = (key: keyof TableFiltersType, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-th-text-muted" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          placeholder={t('table.searchPlaceholder' as Parameters<typeof t>[0])}
          className="w-full rounded-lg border border-th-border bg-surface-card py-2 pl-9 pr-3 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none focus:ring-1 focus:ring-th-accent"
        />
      </div>
      {showViolationType && (
        <select
          value={filters.violationType}
          onChange={(e) => updateFilter('violationType', e.target.value)}
          className="rounded-lg border border-th-border bg-surface-card px-3 py-2 text-sm text-th-text focus:border-th-accent focus:outline-none focus:ring-1 focus:ring-th-accent"
        >
          <option value="">{t('table.allTypes' as Parameters<typeof t>[0])}</option>
          {Object.values(VIOLATION_TYPES).map((v) => (
            <option key={v.code} value={v.code}>
              {v.code} — {v.name}
            </option>
          ))}
        </select>
      )}
      {showMarketplace && (
        <select
          value={filters.marketplace}
          onChange={(e) => updateFilter('marketplace', e.target.value)}
          className="rounded-lg border border-th-border bg-surface-card px-3 py-2 text-sm text-th-text focus:border-th-accent focus:outline-none focus:ring-1 focus:ring-th-accent"
        >
          <option value="">{t('table.allMarketplaces' as Parameters<typeof t>[0])}</option>
          {MARKETPLACES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      )}
    </div>
  )
}
