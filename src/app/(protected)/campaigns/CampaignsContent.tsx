'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { MARKETPLACES, type MarketplaceCode } from '@/constants/marketplaces'

type Campaign = {
  id: string
  keyword: string
  marketplace: string
  frequency: string
  max_pages: number
  status: string
  created_at: string
}

type CampaignsContentProps = {
  campaigns: Campaign[] | null
  totalPages: number
  page: number
  statusFilter: string
  canCreate: boolean
}

export const CampaignsContent = ({ campaigns, totalPages, page, statusFilter, canCreate }: CampaignsContentProps) => {
  const { t } = useI18n()

  const statusFilters = [
    { value: '', label: t('common.all') },
    { value: 'active', label: t('campaigns.active') },
    { value: 'paused', label: t('campaigns.paused') },
    { value: 'completed', label: t('campaigns.completed') },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-th-text md:text-2xl">{t('campaigns.title')}</h1>
        {canCreate && (
          <Link href="/campaigns/new">
            <Button size="sm" className="md:hidden">{t('campaigns.newCampaign')}</Button>
            <Button className="hidden md:inline-flex">{t('campaigns.newCampaign')}</Button>
          </Link>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {statusFilters.map((s) => (
          <Link
            key={s.value}
            href={s.value ? `/campaigns?status=${s.value}` : '/campaigns'}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
              statusFilter === s.value
                ? 'bg-th-accent-soft text-th-accent-text'
                : 'text-th-text-tertiary hover:bg-th-bg-hover'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {(!campaigns || campaigns.length === 0) ? (
          <div className="rounded-lg border border-th-border bg-surface-card p-8 text-center text-th-text-muted">
            {t('campaigns.noCampaigns')}
          </div>
        ) : (
          campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
              <div className="rounded-lg border border-th-border bg-surface-card p-4 transition-colors active:bg-th-bg-hover">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-th-text">{campaign.keyword}</p>
                  <StatusBadge status={campaign.status as 'active' | 'paused' | 'completed' | 'scheduled'} type="campaign" />
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-th-text-muted">
                  <span>{MARKETPLACES[campaign.marketplace as MarketplaceCode]?.name ?? campaign.marketplace}</span>
                  <span>{campaign.frequency}</span>
                  <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-lg border border-th-border md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-th-border bg-th-bg-tertiary">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('campaigns.keyword')}</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('campaigns.marketplace')}</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('campaigns.frequency')}</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('campaigns.pages')}</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('common.status')}</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('campaigns.created')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {(!campaigns || campaigns.length === 0) ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-th-text-muted">{t('campaigns.noCampaigns')}</td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id} className="bg-surface-card transition-colors hover:bg-th-bg-hover">
                  <td className="px-4 py-3">
                    <Link href={`/campaigns/${campaign.id}`} className="font-medium text-th-text hover:text-th-accent-text">
                      {campaign.keyword}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-th-text-secondary">
                    {MARKETPLACES[campaign.marketplace as MarketplaceCode]?.name ?? campaign.marketplace}
                  </td>
                  <td className="px-4 py-3 text-th-text-secondary">{campaign.frequency}</td>
                  <td className="px-4 py-3 text-th-text-secondary">{campaign.max_pages}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={campaign.status as 'active' | 'paused' | 'completed' | 'scheduled'} type="campaign" />
                  </td>
                  <td className="px-4 py-3 text-th-text-muted">{new Date(campaign.created_at).toLocaleDateString()}</td>
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
    </div>
  )
}
