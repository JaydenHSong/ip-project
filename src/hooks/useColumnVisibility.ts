'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ColumnDef } from '@/constants/table-columns'
import { getDefaultHiddenIds } from '@/constants/table-columns'

type UseColumnVisibilityOptions = {
  columns: ColumnDef[]
  preferenceKey: string
}

type UseColumnVisibilityReturn = {
  hiddenIds: string[]
  isVisible: (id: string) => boolean
  toggleColumn: (id: string) => void
  resetToDefault: () => void
  isLoaded: boolean
}

export const useColumnVisibility = ({
  columns,
  preferenceKey,
}: UseColumnVisibilityOptions): UseColumnVisibilityReturn => {
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => getDefaultHiddenIds(columns))
  const [isLoaded, setIsLoaded] = useState(false)
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load from API on mount
  useEffect(() => {
    let cancelled = false
    fetch(`/api/user/preferences?key=${preferenceKey}`)
      .then((res) => res.json())
      .then((data: { value?: { hidden?: string[] } | null }) => {
        if (cancelled) return
        if (data.value?.hidden) {
          setHiddenIds(data.value.hidden)
        }
        setIsLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setIsLoaded(true)
      })
    return () => { cancelled = true }
  }, [preferenceKey])

  // Debounced save to API
  const saveToApi = useCallback((hidden: string[]) => {
    if (saveRef.current) clearTimeout(saveRef.current)
    saveRef.current = setTimeout(() => {
      fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: preferenceKey,
          value: { version: 1, hidden },
        }),
      }).catch(() => {})
    }, 500)
  }, [preferenceKey])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveRef.current) clearTimeout(saveRef.current)
    }
  }, [])

  const isVisible = useCallback((id: string) => !hiddenIds.includes(id), [hiddenIds])

  const toggleColumn = useCallback((id: string) => {
    const col = columns.find((c) => c.id === id)
    if (col?.locked) return

    setHiddenIds((prev) => {
      const next = prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]
      saveToApi(next)
      return next
    })
  }, [columns, saveToApi])

  const resetToDefault = useCallback(() => {
    const defaults = getDefaultHiddenIds(columns)
    setHiddenIds(defaults)
    saveToApi(defaults)
  }, [columns, saveToApi])

  return { hiddenIds, isVisible, toggleColumn, resetToDefault, isLoaded }
}
