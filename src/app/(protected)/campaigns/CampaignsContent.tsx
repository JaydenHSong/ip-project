'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'
import { Button } from '@/components/ui/Button'
import { ScrollTabs } from '@/components/ui/ScrollTabs'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SlidePanel } from '@/components/ui/SlidePanel'
import { CampaignForm } from '@/components/features/CampaignForm'
import { OwnerToggle } from '@/components/ui/OwnerToggle'
import { MARKETPLACES, type MarketplaceCode } from '@/constants/marketplaces'
import type { Role } from '@/types/users'
import { useToast } from '@/hooks/useToast'
import { useResizableColumns } from '@/hooks/useResizableColumns'
import { Modal } from '@/components/ui/Modal'

const FREQ_LABEL: Record<string, string> = {
  daily: 'Daily',
  every_12h: 'Every 12h',
  every_6h: 'Every 6h',
  every_3d: 'Every 3 Days',
  weekly: 'Weekly',
}

type Campaign = {
  id: string
  keyword: string
  marketplace: string
  frequency: string
  max_pages: number
  status: string
  created_at: string
  total_listings?: number | null
  last_crawled_at?: string | null
  users?: { name: string } | null
}

type CampaignsContentProps = {
  campaigns: Campaign[] | null
  totalPages: number
  page: number
  statusFilter: string
  canCreate: boolean
  userRole: Role
  ownerFilter: 'my' | 'all'
}

