'use client'

import { useEffect } from 'react'
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

type NoticeDetailProps = {
  notice: Notice
  onClose: () => void
  onRead?: (noticeId: string) => void
}

export const NoticeDetail = ({ notice, onClose, onRead }: NoticeDetailProps) => {
  const { t } = useI18n()

  const tNotices = (key: string): string => t(`notices.${key}` as Parameters<typeof t>[0])

  useEffect(() => {
    onRead?.(notice.id)
  }, [notice.id, onRead])

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-th-border bg-th-bg p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {notice.is_pinned && <Pin className="h-4 w-4 text-th-accent shrink-0" />}
              <Badge variant={CATEGORY_VARIANTS[notice.category]}>
                {tNotices(`categories.${notice.category}`)}
              </Badge>
            </div>
            <h2 className="text-lg font-semibold text-th-text">{notice.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 shrink-0 rounded-lg p-1 text-th-text-muted hover:bg-th-bg-hover hover:text-th-text-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 text-xs text-th-text-muted">
          <span>{notice.users?.name ?? tNotices('categories.system')}</span>
          <span>{new Date(notice.created_at).toLocaleString()}</span>
        </div>

        <div className="max-h-80 overflow-y-auto rounded-lg bg-th-bg-secondary p-4">
          <p className="whitespace-pre-wrap text-sm text-th-text leading-relaxed">
            {notice.content}
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-th-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </>
  )
}
