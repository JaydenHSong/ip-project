import { useMemo } from 'react'
import type { TableFilters } from '@/types/table'

export const useFilterableTable = <T>(
  data: T[],
  filters: TableFilters,
  getSearchableText: (item: T) => string,
  getViolationType: (item: T) => string,
  getMarketplace: (item: T) => string,
): T[] => {
  return useMemo(() => {
    let result = data

    if (filters.search) {
      const query = filters.search.toLowerCase()
      result = result.filter((item) =>
        getSearchableText(item).toLowerCase().includes(query),
      )
    }

    if (filters.violationType) {
      result = result.filter((item) => getViolationType(item) === filters.violationType)
    }

    if (filters.marketplace) {
      result = result.filter((item) => getMarketplace(item) === filters.marketplace)
    }

    return result
  }, [data, filters, getSearchableText, getViolationType, getMarketplace])
}
