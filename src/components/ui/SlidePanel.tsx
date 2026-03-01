'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type SlidePanelProps = {
  open: boolean
  onClose: () => void
  title?: string
  status?: ReactNode
  children: ReactNode
  className?: string
}

export const SlidePanel = ({ open, onClose, title, status, children, className }: SlidePanelProps) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEsc)
    }
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col border-l border-th-border bg-surface-panel shadow-lg transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : 'translate-x-full',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-th-border px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-th-text-muted hover:bg-th-bg-hover hover:text-th-text-secondary"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
          {title && (
            <h2 className="text-lg font-semibold text-th-text">{title}</h2>
          )}
        </div>
        {status}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
