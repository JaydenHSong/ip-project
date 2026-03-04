'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Badge } from '@/components/ui/Badge'
import { X } from 'lucide-react'
import type { ChangelogEntry, ChangelogCategory } from '@/types/changelog'

const CATEGORY_VARIANT = {
  new: 'info' as const,
  fix: 'danger' as const,
  policy: 'warning' as const,
  ai: 'violet' as const,
} as const

export const NoticeBanner = () => {
  const { t } = useI18n()
  const [notice, setNotice] = useState<ChangelogEntry | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const fetchNotice = async (): Promise<void> => {
      try {
        const res = await fetch('/api/changelog')
        if (!res.ok) return

        const json = (await res.json()) as { data: ChangelogEntry[] }
        const entries = json.data
        if (!entries || entries.length === 0) return

        const latest = entries[0]
        const dismissKey = `sentinel_banner_dismissed_${latest.id}`
        const dismissed = localStorage.getItem(dismissKey) === 'true'

        if (dismissed) return

        setNotice(latest)
        setVisible(true)
      } catch {
        // silently fail
      }
    }

    fetchNotice()
  }, [])

  const handleDismiss = (): void => {
    if (notice) {
      localStorage.setItem(`sentinel_banner_dismissed_${notice.id}`, 'true')
    }
    setVisible(false)
  }

  if (!visible || !notice) return null

  const getCategoryLabel = (category: ChangelogCategory): string => {
    const key = `changelog.categories.${category}` as const
    return t(key)
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-th-border bg-th-bg-secondary px-4 py-2.5">
      <Badge variant={CATEGORY_VARIANT[notice.category]}>
        {getCategoryLabel(notice.category)}
      </Badge>
      <p className="min-w-0 flex-1 truncate text-sm text-th-text">
        {notice.title}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded-lg p-1 text-th-text-muted hover:bg-th-bg-hover hover:text-th-text transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
