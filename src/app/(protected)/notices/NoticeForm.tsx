'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { NOTICE_CATEGORIES } from '@/types/notices'
import type { Notice } from '@/types/notices'

type NoticeFormProps = {
  notice: Notice | null
  onClose: () => void
  onSuccess: () => void
}

export const NoticeForm = ({ notice, onClose, onSuccess }: NoticeFormProps) => {
  const { t } = useI18n()
  const isEdit = !!notice

  const [category, setCategory] = useState(notice?.category ?? 'notice')
  const [title, setTitle] = useState(notice?.title ?? '')
  const [content, setContent] = useState(notice?.content ?? '')
  const [isPinned, setIsPinned] = useState(notice?.is_pinned ?? false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const tNotices = (key: string): string => t(`notices.${key}` as Parameters<typeof t>[0])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = isEdit ? `/api/notices/${notice.id}` : '/api/notices'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, title, content, is_pinned: isPinned }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.message ?? 'Failed to save notice.')
        return
      }

      onSuccess()
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-th-border bg-th-bg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-th-text">
            {isEdit ? tNotices('editNotice') : tNotices('newNotice')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-th-text-muted hover:bg-th-bg-hover hover:text-th-text-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div>
            <label className="mb-1 block text-sm font-medium text-th-text-secondary">
              {tNotices('category')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="w-full rounded-xl border border-th-border bg-th-bg-secondary px-3 py-2.5 text-sm text-th-text focus:border-th-accent focus:outline-none"
            >
              {NOTICE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {tNotices(`categories.${cat}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-th-text-secondary">
              {t('reports.title')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              className="w-full rounded-xl border border-th-border bg-th-bg-secondary px-3 py-2.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
            />
          </div>

          {/* Content */}
          <div>
            <label className="mb-1 block text-sm font-medium text-th-text-secondary">
              {tNotices('content')}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={5000}
              required
              rows={5}
              className="w-full resize-none rounded-xl border border-th-border bg-th-bg-secondary px-3 py-2.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
            />
          </div>

          {/* Pin */}
          <label className="flex items-center gap-2 text-sm text-th-text-secondary">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded border-th-border"
            />
            {tNotices('pinNotice')}
          </label>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-th-border px-4 py-2.5 text-sm font-medium text-th-text-secondary hover:bg-th-bg-hover transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-th-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {loading ? t('common.loading') : isEdit ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
