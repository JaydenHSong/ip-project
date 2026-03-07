'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ExternalLink, FileWarning, ClipboardList, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { getAmazonUrl } from '@/lib/utils/amazon-url'
import { BackButton } from '@/components/ui/BackButton'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import { SlidePanel } from '@/components/ui/SlidePanel'
import { CampaignStats } from '@/components/features/CampaignStats'
import { CampaignActions } from './CampaignActions'
import { ReportActions } from '@/app/(protected)/reports/[id]/ReportActions'
import type { ViolationCode } from '@/constants/violations'
import type { ReportStatus } from '@/types/reports'
import type { Role } from '@/types/users'

type ListingRow = {
  id: string
  asin: string
  title: string
  seller_name: string | null
  is_suspect: boolean
  source: string
}

type ReportRow = {
  id: string
  listing_id: string
  status: string
  user_violation_type: string
  ai_violation_type: string | null
  ai_confidence_score: number | null
  confirmed_violation_type: string | null
  disagreement_flag: boolean
  draft_title: string | null
  draft_body: string | null
  rejection_reason: string | null
  sc_case_id: string | null
  created_at: string
  approved_at: string | null
  rejected_at: string | null
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
  reports: ReportRow[]
  totalListings: number
  suspectCount: number
  canEdit: boolean
  userRole: Role
}

