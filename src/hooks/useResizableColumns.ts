'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'

type UseResizableColumnsOptions = {
  /** Storage key for persisting widths (localStorage) */
  storageKey: string
  /** Default widths in px for each column index */
  defaultWidths: number[]
  /** Minimum column width in px */
  minWidth?: number
}

type UseResizableColumnsReturn = {
  /** Current column widths */
  widths: number[]
  /** Ref to attach to the scroll container div (for auto-fit) */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Style for the <table> element — sets width to sum of columns */
  tableStyle: React.CSSProperties
  /** Get inline style for a col element */
  getColStyle: (index: number) => React.CSSProperties
  /** Get props for the resize handle element — place inside <th> */
  getResizeHandleProps: (index: number) => {
    onMouseDown: (e: React.MouseEvent) => void
    onDoubleClick: () => void
    style: React.CSSProperties
    className: string
    role: string
    'aria-label': string
  }
  /** Reset all widths to defaults */
  resetWidths: () => void
}

const STORAGE_PREFIX = 'col-widths:'

const loadWidths = (key: string, defaults: number[]): number[] | null => {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (stored) {
      const parsed = JSON.parse(stored) as number[]
      if (parsed.length === defaults.length) return parsed
    }
  } catch { /* ignore */ }
  return null
}

const saveWidths = (key: string, widths: number[]): void => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(widths))
  } catch { /* ignore */ }
}

const scaleToFit = (defaults: number[], containerWidth: number, minWidth: number): number[] => {
  const sum = defaults.reduce((s, w) => s + w, 0)
  if (containerWidth <= sum) return defaults
  const ratio = containerWidth / sum
  return defaults.map((w) => Math.max(minWidth, Math.round(w * ratio)))
}

export const useResizableColumns = ({
  storageKey,
  defaultWidths,
  minWidth = 40,
}: UseResizableColumnsOptions): UseResizableColumnsReturn => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const initializedRef = useRef(false)
  const [widths, setWidths] = useState<number[]>(() => loadWidths(storageKey, defaultWidths) ?? defaultWidths)
  const dragRef = useRef<{ index: number; startX: number; startWidth: number } | null>(null)

  // On mount: if no saved widths, scale defaults to fill container
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const saved = loadWidths(storageKey, defaultWidths)
    if (saved) return // user has custom widths, keep them
    const el = containerRef.current
    if (!el) return
    const cw = el.clientWidth
    if (cw > 0) {
      const scaled = scaleToFit(defaultWidths, cw, minWidth)
      setWidths(scaled)
    }
  }, [storageKey, defaultWidths, minWidth])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragRef.current) return
      const { index, startX, startWidth } = dragRef.current
      const delta = e.clientX - startX
      const newWidth = Math.max(minWidth, startWidth + delta)
      setWidths((prev) => {
        const next = [...prev]
        next[index] = newWidth
        return next
      })
    },
    [minWidth],
  )

  const handleMouseUp = useCallback(() => {
    if (!dragRef.current) return
    dragRef.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    setWidths((current) => {
      saveWidths(storageKey, current)
      return current
    })
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [storageKey, handleMouseMove])

  const handleMouseDown = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current = { index, startX: e.clientX, startWidth: widths[index] }
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [widths, handleMouseMove, handleMouseUp],
  )

  const tableStyle = useMemo<React.CSSProperties>(
    () => ({ width: widths.reduce((sum, w) => sum + w, 0) }),
    [widths],
  )

  const getColStyle = useCallback(
    (index: number): React.CSSProperties => ({
      width: widths[index],
      minWidth: minWidth,
    }),
    [widths, minWidth],
  )

  const getResizeHandleProps = useCallback(
    (index: number) => ({
      onMouseDown: (e: React.MouseEvent) => handleMouseDown(index, e),
      onDoubleClick: () => {
        // Reset this column to fit-scaled default
        const el = containerRef.current
        const cw = el?.clientWidth ?? 0
        const scaled = cw > 0 ? scaleToFit(defaultWidths, cw, minWidth) : defaultWidths
        setWidths((prev) => {
          const next = [...prev]
          next[index] = scaled[index]
          saveWidths(storageKey, next)
          return next
        })
      },
      style: {
        position: 'absolute' as const,
        right: -3,
        top: 0,
        height: '200vh',
        width: '6px',
        cursor: 'col-resize',
        zIndex: 1,
      },
      className: 'bg-transparent hover:bg-th-accent/30 active:bg-th-accent/50 transition-colors',
      role: 'separator',
      'aria-label': `Resize column ${index + 1}`,
    }),
    [handleMouseDown, defaultWidths, storageKey, minWidth],
  )

  const resetWidths = useCallback(() => {
    const el = containerRef.current
    const cw = el?.clientWidth ?? 0
    const scaled = cw > 0 ? scaleToFit(defaultWidths, cw, minWidth) : defaultWidths
    setWidths(scaled)
    saveWidths(storageKey, scaled)
  }, [defaultWidths, storageKey, minWidth])

  return { widths, containerRef, tableStyle, getColStyle, getResizeHandleProps, resetWidths }
}
