'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Badge } from '@/components/ui/Badge'
import type { ChangelogEntry, ChangelogCategory } from '@/types/changelog'

const STORAGE_KEY = 'sentinel_last_notice_seen'

const CATEGORY_VARIANT = {
  new: 'info' as const,
  fix: 'danger' as const,
  policy: 'warning' as const,
  ai: 'violet' as const,
} as const

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const NoticePopup = () => {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<ChangelogEntry | null>(null)
  const [dontShow, setDontShow] = useState(false)

  useEffect(() => {
    const fetchNotice = async (): Promise<void> => {
      try {
        const res = await fetch('/api/changelog')
        if (!res.ok) return

        const json = (await res.json()) as { data: ChangelogEntry[] }
        const entries = json.data
        if (!entries || entries.length === 0) return

        const latest = entries[0]
        const lastSeen = localStorage.getItem(STORAGE_KEY)

        if (lastSeen && new Date(lastSeen) >= new Date(latest.created_at)) {
          return
        }

        setNotice(latest)
        setOpen(true)
      } catch {
        // silently fail
      }
    }

    fetchNotice()
  }, [])

  const handleClose = (): void => {
    if (notice) {
      localStorage.setItem(STORAGE_KEY, notice.created_at)
    }
    if (dontShow) {
      localStorage.setItem(STORAGE_KEY, new Date(2099, 0, 1).toISOString())
    }
    setOpen(false)
  }

  if (!open || !notice) return null

  const getCategoryLabel = (category: ChangelogCategory): string => {
    const key = `changelog.categories.${category}` as const
    return t(key)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={handleClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-th-border bg-th-bg p-6 shadow-2xl">
        <div className="flex items-center gap-2">
          <Badge variant={CATEGORY_VARIANT[notice.category]}>
            {getCategoryLabel(notice.category)}
          </Badge>
          <span className="text-xs text-th-text-muted">
            {formatDate(notice.created_at)}
          </span>
        </div>

        <h2 className="mt-3 text-lg font-bold text-th-text">{notice.title}</h2>

        {notice.description && (
          <p className="mt-2 text-sm text-th-text-secondary whitespace-pre-line">
            {notice.description}
          </p>
        )}

        <label className="mt-4 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="h-4 w-4 rounded border-th-border text-th-accent focus:ring-th-accent"
          />
          <span className="text-xs text-th-text-muted">
            {t('welcome.dontShowAgain' as Parameters<typeof t>[0])}
          </span>
        </label>

        <button
          type="button"
          onClick={handleClose}
          className="mt-4 w-full rounded-xl bg-th-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-colors"
        >
          {t('welcome.ok' as Parameters<typeof t>[0])}
        </button>
      </div>
    </>
  )
}