export const CampaignsContent = ({ campaigns, totalPages, page, statusFilter, canCreate, userRole, ownerFilter }: CampaignsContentProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const { addToast } = useToast()
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const canDelete = userRole === 'owner' || userRole === 'admin'

  // keyword(280) + marketplace(130) + frequency(110) + pages(80) + collected(100) + status(110) + createdBy(140) + date(110)
  const defaultCampaignColWidths = useMemo(
    () => canDelete ? [40, 280, 130, 110, 80, 100, 110, 140, 110] : [280, 130, 110, 80, 100, 110, 140, 110],
    [canDelete],
  )
  const { containerRef: campaignContainerRef, tableStyle: campaignTableStyle, getColStyle: getCampaignColStyle, getResizeHandleProps: getCampaignResizeProps } = useResizableColumns({
    storageKey: canDelete ? 'campaigns-v2' : 'campaigns-v2-v',
    defaultWidths: defaultCampaignColWidths,
  })

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (!campaigns) return
    if (selectedIds.size === campaigns.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(campaigns.map((c) => c.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    setDeleting(true)
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/campaigns/${id}`, { method: 'DELETE' }).then((res) => {
            if (!res.ok) throw new Error(`Failed: ${id}`)
          })
        )
      )
      const deleted = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.filter((r) => r.status === 'rejected').length
      setSelectedIds(new Set())
      setShowBulkDeleteConfirm(false)
      addToast({
        type: failed > 0 ? 'warning' : 'success',
        title: failed > 0 ? 'Partially deleted' : 'Deleted',
        message: `Deleted: ${deleted}${failed > 0 ? `, Failed: ${failed}` : ''}`,
      })
      router.refresh()
    } catch (e) {
      addToast({ type: 'error', title: 'Delete failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setDeleting(false)
    }
  }

  const handleNewCampaignSuccess = useCallback(() => {
    setShowNewCampaign(false)
    router.refresh()
  }, [router])

  const statusFilters = [
    { value: '', label: t('common.all') },
    { value: 'active', label: t('campaigns.active') },
    { value: 'paused', label: t('campaigns.paused') },
    { value: 'completed', label: t('campaigns.completed') },
  ]

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="truncate text-xl font-bold text-th-text md:text-2xl">{t('campaigns.title')}</h1>
          <OwnerToggle
            value={ownerFilter}
            onChange={(v) => {
              const url = new URL(window.location.href)
              url.searchParams.set('owner', v)
              router.push(url.pathname + url.search)
            }}
          />
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setShowNewCampaign(true)}>
            {t('campaigns.newCampaign')}
          </Button>
        )}
      </div>

      <ScrollTabs>
        {statusFilters.map((s) => (
          <Link
            key={s.value}
            href={s.value ? `/campaigns?status=${s.value}` : '/campaigns'}
            className={`snap-start whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === s.value
                ? 'bg-surface-card text-th-text shadow-sm'
                : 'text-th-text-muted hover:text-th-text-secondary'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </ScrollTabs>

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {(!campaigns || campaigns.length === 0) ? (
          <div className="rounded-xl border border-th-border bg-surface-card p-8 text-center text-th-text-muted">
            {t('campaigns.noCampaigns')}
          </div>
        ) : (
          campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="block"
            >
              <div className="rounded-xl border border-th-border bg-surface-card p-4 transition-colors active:bg-th-bg-hover">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-th-text">{campaign.keyword}</p>
                  <StatusBadge status={campaign.status as 'active' | 'paused' | 'completed' | 'scheduled'} type="campaign" />
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-th-text-muted">
                  <span>{MARKETPLACES[campaign.marketplace as MarketplaceCode]?.name ?? campaign.marketplace}</span>
                  <span>{FREQ_LABEL[campaign.frequency] ?? campaign.frequency}</span>
                  <span className="font-medium text-th-text-secondary">{campaign.total_listings ?? 0} {t('campaigns.collected')}</span>
                  {campaign.users?.name && <span>{campaign.users.name}</span>}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Bulk delete bar */}
      {canDelete && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-900 dark:bg-red-950">
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            {selectedIds.size}개 선택됨
          </span>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setShowBulkDeleteConfirm(true)}
            disabled={deleting}
          >
            {deleting ? '삭제 중...' : '선택 삭제'}
          </Button>
          <button
            className="ml-auto text-sm text-th-text-muted hover:text-th-text"
            onClick={() => setSelectedIds(new Set())}
          >
            취소
          </button>
        </div>
      )}

      {/* Desktop: table — single table with sticky header */}
      <div className="hidden flex-col overflow-hidden rounded-lg border border-th-border md:flex">
        <div ref={campaignContainerRef} className="overflow-auto">
          <table className="table-fixed text-left text-sm" style={campaignTableStyle}>
          <colgroup>
            {defaultCampaignColWidths.map((_, i) => (
              <col key={i} style={getCampaignColStyle(i)} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-th-border bg-th-bg-tertiary">
              {canDelete && (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={campaigns !== null && campaigns.length > 0 && selectedIds.size === campaigns.length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-th-border accent-th-accent"
                  />
                </th>
              )}
              {(() => { const o = canDelete ? 1 : 0; return (<>
              <th className="relative px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('campaigns.keyword')}<div {...getCampaignResizeProps(o)} /></th>
              <th className="relative px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('campaigns.marketplace')}<div {...getCampaignResizeProps(o + 1)} /></th>
              <th className="relative px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('campaigns.frequency')}<div {...getCampaignResizeProps(o + 2)} /></th>
              <th className="relative px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('campaigns.pages')}<div {...getCampaignResizeProps(o + 3)} /></th>
              <th className="relative px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('campaigns.collected')}<div {...getCampaignResizeProps(o + 4)} /></th>
              <th className="relative px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('common.status')}<div {...getCampaignResizeProps(o + 5)} /></th>
              <th className="relative px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('campaigns.createdBy')}<div {...getCampaignResizeProps(o + 6)} /></th>
              <th className="relative px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('campaigns.created')}<div {...getCampaignResizeProps(o + 7)} /></th>
              </>)})()}
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {(!campaigns || campaigns.length === 0) ? (
              <tr>
                <td colSpan={canDelete ? 9 : 8} className="px-4 py-10 text-center text-sm text-th-text-muted">{t('campaigns.noCampaigns')}</td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  className={`cursor-pointer bg-surface-card transition-colors hover:bg-th-bg-hover ${selectedIds.has(campaign.id) ? 'bg-th-bg-hover' : ''}`}
                  onClick={() => router.push(`/campaigns/${campaign.id}`)}
                >
                  {canDelete && (
                    <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(campaign.id)}
                        onChange={() => toggleSelect(campaign.id)}
                        className="h-4 w-4 rounded border-th-border accent-th-accent"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3.5">
                    <span className="font-medium text-th-text">
                      {campaign.keyword}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-th-text-secondary">
                    {MARKETPLACES[campaign.marketplace as MarketplaceCode]?.name ?? campaign.marketplace}
                  </td>
                  <td className="px-4 py-3.5 text-th-text-secondary">{FREQ_LABEL[campaign.frequency] ?? campaign.frequency}</td>
                  <td className="px-4 py-3.5 text-th-text-secondary">{campaign.max_pages}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-medium text-th-text">{campaign.total_listings ?? 0}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={campaign.status as 'active' | 'paused' | 'completed' | 'scheduled'} type="campaign" />
                  </td>
                  <td className="px-4 py-3.5 text-th-text-secondary">{campaign.users?.name ?? '—'}</td>
                  <td className="px-4 py-3.5 text-th-text-muted">{new Date(campaign.created_at).toLocaleDateString('en-CA')}</td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/campaigns?page=${p}${statusFilter ? `&status=${statusFilter}` : ''}`}
              className={`rounded-md px-3 py-1.5 text-sm ${
                p === page ? 'bg-th-accent text-white' : 'text-th-text-secondary hover:bg-th-bg-hover'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}

      {/* New Campaign SlidePanel */}
      <SlidePanel
        open={showNewCampaign}
        onClose={() => setShowNewCampaign(false)}
        title={t('campaigns.form.newTitle')}
      >
        <div className="p-6">
          <p className="mb-6 text-sm text-th-text-secondary">{t('campaigns.form.description')}</p>
          <CampaignForm embedded onSuccess={handleNewCampaignSuccess} />
        </div>
      </SlidePanel>

      <Modal
        open={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        title="Delete Campaigns"
      >
        <p className="text-sm text-th-text-secondary">
          {selectedIds.size}개 캠페인을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowBulkDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={deleting}
            onClick={handleBulkDelete}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
