import { useState, useMemo } from 'react'
import type { SortState, SortDirection } from '@/types/table'

export const useSortableTable = <T>(
  data: T[],
  defaultSort: SortState,
  getSortValue: (item: T, field: string) => string | number | null,
): {
  sortedData: T[]
  sort: SortState
  toggleSort: (field: string) => void
} => {
  const [sort, setSort] = useState<SortState>(defaultSort)

  const toggleSort = (field: string) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, direction: (prev.direction === 'asc' ? 'desc' : 'asc') as SortDirection }
      }
      return { field, direction: 'desc' }
    })
  }

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      const aVal = getSortValue(a, sort.field)
      const bVal = getSortValue(b, sort.field)

      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1

      let cmp = 0
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal)
      } else {
        cmp = (aVal as number) - (bVal as number)
      }

      return sort.direction === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [data, sort, getSortValue])

  return { sortedData, sort, toggleSort }
}
