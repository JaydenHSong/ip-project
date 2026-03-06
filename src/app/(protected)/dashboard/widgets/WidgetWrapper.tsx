'use client'

import { GripVertical, EyeOff } from 'lucide-react'

type WidgetWrapperProps = {
  title: string
  widgetId: string
  onHide: (id: string) => void
  children: React.ReactNode
}

export const WidgetWrapper = ({ title, widgetId, onHide, children }: WidgetWrapperProps) => (
  <div className="flex h-full flex-col rounded-xl border border-th-border bg-surface-card shadow-sm">
    <div className="flex items-center justify-between border-b border-th-border bg-th-bg-secondary px-4 py-2.5 rounded-t-xl">
      <div className="drag-handle flex cursor-grab items-center gap-2 active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-th-text-muted" />
        <span className="text-sm font-semibold text-th-text">{title}</span>
      </div>
      <button
        onClick={() => onHide(widgetId)}
        className="rounded-lg p-1.5 text-th-text-muted transition-colors hover:bg-th-bg-hover hover:text-th-text-secondary"
        title="Hide widget"
      >
        <EyeOff className="h-3.5 w-3.5" />
      </button>
    </div>
    <div className="flex-1 overflow-auto p-4">
      {children}
    </div>
  </div>
)
