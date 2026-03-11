'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Pin } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { Badge } from '@/components/ui/Badge'
import type { Notice, NoticeCategory } from '@/types/notices'

const CATEGORY_VARIANTS: Record<NoticeCategory, 'success' | 'info' | 'warning' | 'default'> = {
  update: 'success',
  policy: 'info',
  notice: 'warning',
  system: 'default',
}

const CATEGORY_ACCENT: Record<NoticeCategory, string> = {
  update: 'bg-emerald-500',
  policy: 'bg-blue-500',
  notice: 'bg-amber-500',
  system: 'bg-gray-400',
}

const SESSION_KEY = 'sentinel-unread-popup-dismissed'

export const UnreadNoticePopup = () => {
  const { t } = useI18n()
  const [notices, setNotices] = useState<Notice[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(false)

  const tNotices = (key: string): string => t(`notices.${key}` as Parameters<typeof t>[0])

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return

    fetch('/api/notices/unread')
      .then((res) => res.json())
      .then((data) => {
        if (data.data && data.data.length > 0) {
          setNotices(data.data)
          setVisible(true)
        }
      })
      .catch(() => {})
  }, [])

  const markAsRead = useCallback(async (noticeId: string) => {
    try {
      await fetch(`/api/notices/${noticeId}/read`, { method: 'POST' })
    } catch {
      // silent
    }
  }, [])

  const handleConfirm = useCallback(async () => {
    const current = notices[currentIndex]
    if (current) {
      await markAsRead(current.id)
    }

    if (currentIndex < notices.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      setVisible(false)
    }
  }, [notices, currentIndex, markAsRead])

  const handleLater = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, '1')
    setVisible(false)
  }, [])

  if (!visible || notices.length === 0) return null

  const notice = notices[currentIndex]
  const accent = CATEGORY_ACCENT[notice.category]

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleLater}
    >
      <div
        className="relative mx-4 w-full max-w-lg overflow-hidden rounded-2xl border border-th-border bg-surface-card shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent top bar */}
        <div className={`h-1 w-full ${accent}`} />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-th-text">
                {tNotices('unreadPopup.title')}
              </span>
              {notices.length > 1 && (
                <span className="rounded-full bg-th-accent/10 px-2 py-0.5 text-xs font-medium text-th-accent">
                  {t('notices.unreadPopup.counter', { current: String(currentIndex + 1), total: String(notices.length) })}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLater}
            className="ml-3 -mt-1 shrink-0 rounded-full p-1.5 text-th-text-muted transition-colors hover:bg-th-bg-hover hover:text-th-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Notice content */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 mb-2">
            {notice.is_pinned && <Pin className="h-3.5 w-3.5 text-th-accent shrink-0" />}
            <Badge variant={CATEGORY_VARIANTS[notice.category]}>
              {tNotices(`categories.${notice.category}`)}
            </Badge>
            <span className="text-xs text-th-text-muted">
              {new Date(notice.created_at).toLocaleDateString()}
            </span>
          </div>
          <h3 className="text-lg font-bold leading-snug text-th-text">{notice.title}</h3>
        </div>

        {/* Content */}
        <div className="max-h-[40vh] overflow-y-auto border-t border-th-border/50 px-6 py-5">
          <div className="text-sm leading-7 text-th-text-secondary whitespace-pre-wrap">
            {notice.content}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-th-border px-6 py-3">
          <button
            type="button"
            onClick={handleLater}
            className="rounded-xl border border-th-border px-4 py-2 text-sm font-medium text-th-text-secondary hover:bg-th-bg-hover transition-colors"
          >
            {tNotices('unreadPopup.later')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl bg-th-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors"
          >
            {tNotices('unreadPopup.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
