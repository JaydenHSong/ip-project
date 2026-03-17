'use client'

import { useState, useRef, useEffect } from 'react'
import { Columns3 } from 'lucide-react'
import type { ColumnDef } from '@/constants/table-columns'

type ColumnVisibilityToggleProps = {
  columns: ColumnDef[]
  hiddenIds: string[]
  onToggle: (id: string) => void
  onReset: () => void
}

export const ColumnVisibilityToggle = ({ columns, hiddenIds, onToggle, onReset }: ColumnVisibilityToggleProps) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggleable = columns.filter((col) => !col.locked)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-th-border px-3 py-2 text-sm text-th-text-secondary transition-colors hover:bg-th-bg-hover"
      >
        <Columns3 className="h-4 w-4" />
        Columns
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[180px] rounded-lg border border-th-border bg-surface-card shadow-lg">
          <div className="max-h-[320px] overflow-y-auto p-1.5">
            {toggleable.map((col) => (
              <label
                key={col.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-th-text hover:bg-th-bg-hover"
              >
                <input
                  type="checkbox"
                  className="accent-th-accent"
                  checked={!hiddenIds.includes(col.id)}
                  onChange={() => onToggle(col.id)}
                />
                {col.labelKey.includes('.') ? col.id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : col.labelKey}
              </label>
            ))}
          </div>
          <div className="border-t border-th-border p-1.5">
            <button
              type="button"
              onClick={() => { onReset(); setOpen(false) }}
              className="w-full rounded-md px-2.5 py-1.5 text-left text-sm text-th-text-muted hover:bg-th-bg-hover"
            >
              Reset to Default
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
