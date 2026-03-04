'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
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
  userRole: 'admin' | 'editor' | 'viewer'
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

      {/* Report Detail Slide Panel */}
      <SlidePanel
        open={!!selectedListingId}
        onClose={handleClosePanel}
        title={t('reports.detail.title')}
        status={selectedReports[0] ? (
          <StatusBadge status={selectedReports[0].status as ReportStatus} type="report" />
        ) : undefined}
        size="xl"
      >
        {selectedListing && (
          <div className="space-y-6 p-6">
            {selectedReports.length === 0 ? (
              <p className="text-sm text-th-text-muted">{t('reports.noReports')}</p>
            ) : (
              selectedReports.map((report) => (
                <div key={report.id} className="space-y-4">
                  {/* Actions */}
                  {canEdit && (
                    <div className="flex items-center justify-between">
                      <StatusBadge status={report.status as ReportStatus} type="report" />
                      <ReportActions
                        reportId={report.id}
                        status={report.status}
                        userRole={userRole}
                        scCaseId={report.sc_case_id}
                      />
                    </div>
                  )}

                  {/* Violation Info */}
                  <Card>
                    <CardHeader>
                      <h3 className="text-sm font-semibold text-th-text">{t('reports.detail.violationInfo')}</h3>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-th-text-tertiary">{t('reports.detail.userViolationType')}</p>
                          <div className="mt-1">
                            <ViolationBadge code={report.user_violation_type as ViolationCode} />
                          </div>
                        </div>
                        {report.ai_violation_type && (
                          <div>
                            <p className="text-xs text-th-text-tertiary">{t('reports.detail.aiViolationType')}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <ViolationBadge code={report.ai_violation_type as ViolationCode} />
                              {report.ai_confidence_score !== null && (
                                <span className="text-xs text-th-text-muted">{report.ai_confidence_score}%</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {report.disagreement_flag && (
                        <div className="rounded-lg border border-st-warning-text/30 bg-st-warning-bg px-3 py-2">
                          <p className="text-xs font-medium text-st-warning-text">
                            {t('reports.detail.disagreementWarning')}
                          </p>
                        </div>
                      )}
                      {report.confirmed_violation_type && (
                        <div>
                          <p className="text-xs text-th-text-tertiary">{t('reports.detail.confirmedViolationType')}</p>
                          <div className="mt-1">
                            <ViolationBadge code={report.confirmed_violation_type as ViolationCode} />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Listing Info */}
                  <Card>
                    <CardHeader>
                      <h3 className="text-sm font-semibold text-th-text">{t('reports.detail.listing')}</h3>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-xs text-th-text-tertiary">ASIN</dt>
                          <dd className="mt-0.5 font-mono font-medium text-th-text">{selectedListing.asin}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-th-text-tertiary">{t('campaigns.detail.seller')}</dt>
                          <dd className="mt-0.5 font-medium text-th-text">{selectedListing.seller_name ?? '—'}</dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-xs text-th-text-tertiary">{t('reports.title')}</dt>
                          <dd className="mt-0.5 font-medium text-th-text">{selectedListing.title}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  {/* Draft */}
                  {report.draft_title && (
                    <Card>
                      <CardHeader>
                        <h3 className="text-sm font-semibold text-th-text">{t('reports.detail.reportDraft')}</h3>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <p className="text-xs text-th-text-tertiary">{t('reports.detail.draftTitle')}</p>
                          <p className="mt-0.5 text-sm font-medium text-th-text">{report.draft_title}</p>
                        </div>
                        {report.draft_body && (
                          <div>
                            <p className="text-xs text-th-text-tertiary">{t('reports.detail.draftBody')}</p>
                            <div className="mt-0.5 rounded-lg bg-th-bg-tertiary p-3 text-xs text-th-text-secondary whitespace-pre-wrap">
                              {report.draft_body}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Rejection Reason */}
                  {report.rejection_reason && (
                    <Card>
                      <CardContent>
                        <p className="text-xs text-th-text-tertiary">{t('reports.detail.rejectionReason')}</p>
                        <div className="mt-1 rounded-lg border border-st-danger-text/20 bg-st-danger-bg p-3 text-xs text-st-danger-text">
                          {report.rejection_reason}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-th-text-muted">
                    <span>{t('reports.detail.createdAt')}: {new Date(report.created_at).toLocaleString()}</span>
                    <Link
                      href={`/reports/${report.id}`}
                      className="text-th-accent-text hover:underline"
                    >
                      {t('common.details')} →
                    </Link>
                  </div>

                  {/* Separator between multiple reports */}
                  {selectedReports.length > 1 && selectedReports.indexOf(report) < selectedReports.length - 1 && (
                    <hr className="border-th-border" />
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  )
}
