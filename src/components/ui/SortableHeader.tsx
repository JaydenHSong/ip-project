import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { SortState } from '@/types/table'

type SortableHeaderProps = {
  label: string
  field: string
  currentSort: SortState
  onSort: (field: string) => void
  className?: string
}

export const SortableHeader = ({ label, field, currentSort, onSort, className }: SortableHeaderProps) => {
  const isActive = currentSort.field === field

  return (
    <th className={cn('px-4 py-3', className)}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="flex items-center gap-1 text-xs font-semibold text-th-text-tertiary hover:text-th-text-secondary"
      >
        {label}
        {isActive ? (
          currentSort.direction === 'asc' ? (
            <ChevronUp className="h-3.5 w-3.5 text-th-accent" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-th-accent" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />
        )}
      </button>
    </th>
  )
}
