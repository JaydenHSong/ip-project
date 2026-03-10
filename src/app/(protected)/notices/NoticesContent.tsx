'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pin, MoreHorizontal, Pencil, Trash2, Plus } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { ScrollTabs } from '@/components/ui/ScrollTabs'
import { NoticeForm } from './NoticeForm'
import { NoticeDetail } from './NoticeDetail'
import type { Notice, NoticeCategory } from '@/types/notices'
import type { Role } from '@/types/users'

const CATEGORY_VARIANTS: Record<NoticeCategory, 'success' | 'info' | 'warning' | 'default'> = {
  update: 'success',
  policy: 'info',
  notice: 'warning',
  system: 'default',
}

type NoticesContentProps = {
  notices: Notice[]
  totalPages: number
  page: number
  categoryFilter: string
  userRole: Role
}

export const NoticesContent = ({ notices, totalPages, page, categoryFilter, userRole }: NoticesContentProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editNotice, setEditNotice] = useState<Notice | null>(null)
  const [detailNotice, setDetailNotice] = useState<Notice | null>(null)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const canCreate = userRole === 'owner' || userRole === 'admin' || userRole === 'editor'
  const canManage = userRole === 'owner' || userRole === 'admin'

  const [now] = useState(() => Date.now())
  const tNotices = (key: string): string => t(`notices.${key}` as Parameters<typeof t>[0])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/notices/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteConfirmId(null)
        router.refresh()
      }
    } catch {
      // silent
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditNotice(null)
    router.refresh()
  }

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
    <div className="flex flex-col gap-4 md:h-full md:gap-6">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <h1 className="truncate text-xl font-bold text-th-text md:text-2xl">{tNotices('title')}</h1>
        {canCreate && (
          <button
            type="button"
            onClick={() => { setEditNotice(null); setShowForm(true) }}
            className="flex items-center gap-1.5 rounded-xl bg-th-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors sm:px-4"
          >
            <Plus className="h-4 w-4" />
            {tNotices('newNotice')}
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <ScrollTabs>
        <Link
          href="/notices"
          className={`snap-start whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${!categoryFilter ? 'bg-surface-card text-th-text shadow-sm' : 'text-th-text-muted hover:text-th-text-secondary'}`}
        >
          {t('common.all')}
        </Link>
        {(['update', 'policy', 'notice', 'system'] as const).map((cat) => (
          <Link
            key={cat}
            href={`/notices?category=${cat}`}
            className={`snap-start whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${categoryFilter === cat ? 'bg-surface-card text-th-text shadow-sm' : 'text-th-text-muted hover:text-th-text-secondary'}`}
          >
            {tNotices(`categories.${cat}`)}
          </Link>
        ))}
      </ScrollTabs>

      {/* Mobile: Card List */}
      <div className="space-y-3 md:hidden">
        {notices.length === 0 ? (
          <div className="rounded-xl border border-th-border bg-surface-card p-8 text-center text-th-text-muted">
            {tNotices('noNotices')}
          </div>
        ) : (
          notices.map((notice) => (
            <div
              key={notice.id}
              className="cursor-pointer rounded-xl border border-th-border bg-surface-card p-4 transition-colors hover:bg-th-bg-hover"
              onClick={() => setDetailNotice(notice)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {notice.is_pinned && <Pin className="h-3.5 w-3.5 text-th-accent" />}
                  <Badge variant={CATEGORY_VARIANTS[notice.category]}>
                    {tNotices(`categories.${notice.category}`)}
                  </Badge>
                </div>
                <span className="text-xs text-th-text-muted">{formatTimeAgo(notice.created_at)}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-th-text">{notice.title}</p>
              <p className="mt-1 text-xs text-th-text-secondary">
                {notice.users?.name ?? tNotices('categories.system')}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Desktop: Table — pocket scroll */}
      <Card className="hidden min-h-0 flex-1 flex-col overflow-hidden md:flex">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <table className="w-full shrink-0 text-left text-sm">
            <thead>
              <tr className="border-b border-th-border bg-th-bg-tertiary">
                <th className="w-8 px-4 py-3" />
                <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('reports.title')}</th>
                <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{tNotices('category')}</th>
                <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{tNotices('createdBy')}</th>
                <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('common.date')}</th>
                {canManage && (
                  <th className="w-12 px-4 py-3" />
                )}
              </tr>
            </thead>
          </table>
          <div className="min-h-0 flex-1 overflow-y-auto shadow-[inset_0_6px_8px_-4px_rgba(0,0,0,0.15)]">
            <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-th-border">
              {notices.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-4 py-10 text-center text-sm text-th-text-muted">
                    {tNotices('noNotices')}
                  </td>
                </tr>
              ) : (
                notices.map((notice) => (
                  <tr
                    key={notice.id}
                    className="cursor-pointer bg-surface-card transition-colors hover:bg-th-bg-hover"
                    onClick={() => setDetailNotice(notice)}
                  >
                    <td className="px-4 py-3.5 text-center">
                      {notice.is_pinned && <Pin className="inline-block h-3.5 w-3.5 text-th-accent" />}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 font-medium text-th-text">
                      {notice.title}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={CATEGORY_VARIANTS[notice.category]}>
                        {tNotices(`categories.${notice.category}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-th-text-secondary">
                      {notice.users?.name ?? tNotices('categories.system')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-th-text-muted">
                      {formatTimeAgo(notice.created_at)}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3.5">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActionMenuId(actionMenuId === notice.id ? null : notice.id)
                            }}
                            className="rounded-lg p-1 text-th-text-muted hover:bg-th-bg-hover hover:text-th-text-secondary"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {actionMenuId === notice.id && (
                            <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-th-border bg-surface-card py-1 shadow-lg">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActionMenuId(null)
                                  setEditNotice(notice)
                                  setShowForm(true)
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-th-text-secondary hover:bg-th-bg-hover"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                {t('common.edit')}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActionMenuId(null)
                                  setDeleteConfirmId(notice.id)
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-th-bg-hover"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {t('common.delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/notices?page=${p}${categoryFilter ? `&category=${categoryFilter}` : ''}`}
              className={`rounded-md px-3 py-1.5 text-sm ${p === page ? 'bg-th-accent text-white' : 'text-th-text-secondary hover:bg-th-bg-hover'}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <NoticeForm
          notice={editNotice}
          onClose={() => { setShowForm(false); setEditNotice(null) }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Detail Modal */}
      {detailNotice && (
        <NoticeDetail
          notice={detailNotice}
          onClose={() => setDetailNotice(null)}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setDeleteConfirmId(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-xl border border-th-border bg-th-bg p-6 shadow-2xl">
            <p className="text-center text-sm font-medium text-th-text">
              {tNotices('confirmDelete')}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-xl border border-th-border px-4 py-2.5 text-sm font-medium text-th-text-secondary hover:bg-th-bg-hover transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 rounded-xl bg-st-danger-bg px-4 py-2.5 text-sm font-medium text-st-danger-text hover:opacity-90 transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
