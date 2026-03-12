'use client'

import { useState } from 'react'
import { SearchIcon, SlidersHorizontal, CalendarIcon } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { SlidePanel } from '@/components/ui/SlidePanel'
import { BR_FORM_TYPE_OPTIONS } from '@/constants/br-form-types'
import type { TableFilters as TableFiltersType } from '@/types/table'

const MARKETPLACES = ['US', 'JP', 'UK', 'DE', 'FR', 'IT', 'ES', 'CA', 'MX', 'AU', 'IN'] as const

type TableFiltersProps = {
  filters: TableFiltersType
  onFiltersChange: (filters: TableFiltersType) => void
  showViolationType?: boolean
  showMarketplace?: boolean
  showDateRange?: boolean
}

const FilterControls = ({
  filters,
  onFiltersChange,
  showViolationType = true,
  showMarketplace = true,
  showDateRange = true,
}: TableFiltersProps) => {
  const { t } = useI18n()

  const updateFilter = (key: keyof TableFiltersType, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <>
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
          className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-2 text-sm text-th-text focus:border-th-accent focus:outline-none focus:ring-1 focus:ring-th-accent sm:w-auto"
        >
          <option value="">{t('table.allTypes' as Parameters<typeof t>[0])}</option>
          {BR_FORM_TYPE_OPTIONS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      )}
      {showMarketplace && (
        <select
          value={filters.marketplace}
          onChange={(e) => updateFilter('marketplace', e.target.value)}
          className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-2 text-sm text-th-text focus:border-th-accent focus:outline-none focus:ring-1 focus:ring-th-accent sm:w-auto"
        >
          <option value="">{t('table.allMarketplaces' as Parameters<typeof t>[0])}</option>
          {MARKETPLACES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      )}
      {showDateRange && (
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="hidden h-4 w-4 shrink-0 text-th-text-muted sm:block" />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
            className="w-full rounded-lg border border-th-border bg-surface-card px-2 py-2 text-sm text-th-text focus:border-th-accent focus:outline-none focus:ring-1 focus:ring-th-accent sm:w-[130px]"
          />
          <span className="text-xs text-th-text-muted">~</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
            className="w-full rounded-lg border border-th-border bg-surface-card px-2 py-2 text-sm text-th-text focus:border-th-accent focus:outline-none focus:ring-1 focus:ring-th-accent sm:w-[130px]"
          />
        </div>
      )}
    </>
  )
}

export const TableFilters = (props: TableFiltersProps) => {
  const { t } = useI18n()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const activeFilterCount = [props.filters.violationType, props.filters.marketplace, props.filters.dateFrom, props.filters.dateTo].filter(Boolean).length

  return (
    <>
      {/* Desktop: inline filters */}
      <div className="hidden flex-col gap-3 sm:flex sm:flex-row sm:items-center">
        <FilterControls {...props} />
      </div>

      {/* Mobile: search + filter button */}
      <div className="flex items-center gap-2 sm:hidden">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-th-text-muted" />
          <input
            type="text"
            value={props.filters.search}
            onChange={(e) => props.onFiltersChange({ ...props.filters, search: e.target.value })}
            placeholder={t('table.searchPlaceholder' as Parameters<typeof t>[0])}
            className="w-full rounded-lg border border-th-border bg-surface-card py-2 pl-9 pr-3 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none focus:ring-1 focus:ring-th-accent"
          />
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="relative flex items-center gap-1.5 rounded-lg border border-th-border px-3 py-2 text-sm text-th-text-secondary hover:bg-th-bg-hover"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t('common.filter')}
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-th-accent text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile filter drawer */}
      <SlidePanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={t('common.filter')}
        size="sm"
      >
        <div className="space-y-4 p-6">
          <FilterControls {...props} />
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="w-full rounded-lg bg-th-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {t('common.filter')}
          </button>
        </div>
      </SlidePanel>
    </>
  )
}
