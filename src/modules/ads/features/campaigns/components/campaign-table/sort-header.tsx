'use client'

import type { SortConfig } from './types'

type SortHeaderProps = {
  label: string
  sortKey: string
  currentSort: SortConfig
  onSort: (sort: SortConfig) => void
  className?: string
}

const SortHeader = ({
  label,
  sortKey,
  currentSort,
  onSort,
  className = '',
}: SortHeaderProps) => {
  const isActive = currentSort.key === sortKey

  const handleClick = () => {
    onSort({
      key: sortKey,
      dir: isActive && currentSort.dir === 'asc' ? 'desc' : 'asc',
    })
  }

  return (
    <th
      className={`cursor-pointer select-none px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wide text-th-text-muted hover:text-th-text-secondary ${className}`}
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

export { SortHeader }
