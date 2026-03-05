'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SlidePanel } from '@/components/ui/SlidePanel'
import { CampaignForm } from '@/components/features/CampaignForm'
import { OwnerToggle } from '@/components/ui/OwnerToggle'
import { MARKETPLACES, type MarketplaceCode } from '@/constants/marketplaces'
import type { Role } from '@/types/users'

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
  const [showNewCampaign, setShowNewCampaign] = useState(false)

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
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-th-text md:text-2xl">{t('campaigns.title')}</h1>
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
          <div>
            <Button size="sm" className="md:hidden" onClick={() => setShowNewCampaign(true)}>
              {t('campaigns.newCampaign')}
            </Button>
            <Button className="hidden md:inline-flex" onClick={() => setShowNewCampaign(true)}>
              {t('campaigns.newCampaign')}
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-th-border bg-th-bg-secondary p-1">
        {statusFilters.map((s) => (
          <Link
            key={s.value}
            href={s.value ? `/campaigns?status=${s.value}` : '/campaigns'}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === s.value
                ? 'bg-surface-card text-th-text shadow-sm'
                : 'text-th-text-muted hover:text-th-text-secondary'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

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

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-xl border border-th-border shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-th-border bg-th-bg-tertiary">
              <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('campaigns.keyword')}</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('campaigns.marketplace')}</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('campaigns.frequency')}</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('campaigns.pages')}</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('campaigns.collected')}</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('common.status')}</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('campaigns.createdBy')}</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('campaigns.created')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {(!campaigns || campaigns.length === 0) ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-th-text-muted">{t('campaigns.noCampaigns')}</td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  className="cursor-pointer bg-surface-card transition-all duration-150 hover:bg-th-bg-hover"
                  onClick={() => router.push(`/campaigns/${campaign.id}`)}
                >
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
                  <td className="px-4 py-3.5 text-th-text-muted">{new Date(campaign.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

    </div>
  )
}
