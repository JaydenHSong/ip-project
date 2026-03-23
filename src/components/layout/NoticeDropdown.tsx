'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Megaphone, ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import type { Notice, NoticeCategory } from '@/types/notices'

const CATEGORY_STYLES: Record<NoticeCategory, { dot: string; bg: string; text: string; label: string }> = {
  update: { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', label: 'Update' },
  policy: { dot: 'bg-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', label: 'Policy' },
  notice: { dot: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', label: 'Notice' },
  system: { dot: 'bg-gray-400', bg: 'bg-gray-400/10', text: 'text-gray-600 dark:text-gray-400', label: 'System' },
}

export const NoticeDropdown = () => {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [notices, setNotices] = useState<Notice[]>([])
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const [now] = useState(() => Date.now())
  const tNotices = (key: string): string => t(`notices.${key}` as Parameters<typeof t>[0])

  // Fetch unread count on mount
  useEffect(() => {
    fetch('/api/notices/unread')
      .then((res) => res.json())
      .then((data) => {
        if (data.count) setUnreadCount(data.count)
      })
      .catch(() => {})
  }, [])

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
    if (open) {
      fetch('/api/notices?limit=5')
        .then((res) => res.json())
        .then((data) => {
          if (data.notices) setNotices(data.notices)
        })
        .catch(() => {})
    }
  }, [open])

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

  const markAsRead = useCallback(async (noticeId: string) => {
    try {
      await fetch(`/api/notices/${noticeId}/read`, { method: 'POST' })
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // silent
    }
  }, [])

  const handleNoticeClick = (notice: Notice) => {
    setOpen(false)
    setSelectedNotice(notice)
    markAsRead(notice.id)
  }

  return (
    <>
      <div ref={ref} className="static">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="relative flex h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-th-text-tertiary hover:bg-th-bg-hover hover:text-th-text-secondary"
          title={tNotices('title')}
        >
          <Megaphone className="h-4 w-4" />
          <span className="hidden text-xs font-medium sm:block">{t('nav.notices')}</span>
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <NoticeDropdownPanel
            notices={notices}
            tNotices={tNotices}
            formatTimeAgo={formatTimeAgo}
            onClose={() => setOpen(false)}
            onSelect={handleNoticeClick}
          />
        )}
      </div>

      {/* Notice Detail Modal */}
      {selectedNotice && (() => {
        const currentIdx = notices.findIndex((n) => n.id === selectedNotice.id)
        const hasPrev = currentIdx > 0
        const hasNext = currentIdx < notices.length - 1
        const style = CATEGORY_STYLES[selectedNotice.category]

        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setSelectedNotice(null)}
          >
            {/* Prev Arrow */}
            {hasPrev && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); const prev = notices[currentIdx - 1]; setSelectedNotice(prev); markAsRead(prev.id) }}
                className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-th-border bg-surface-card/90 text-th-text-muted shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-surface-card hover:text-th-text md:left-8"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            <div
              className="relative mx-14 w-full max-w-lg overflow-hidden rounded-2xl border border-th-border bg-surface-card shadow-2xl animate-slide-up md:mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Accent top bar */}
              <div className={`h-1 w-full ${style.dot}`} />

              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-5 pb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style.bg} ${style.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {style.label}
                    </span>
                    <span className="text-xs text-th-text-muted">
                      {new Date(selectedNotice.created_at).toLocaleDateString('en-CA')}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-lg font-bold leading-snug text-th-text">{selectedNotice.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNotice(null)}
                  className="ml-3 -mt-1 shrink-0 rounded-full p-1.5 text-th-text-muted transition-colors hover:bg-th-bg-hover hover:text-th-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="max-h-[55vh] overflow-y-auto border-t border-th-border/50 px-6 py-5">
                <div className="text-sm leading-7 text-th-text-secondary whitespace-pre-wrap">
                  {selectedNotice.content}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-th-border px-6 py-3">
                <p className="text-xs text-th-text-muted">
                  {selectedNotice.users?.name ? `Posted by ${selectedNotice.users.name}` : ''}
                </p>
                {notices.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    {notices.map((_, i) => (
                      <button
                        key={notices[i].id}
                        type="button"
                        onClick={() => { setSelectedNotice(notices[i]); markAsRead(notices[i].id) }}
                        className={`h-1.5 rounded-full transition-all ${i === currentIdx ? `w-4 ${style.dot}` : 'w-1.5 bg-th-text-muted/30 hover:bg-th-text-muted/50'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Next Arrow */}
            {hasNext && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); const next = notices[currentIdx + 1]; setSelectedNotice(next); markAsRead(next.id) }}
                className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-th-border bg-surface-card/90 text-th-text-muted shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-surface-card hover:text-th-text md:right-8"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        )
      })()}
    </>
  )
}

type PanelProps = {
  notices: Notice[]
  tNotices: (key: string) => string
  formatTimeAgo: (dateStr: string) => string
  onClose: () => void
  onSelect: (notice: Notice) => void
}

const NoticeDropdownPanel = ({ notices, tNotices, formatTimeAgo, onClose, onSelect }: PanelProps) => {
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
          href="/ip/notices"
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
              <button
                key={notice.id}
                type="button"
                onClick={() => onSelect(notice)}
                className="block w-full border-b border-th-border px-4 py-3 text-left last:border-b-0 hover:bg-th-bg-hover/50"
              >
                <div className="flex items-start gap-2.5">
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${CATEGORY_STYLES[notice.category].dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-th-text">{notice.title}</p>
                    <p className="mt-0.5 text-xs text-th-text-muted">
                      {notice.users?.name ?? tNotices('categories.system')}
                      <span className="ml-2">{formatTimeAgo(notice.created_at)}</span>
                    </p>
                  </div>
                </div>
              </button>
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
