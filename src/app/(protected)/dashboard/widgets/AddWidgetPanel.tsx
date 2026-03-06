'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import type { WidgetConfig } from './widget-config'

type AddWidgetPanelProps = {
  hiddenWidgets: WidgetConfig[]
  onAdd: (widgetId: string) => void
}

export const AddWidgetPanel = ({ hiddenWidgets, onAdd }: AddWidgetPanelProps) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (hiddenWidgets.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-xl border border-dashed border-th-border px-3 py-1.5 text-xs font-medium text-th-text-muted transition-colors hover:border-th-accent hover:text-th-accent-text"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Widget
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-th-border bg-surface-card p-2 shadow-lg">
          {hiddenWidgets.map((widget) => (
            <button
              key={widget.id}
              onClick={() => {
                onAdd(widget.id)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-th-text transition-colors hover:bg-th-bg-hover"
            >
              <Plus className="h-3.5 w-3.5 text-th-text-muted" />
              {widget.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