export const CampaignDetailContent = ({
  campaign,
  listings,
  reports,
  totalListings,
  suspectCount,
  canEdit,
  userRole,
}: CampaignDetailContentProps) => {
  const { t } = useI18n()
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)

  const selectedListing = selectedListingId ? listings.find((l) => l.id === selectedListingId) ?? null : null
  const selectedReports = selectedListingId ? reports.filter((r) => r.listing_id === selectedListingId) : []

  const handleClosePanel = useCallback(() => setSelectedListingId(null), [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton href="/campaigns" />
          <h1 className="text-2xl font-bold text-th-text">{campaign.keyword}</h1>
          <StatusBadge status={campaign.status as 'active' | 'paused' | 'completed' | 'scheduled'} type="campaign" />
        </div>
        {canEdit && (
          <CampaignActions campaignId={campaign.id} status={campaign.status} userRole={userRole} />
        )}
      </div>

      <CampaignStats stats={{ total_listings: totalListings, suspect_listings: suspectCount }} />

      {/* Campaign Owner Stats */}
      {campaign.creatorName && (
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-th-accent-soft text-sm font-medium text-th-accent-text">
                {campaign.creatorName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-th-text">{campaign.creatorName}</p>
                <p className="text-xs text-th-text-muted">{t('campaigns.owner' as Parameters<typeof t>[0])}</p>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-lg font-bold text-th-text">{totalListings}</p>
                  <p className="text-xs text-th-text-muted">{t('campaigns.listingsFound' as Parameters<typeof t>[0])}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-th-text">{reports.length}</p>
                  <p className="text-xs text-th-text-muted">{t('campaigns.reportsFiled' as Parameters<typeof t>[0])}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-400">
                    {reports.length > 0
                      ? `${Math.round((reports.filter((r) => r.status === 'resolved').length / reports.length) * 100)}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-th-text-muted">{t('campaigns.successRate' as Parameters<typeof t>[0])}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('campaigns.detail.asin')}</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('campaigns.detail.listingTitle')}</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('campaigns.detail.seller')}</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('common.status')}</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('common.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-th-border">
                {listings.map((listing) => {
                  const hasReport = reports.some((r) => r.listing_id === listing.id)
                  return (
                    <tr
                      key={listing.id}
                      className="cursor-pointer bg-surface-card transition-colors hover:bg-th-bg-hover"
                      onClick={() => setSelectedListingId(listing.id)}
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-th-accent-text">{listing.asin}</span>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3.5 text-th-text-secondary">{listing.title}</td>
                      <td className="px-4 py-3.5 text-th-text-secondary">{listing.seller_name ?? '—'}</td>
                      <td className="px-4 py-3.5">
                        {listing.is_suspect ? (
                          <Badge variant="danger">{t('campaigns.detail.suspect')}</Badge>
                        ) : (
                          <Badge variant="success">{t('campaigns.detail.normal')}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
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
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <CardContent>
            <p className="text-sm text-th-text-muted">{t('campaigns.detail.noListings')}</p>
          </CardContent>
        )}
      </Card>

      {/* Listing Detail Slide Panel */}
      <SlidePanel
        open={!!selectedListingId}
        onClose={handleClosePanel}
        title={selectedListing?.asin ?? ''}
        status={selectedListing ? (
          selectedListing.is_suspect
            ? <Badge variant="danger">{t('campaigns.detail.suspect')}</Badge>
            : <Badge variant="success">{t('campaigns.detail.normal')}</Badge>
        ) : undefined}
        size="lg"
      >
        {selectedListing && (
          <div className="space-y-4 p-6">
            {/* Listing Info Card */}
            <div className="rounded-xl border border-th-border bg-th-bg-secondary p-4">
              <p className="text-sm leading-relaxed text-th-text line-clamp-2">
                {selectedListing.title}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3 border-t border-th-border pt-3">
                <div>
                  <p className="text-xs text-th-text-tertiary">{t('campaigns.detail.seller')}</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-th-text">
                    {selectedListing.seller_name ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-th-text-tertiary">Source</p>
                  <p className="mt-0.5 text-sm font-medium text-th-text capitalize">{selectedListing.source}</p>
                </div>
                <div>
                  <p className="text-xs text-th-text-tertiary">{t('campaigns.marketplace')}</p>
                  <p className="mt-0.5 text-sm font-medium text-th-text">{campaign.marketplace}</p>
                </div>
              </div>
            </div>

            {/* Amazon Link */}
            <a
              href={getAmazonUrl(selectedListing.asin, campaign.marketplace)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-th-border px-4 py-3 text-sm font-medium text-th-accent-text transition-colors hover:bg-th-accent-soft"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                View on Amazon
              </span>
              <span className="text-xs text-th-text-muted">{campaign.marketplace}</span>
            </a>

            {/* Reports or Empty State */}
            {selectedReports.length === 0 ? (
              <div className="rounded-xl border border-dashed border-th-border bg-th-bg-secondary p-6 text-center">
                {selectedListing.is_suspect ? (
                  <>
                    <FileWarning className="mx-auto h-10 w-10 text-th-text-muted" />
                    <p className="mt-3 text-sm font-medium text-th-text">
                      No report filed yet
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-th-text-muted">
                      This listing was flagged as suspect. Create a violation report to start the review process.
                    </p>
                    <Link href={`/reports/new?asin=${selectedListing.asin}&listing_id=${selectedListing.id}&marketplace=${campaign.marketplace}`}>
                      <Button className="mt-4">
                        <ClipboardList className="mr-1.5 h-4 w-4" />
                        Create Report
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mx-auto h-10 w-10 text-st-success-text" />
                    <p className="mt-3 text-sm font-medium text-th-text">
                      This listing appears normal
                    </p>
                    <p className="mt-1 text-xs text-th-text-muted">
                      No violations detected by the crawler.
                    </p>
                    <Link
                      href={`/reports/new?asin=${selectedListing.asin}&listing_id=${selectedListing.id}&marketplace=${campaign.marketplace}`}
                      className="mt-3 inline-block text-xs text-th-accent-text hover:underline"
                    >
                      Create report manually →
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-th-text-tertiary">
                  {t('reports.title')} ({selectedReports.length})
                </h3>
                {selectedReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/reports/${report.id}`}
                    className="block rounded-xl border border-th-border bg-surface-card p-4 transition-colors hover:bg-th-bg-hover"
                  >
                    <div className="flex items-center justify-between">
                      <StatusBadge status={report.status as ReportStatus} type="report" />
                      <span className="text-xs text-th-text-muted">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <ViolationBadge code={report.user_violation_type as ViolationCode} />
                      {report.ai_violation_type && report.ai_confidence_score !== null && (
                        <span className="text-xs text-th-text-muted">
                          AI {report.ai_confidence_score}%
                        </span>
                      )}
                    </div>
                    {report.disagreement_flag && (
                      <div className="mt-2 rounded-lg border border-st-warning-text/30 bg-st-warning-bg px-2.5 py-1.5">
                        <p className="text-xs font-medium text-st-warning-text">
                          {t('reports.detail.disagreementWarning')}
                        </p>
                      </div>
                    )}
                    {report.draft_title && (
                      <p className="mt-2 truncate text-sm text-th-text-secondary">
                        {report.draft_title}
                      </p>
                    )}
                    {report.sc_case_id && (
                      <p className="mt-1 text-xs text-th-text-muted">
                        SC Case: {report.sc_case_id}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  )
}
