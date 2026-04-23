// Design Ref: ft-optimization-ui-wiring §2.1.2 — Bulk 체크박스 선택 상태 재사용
// Generic row selection hook for table UIs with bulk actions.
// Primary consumer: bid-optimization (S04), expandable to S06/S11.

'use client'

import { useCallback, useMemo, useState } from 'react'

export function useRowSelection<T extends { id: string }>(rows: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
    )
  }, [rows])

  const clear = useCallback(() => setSelectedIds(new Set()), [])

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(r.id)),
    [rows, selectedIds],
  )

  const allSelected = rows.length > 0 && selectedIds.size === rows.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < rows.length
  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  return {
    selectedIds,
    selectedRows,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
    isSelected,
  }
}
