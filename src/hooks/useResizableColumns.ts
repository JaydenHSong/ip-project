'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'

type UseResizableColumnsOptions = {
  /** Storage key for persisting widths (localStorage) */
  storageKey: string
  /** Default widths in px for each column index */
  defaultWidths: number[]
  /** Minimum column width in px (global fallback) */
  minWidth?: number
  /** Per-column minimum widths in px (overrides minWidth) */
  minWidths?: number[]
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

const applyMinimumWidths = (widths: number[], minWidths: number[] | undefined, fallbackMinWidth: number): number[] =>
  widths.map((width, index) => Math.max(width, minWidths?.[index] ?? fallbackMinWidth))

export const useResizableColumns = ({
  storageKey,
  defaultWidths,
  minWidth = 40,
  minWidths,
}: UseResizableColumnsOptions): UseResizableColumnsReturn => {
  const getMinWidth = useCallback((index: number) => minWidths?.[index] ?? minWidth, [minWidths, minWidth])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [widths, setWidths] = useState<number[] | null>(null)
  const dragRef = useRef<{ index: number; startX: number; startWidth: number } | null>(null)

  // After hydration, restore saved widths or auto-fit once using the real container width.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = loadWidths(storageKey, defaultWidths)
      if (saved) {
        setWidths(applyMinimumWidths(saved, minWidths, minWidth))
        return
      }

      const el = containerRef.current
      if (!el) {
        setWidths(defaultWidths)
        return
      }

      const cw = el.clientWidth
      if (cw > 0) {
        const scaled = applyMinimumWidths(scaleToFit(defaultWidths, cw, minWidth), minWidths, minWidth)
        setWidths(scaled)
        return
      }

      setWidths(defaultWidths)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [storageKey, defaultWidths, minWidth, minWidths])

  const handleMouseDown = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const currentWidths = widths ?? defaultWidths
      dragRef.current = { index, startX: e.clientX, startWidth: currentWidths[index] }
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMouseMove = (event: MouseEvent) => {
        if (!dragRef.current) return

        const { index: activeIndex, startX, startWidth } = dragRef.current
        const delta = event.clientX - startX
        const newWidth = Math.max(getMinWidth(activeIndex), startWidth + delta)
        setWidths((prev) => {
          const next = [...(prev ?? defaultWidths)]
          next[activeIndex] = newWidth
          return next
        })
      }

      const onMouseUp = () => {
        if (!dragRef.current) return

        dragRef.current = null
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        setWidths((current) => {
          const next = current ?? defaultWidths
          saveWidths(storageKey, next)
          return next
        })
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [widths, defaultWidths, getMinWidth, storageKey],
  )

  const tableStyle = useMemo<React.CSSProperties>(
    () => widths ? { width: widths.reduce((sum, w) => sum + w, 0) } : {},
    [widths],
  )

  const getColStyle = useCallback(
    (index: number): React.CSSProperties => {
      if (!widths) return {}

      return {
        width: widths[index],
        minWidth: getMinWidth(index),
      }
    },
    [widths, getMinWidth],
  )

  const getResizeHandleProps = useCallback(
    (index: number) => ({
      onMouseDown: (e: React.MouseEvent) => handleMouseDown(index, e),
      onDoubleClick: () => {
        // Reset this column to fit-scaled default
        const el = containerRef.current
        const cw = el?.clientWidth ?? 0
        const scaled = applyMinimumWidths(cw > 0 ? scaleToFit(defaultWidths, cw, minWidth) : defaultWidths, minWidths, minWidth)
        setWidths((prev) => {
          const next = [...(prev ?? scaled)]
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
    [handleMouseDown, defaultWidths, storageKey, minWidth, minWidths],
  )

  const resetWidths = useCallback(() => {
    const el = containerRef.current
    const cw = el?.clientWidth ?? 0
    const scaled = applyMinimumWidths(cw > 0 ? scaleToFit(defaultWidths, cw, minWidth) : defaultWidths, minWidths, minWidth)
    setWidths(scaled)
    saveWidths(storageKey, scaled)
  }, [defaultWidths, storageKey, minWidth, minWidths])

  return { widths: widths ?? defaultWidths, containerRef, tableStyle, getColStyle, getResizeHandleProps, resetWidths }
}
