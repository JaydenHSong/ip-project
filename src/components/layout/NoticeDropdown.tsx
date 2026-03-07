'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Megaphone, ExternalLink } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import type { Notice, NoticeCategory } from '@/types/notices'

const CATEGORY_COLORS: Record<NoticeCategory, string> = {
  update: 'bg-emerald-500',
  policy: 'bg-blue-500',
  notice: 'bg-amber-500',
  system: 'bg-gray-400',
}

type NoticeDropdownProps = {
  demoNotices?: Notice[]
}

export const NoticeDropdown = ({ demoNotices }: NoticeDropdownProps) => {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [notices, setNotices] = useState<Notice[]>(demoNotices ?? [])
  const ref = useRef<HTMLDivElement>(null)

  const [now] = useState(() => Date.now())
  const tNotices = (key: string): string => t(`notices.${key}` as Parameters<typeof t>[0])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open && !demoNotices) {
      fetch('/api/notices?limit=5')
        .then((res) => res.json())
        .then((data) => {
          if (data.notices) setNotices(data.notices)
        })
        .catch(() => {})
    }
  }, [open, demoNotices])

  const formatTimeAgo = (dateStr: string): string => {
    const diff = now - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d`
    const weeks = Math.floor(days / 7)
    return `${weeks}w`
  }

  return (
    <div ref={ref} className="static">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-th-text-tertiary hover:bg-th-bg-hover hover:text-th-text-secondary"
        title={tNotices('title')}
      >
        <Megaphone className="h-4 w-4" />
        <span className="hidden text-xs font-medium sm:block">{t('nav.notices')}</span>
      </button>

      {open && <NoticeDropdownPanel notices={notices} tNotices={tNotices} formatTimeAgo={formatTimeAgo} onClose={() => setOpen(false)} />}
    </div>
  )
}

type PanelProps = {
  notices: Notice[]
  tNotices: (key: string) => string
  formatTimeAgo: (dateStr: string) => string
  onClose: () => void
}

const NoticeDropdownPanel = ({ notices, tNotices, formatTimeAgo, onClose }: PanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollDown, setCanScrollDown] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    return () => el.removeEventListener('scroll', checkScroll)
  }, [checkScroll, notices])

  return (
    <div className="fixed right-4 top-14 z-50 mt-1 w-80 rounded-xl border border-th-border bg-surface-card shadow-xl md:top-16">
      <div className="flex items-center justify-between border-b border-th-border px-4 py-3">
        <h3 className="text-sm font-semibold text-th-text">{tNotices('title')}</h3>
        <Link
          href="/notices"
          onClick={onClose}
          className="flex items-center gap-1 text-xs text-th-accent-text hover:underline"
        >
          {tNotices('viewAll')}
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <div className="relative">
        <div ref={scrollRef} className="scrollbar-hide max-h-80 overflow-y-auto">
          {notices.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-th-text-muted">
              {tNotices('noNotices')}
            </div>
          ) : (
            notices.slice(0, 5).map((notice) => (
              <Link
                key={notice.id}
                href="/notices"
                onClick={onClose}
                className="block border-b border-th-border px-4 py-3 last:border-b-0 hover:bg-th-bg-hover/50"
              >
                <div className="flex items-start gap-2.5">
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${CATEGORY_COLORS[notice.category]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-th-text">{notice.title}</p>
                    <p className="mt-0.5 text-xs text-th-text-muted">
                      {notice.users?.name ?? tNotices('categories.system')}
                      <span className="ml-2">{formatTimeAgo(notice.created_at)}</span>
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-xl transition-opacity duration-200 ${canScrollDown ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'linear-gradient(to top, var(--surface-card), transparent)' }}
        />
      </div>
    </div>
  )
}
