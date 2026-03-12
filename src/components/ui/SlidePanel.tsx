'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type SlidePanelSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const SIZE_CLASSES: Record<SlidePanelSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-[52vw]',
  '2xl': 'max-w-[59vw]',
}

type SlidePanelProps = {
  open: boolean
  onClose: () => void
  title?: string
  status?: ReactNode
  children: ReactNode
  size?: SlidePanelSize
  className?: string
}

export const SlidePanel = ({ open, onClose, title, status, children, size = 'lg', className }: SlidePanelProps) => {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      const timer = setTimeout(() => setMounted(false), 500)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (mounted) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [mounted, onClose])

  if (!mounted) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-500',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        data-testid="slide-panel"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-th-border bg-th-bg shadow-lg transition-transform duration-500 ease-in-out',
          SIZE_CLASSES[size],
          visible ? 'translate-x-0' : 'translate-x-full',
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
    </>
  )
}
