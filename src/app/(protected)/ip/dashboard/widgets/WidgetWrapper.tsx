'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { WidgetSize } from './widget-config'

type WidgetWrapperProps = {
  title: string
  widgetId: string
  size?: WidgetSize
  onHide: (id: string) => void
  children: React.ReactNode
}

export const WidgetWrapper = ({ title, widgetId, size, onHide, children }: WidgetWrapperProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollDown, setCanScrollDown] = useState(false)
  const hasFixedHeight = size !== 'full'

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
  }, [])

  useEffect(() => {
    if (!hasFixedHeight) return
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      ro.disconnect()
    }
  }, [hasFixedHeight, checkScroll])

  return (
    <div className={cn(
      'group flex flex-col rounded-xl border border-th-border bg-surface-card shadow-sm',
      hasFixedHeight && 'h-[320px]',
    )}>
      <div className="flex shrink-0 items-center justify-between border-b border-th-border px-4 py-2.5 rounded-t-xl">
        <span className="text-sm font-semibold text-th-text">{title}</span>
        <button
          onClick={() => onHide(widgetId)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-th-text-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-th-bg-hover hover:text-th-text-secondary"
          title="Hide widget"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className={cn('h-full p-4', hasFixedHeight && 'scrollbar-hide overflow-y-auto')}
        >
          {children}
        </div>
        {hasFixedHeight && (
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-xl transition-opacity duration-200',
              canScrollDown ? 'opacity-100' : 'opacity-0',
            )}
            style={{ background: 'linear-gradient(to top, var(--surface-card), transparent)' }}
          />
        )}
      </div>
    </div>
  )
}
