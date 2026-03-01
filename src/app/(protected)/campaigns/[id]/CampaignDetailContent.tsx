'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { CampaignStats } from '@/components/features/CampaignStats'
import { CampaignActions } from './CampaignActions'

type ListingRow = {
  id: string
  asin: string
  title: string
  seller_name: string | null
  is_suspect: boolean
  source: string
}

type CampaignDetailContentProps = {
  campaign: {
    id: string
    keyword: string
    marketplace: string
    marketplaceName: string
    status: string
    frequency: string
    max_pages: number
    start_date: string
    end_date: string | null
    creatorName: string | null
  }
  listings: ListingRow[]
  totalListings: number
  suspectCount: number
  canEdit: boolean
  userRole: 'admin' | 'editor' | 'viewer'
}

export const CampaignDetailContent = ({
  campaign,
  listings,
  totalListings,
  suspectCount,
  canEdit,
  userRole,
}: CampaignDetailContentProps) => {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/campaigns" className="text-th-text-muted hover:text-th-text-secondary">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-th-text">{campaign.keyword}</h1>
          <StatusBadge status={campaign.status as 'active' | 'paused' | 'completed' | 'scheduled'} type="campaign" />
        </div>
        {canEdit && (
          <CampaignActions campaignId={campaign.id} status={campaign.status} userRole={userRole} />
        )}
      </div>

      <CampaignStats stats={{ total_listings: totalListings, suspect_listings: suspectCount }} />

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-th-text">{t('campaigns.detail.title')}</h2>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-th-text-tertiary">{t('campaigns.marketplace')}</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">
                {campaign.marketplaceName} ({campaign.marketplace})
              </dd>
            </div>
            <div>
              <dt className="text-sm text-th-text-tertiary">{t('campaigns.frequency')}</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">{campaign.frequency}</dd>
            </div>
            <div>
              <dt className="text-sm text-th-text-tertiary">{t('campaigns.detail.startDate')}</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">
                {new Date(campaign.start_date).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-th-text-tertiary">{t('campaigns.detail.endDate')}</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">
                {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : t('campaigns.detail.noEndDate')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-th-text-tertiary">{t('campaigns.detail.maxPages')}</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">{campaign.max_pages}</dd>
            </div>
            <div>
              <dt className="text-sm text-th-text-tertiary">{t('campaigns.detail.createdBy')}</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">
                {campaign.creatorName ?? t('reports.detail.unknown')}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-th-text">{t('campaigns.detail.collectedListings')}</h2>
            <Badge variant="info">{totalListings} {t('campaigns.detail.items')}</Badge>
          </div>
        </CardHeader>
        {listings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-th-border bg-th-bg-tertiary">
                  <th className="px-4 py-2 text-xs font-medium uppercase text-th-text-tertiary">{t('campaigns.detail.asin')}</th>
                  <th className="px-4 py-2 text-xs font-medium uppercase text-th-text-tertiary">{t('campaigns.detail.listingTitle')}</th>
                  <th className="px-4 py-2 text-xs font-medium uppercase text-th-text-tertiary">{t('campaigns.detail.seller')}</th>
                  <th className="px-4 py-2 text-xs font-medium uppercase text-th-text-tertiary">{t('common.status')}</th>
                  <th className="px-4 py-2 text-xs font-medium uppercase text-th-text-tertiary">{t('common.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-th-border">
                {listings.map((listing) => (
                  <tr key={listing.id} className="bg-surface-card hover:bg-th-bg-hover">
                    <td className="px-4 py-2 font-mono text-th-text">{listing.asin}</td>
                    <td className="max-w-xs truncate px-4 py-2 text-th-text-secondary">{listing.title}</td>
                    <td className="px-4 py-2 text-th-text-secondary">{listing.seller_name ?? '—'}</td>
                    <td className="px-4 py-2">
                      {listing.is_suspect ? (
                        <Badge variant="danger">{t('campaigns.detail.suspect')}</Badge>
                      ) : (
                        <Badge variant="success">{t('campaigns.detail.normal')}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {listing.is_suspect && (
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-medium text-th-accent-text hover:bg-th-accent-soft"
                        >
                          {t('campaigns.detail.report')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CardContent>
            <p className="text-sm text-th-text-muted">{t('campaigns.detail.noListings')}</p>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
