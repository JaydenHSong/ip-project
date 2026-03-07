'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils/cn'

type ScrollTabsProps = {
  children: React.ReactNode
  className?: string
  /** Use pill-style container (bordered bg). Default: true */
  pill?: boolean
}

export const ScrollTabs = ({ children, className, pill = true }: ScrollTabsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }, [])

  useEffect(() => {
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
  }, [checkScroll])

  return (
    <div className="relative">
      {/* Left fade */}
      <div
        className={cn(
          'pointer-events-none absolute left-0 top-0 z-10 h-full w-8 rounded-l-xl transition-opacity duration-200',
          canScrollLeft ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          background: 'linear-gradient(to right, var(--bg-secondary), transparent)',
        }}
      />

      {/* Scrollable area */}
      <div
        ref={scrollRef}
        className={cn(
          'scrollbar-hide flex gap-1 overflow-x-auto scroll-smooth snap-x snap-mandatory',
          pill && 'rounded-xl border border-th-border bg-th-bg-secondary p-1',
          className,
        )}
      >
        {children}
      </div>

      {/* Right fade */}
      <div
        className={cn(
          'pointer-events-none absolute right-0 top-0 z-10 h-full w-8 rounded-r-xl transition-opacity duration-200',
          canScrollRight ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          background: 'linear-gradient(to left, var(--bg-secondary), transparent)',
        }}
      />
    </div>
  )
}

type ScrollTabItemProps = {
  children: React.ReactNode
  active?: boolean
  className?: string
} & React.ComponentPropsWithoutRef<'div'>

export const ScrollTabItem = ({ children, active, className, ...props }: ScrollTabItemProps) => (
  <div
    className={cn(
      'snap-start whitespace-nowrap rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors cursor-pointer select-none',
      active
        ? 'bg-surface-card text-th-text shadow-sm'
        : 'text-th-text-muted hover:text-th-text-secondary',
      className,
    )}
    {...props}
  >
    {children}
  </div>
)
