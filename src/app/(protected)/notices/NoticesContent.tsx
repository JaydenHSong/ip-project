'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { Pin, MoreHorizontal, Pencil, Trash2, Plus, Search, ArrowUpDown, Calendar } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { ScrollTabs } from '@/components/ui/ScrollTabs'
import { NoticeForm } from './NoticeForm'
import { NoticeDetail } from './NoticeDetail'
import type { Notice, NoticeCategory } from '@/types/notices'
import type { Role } from '@/types/users'
import { useResizableColumns } from '@/hooks/useResizableColumns'

const CATEGORY_VARIANTS: Record<NoticeCategory, 'success' | 'info' | 'warning' | 'default'> = {
  update: 'success',
  policy: 'info',
  notice: 'warning',
  system: 'default',
}

type NoticesContentProps = {
  notices: Notice[]
  totalPages: number
  totalCount: number
  page: number
  categoryFilter: string
  userRole: Role
  readNoticeIds: string[]
  searchQuery: string
  sortOrder: string
  dateFrom: string
  dateTo: string
}

const buildUrl = (params: Record<string, string>): string => {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v)
  }
  const qs = sp.toString()
  return `/notices${qs ? `?${qs}` : ''}`
}

export const NoticesContent = ({
  notices,
  totalPages,
  totalCount,
  page,
  categoryFilter,
  userRole,
  readNoticeIds,
  searchQuery,
  sortOrder,
  dateFrom,
  dateTo,
}: NoticesContentProps) => {
  const { t } = useI18n()
  const router = useRouter()

  // Infinite scroll
  const infiniteFilterParams = useMemo(() => {
    const p: Record<string, string> = {}
    if (categoryFilter) p.category = categoryFilter
    if (searchQuery) p.search = searchQuery
    if (sortOrder && sortOrder !== 'desc') p.sort = sortOrder
    if (dateFrom) p.from = dateFrom
    if (dateTo) p.to = dateTo
    return p
  }, [categoryFilter, searchQuery, sortOrder, dateFrom, dateTo])

  const { data: infiniteData, isLoading: isLoadingMore, hasMore, sentinelRef } = useInfiniteScroll<Notice>({
    initialData: notices,
    totalCount,
    pageSize: 20,
    fetchUrl: '/api/notices/list',
    filterParams: infiniteFilterParams,
  })

  const [showForm, setShowForm] = useState(false)
  const [editNotice, setEditNotice] = useState<Notice | null>(null)
  const [detailNotice, setDetailNotice] = useState<Notice | null>(null)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set(readNoticeIds))
  const [searchInput, setSearchInput] = useState(searchQuery)
  const [showDateFilter, setShowDateFilter] = useState(false)

  const canCreate = userRole === 'owner' || userRole === 'admin' || userRole === 'editor'
  const canManage = userRole === 'owner' || userRole === 'admin' || userRole === 'editor'

  // pin/unread(48) + title(auto=300) + category(100) + author(120) + date(80) + actions(48)
  const defaultNoticeColWidths = useMemo(() => [48, 600, 130, 150, 100, 48], [])
  const minNoticeColWidths = useMemo(() => [40, 200, 80, 100, 80, 40], [])
  const { containerRef: noticeContainerRef, tableStyle: noticeTableStyle, getColStyle: getNoticeColStyle, getResizeHandleProps: getNoticeResizeProps } = useResizableColumns({
    storageKey: 'notices',
    defaultWidths: defaultNoticeColWidths,
    minWidths: minNoticeColWidths,
  })

  const [now] = useState(() => Date.now())
  const tNotices = (key: string): string => t(`notices.${key}` as Parameters<typeof t>[0])

  const isRead = (id: string): boolean => localReadIds.has(id)

  const baseParams = (): Record<string, string> => {
    const p: Record<string, string> = {}
    if (categoryFilter) p.category = categoryFilter
    if (searchQuery) p.search = searchQuery
    if (sortOrder && sortOrder !== 'desc') p.sort = sortOrder
    if (dateFrom) p.from = dateFrom
    if (dateTo) p.to = dateTo
    return p
  }

  const handleSearch = () => {
    const p = baseParams()
    if (searchInput.trim()) p.search = searchInput.trim()
    else delete p.search
    delete p.page
    router.push(buildUrl(p))
  }

  const handleSort = () => {
    const p = baseParams()
    p.sort = sortOrder === 'asc' ? 'desc' : 'asc'
    delete p.page
    router.push(buildUrl(p))
  }

  const handleDatePreset = (preset: string) => {
    const p = baseParams()
    delete p.from
    delete p.to
    const today = new Date()
    if (preset === 'today') {
      p.from = today.toISOString().split('T')[0]
      p.to = p.from
    } else if (preset === 'week') {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      p.from = weekAgo.toISOString().split('T')[0]
    } else if (preset === 'month') {
      const monthAgo = new Date(today)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      p.from = monthAgo.toISOString().split('T')[0]
    }
    delete p.page
    setShowDateFilter(false)
    router.push(buildUrl(p))
  }

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

  const handleRead = useCallback(async (noticeId: string) => {
    if (localReadIds.has(noticeId)) return
    setLocalReadIds((prev) => new Set(prev).add(noticeId))
    try {
      await fetch(`/api/notices/${noticeId}/read`, { method: 'POST' })
    } catch {
      // silent
    }
  }, [localReadIds])

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
    <div className="flex min-h-full flex-col gap-4 md:gap-6">
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
          href={buildUrl({ ...baseParams(), category: '' })}
          className={`snap-start whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${!categoryFilter ? 'bg-surface-card text-th-text shadow-sm' : 'text-th-text-muted hover:text-th-text-secondary'}`}
        >
          {t('common.all')}
        </Link>
        {(['update', 'policy', 'notice', 'system'] as const).map((cat) => (
          <Link
            key={cat}
            href={buildUrl({ ...baseParams(), category: cat })}
            className={`snap-start whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${categoryFilter === cat ? 'bg-surface-card text-th-text shadow-sm' : 'text-th-text-muted hover:text-th-text-secondary'}`}
          >
            {tNotices(`categories.${cat}`)}
          </Link>
        ))}
      </ScrollTabs>

      {/* Filter Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-th-text-muted" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={tNotices('search')}
            className="w-full rounded-lg border border-th-border bg-surface-card py-2 pl-9 pr-3 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          {/* Sort */}
          <button
            type="button"
            onClick={handleSort}
            className="flex items-center gap-1.5 rounded-lg border border-th-border bg-surface-card px-3 py-2 text-xs font-medium text-th-text-secondary hover:bg-th-bg-hover transition-colors"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{sortOrder === 'asc' ? tNotices('sortOldest') : tNotices('sortNewest')}</span>
          </button>

          {/* Date filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDateFilter((p) => !p)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${dateFrom || dateTo ? 'border-th-accent bg-th-accent/5 text-th-accent' : 'border-th-border bg-surface-card text-th-text-secondary hover:bg-th-bg-hover'}`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tNotices('dateFilter')}</span>
            </button>
            {showDateFilter && (
              <div className="absolute right-0 top-10 z-20 w-36 rounded-lg border border-th-border bg-surface-card py-1 shadow-lg">
                {(['all', 'today', 'week', 'month'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleDatePreset(preset)}
                    className="block w-full px-3 py-2 text-left text-xs text-th-text-secondary hover:bg-th-bg-hover"
                  >
                    {tNotices(`datePresets.${preset}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Card List */}
      <div className="space-y-3 md:hidden">
        {infiniteData.length === 0 ? (
          <div className="rounded-xl border border-th-border bg-surface-card p-8 text-center text-th-text-muted">
            {tNotices('noNotices')}
          </div>
        ) : (
          infiniteData.map((notice) => (
            <div
              key={notice.id}
              className="cursor-pointer rounded-xl border border-th-border bg-surface-card p-4 transition-colors hover:bg-th-bg-hover"
              onClick={() => { setDetailNotice(notice); handleRead(notice.id) }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!isRead(notice.id) && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                  {notice.is_pinned && <Pin className="h-3.5 w-3.5 text-th-accent" />}
                  <Badge variant={CATEGORY_VARIANTS[notice.category]}>
                    {tNotices(`categories.${notice.category}`)}
                  </Badge>
                </div>
                <span className="text-xs text-th-text-muted">{formatTimeAgo(notice.created_at)}</span>
              </div>
              <p className={`mt-2 text-sm text-th-text ${!isRead(notice.id) ? 'font-bold' : 'font-medium'}`}>
                {notice.title}
              </p>
              <p className="mt-1 text-xs text-th-text-secondary">
                {notice.users?.name ?? tNotices('categories.system')}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Desktop: Table — pocket scroll */}
      <Card className="hidden flex-1 flex-col overflow-x-auto overflow-y-hidden md:flex">
        <CardContent ref={noticeContainerRef} className="flex flex-col p-0">
          <table className="shrink-0 table-fixed text-left text-sm" style={noticeTableStyle}>
            <colgroup>
              {(canManage ? defaultNoticeColWidths : defaultNoticeColWidths.slice(0, -1)).map((_, i) => (
                <col key={i} style={getNoticeColStyle(i)} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-th-border bg-th-bg-tertiary">
                <th className="px-4 py-3" />
                <th className="relative px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('reports.title')}<div {...getNoticeResizeProps(1)} /></th>
                <th className="relative px-4 py-3 text-xs font-semibold text-th-text-tertiary">{tNotices('category')}<div {...getNoticeResizeProps(2)} /></th>
                <th className="relative px-4 py-3 text-xs font-semibold text-th-text-tertiary">{tNotices('createdBy')}<div {...getNoticeResizeProps(3)} /></th>
                <th className="relative px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('common.date')}<div {...getNoticeResizeProps(4)} /></th>
                {canManage && (
                  <th className="px-4 py-3" />
                )}
              </tr>
            </thead>
          </table>
          <div className="overflow-y-auto shadow-[inset_0_6px_8px_-4px_rgba(0,0,0,0.15)]">
            <table className="table-fixed text-left text-sm" style={noticeTableStyle}>
            <colgroup>
              {(canManage ? defaultNoticeColWidths : defaultNoticeColWidths.slice(0, -1)).map((_, i) => (
                <col key={i} style={getNoticeColStyle(i)} />
              ))}
            </colgroup>
            <tbody className="divide-y divide-th-border">
              {infiniteData.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-4 py-10 text-center text-sm text-th-text-muted">
                    {tNotices('noNotices')}
                  </td>
                </tr>
              ) : (
                infiniteData.map((notice) => (
                  <tr
                    key={notice.id}
                    className="cursor-pointer bg-surface-card transition-colors hover:bg-th-bg-hover"
                    onClick={() => { setDetailNotice(notice); handleRead(notice.id) }}
                  >
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {!isRead(notice.id) && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                        {notice.is_pinned && <Pin className="inline-block h-3.5 w-3.5 text-th-accent" />}
                      </div>
                    </td>
                    <td className={`max-w-xs truncate px-4 py-3 text-th-text ${!isRead(notice.id) ? 'font-bold' : 'font-medium'}`}>
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

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="flex justify-center py-4">
        {isLoadingMore && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-th-accent border-t-transparent" />
        )}
        {!hasMore && infiniteData.length > 0 && (
          <span className="text-xs text-th-text-muted">{infiniteData.length} / {totalCount}</span>
        )}
      </div>

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
          onRead={handleRead}
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
