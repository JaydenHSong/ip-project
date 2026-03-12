'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink, FileWarning, ClipboardList, ShieldCheck, X, Trash2, AlertTriangle } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { getAmazonUrl } from '@/lib/utils/amazon-url'
import { BackButton } from '@/components/ui/BackButton'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import { Modal } from '@/components/ui/Modal'
import { SlidePanel } from '@/components/ui/SlidePanel'
import { CampaignStats } from '@/components/features/CampaignStats'
import { CampaignActions } from './CampaignActions'
import { ReportActions } from '@/app/(protected)/reports/[id]/ReportActions'
import type { ReportStatus } from '@/types/reports'
import type { Role } from '@/types/users'

type ListingRow = {
  id: string
  asin: string
  title: string
  seller_name: string | null
  is_suspect: boolean
  source: string
  screenshot_url: string | null
  suspect_reasons: string[]
}

const REASON_LABELS: Record<string, string> = {
  trademark_abuse: 'Trademark Abuse',
  compatibility_misleading: 'Misleading Compatibility',
  counterfeit_signals: 'Counterfeit Signals',
  image_theft: 'Image Theft',
  review_manipulation: 'Review Manipulation',
  regulatory_missing: 'Missing Regulatory',
}

type ReportRow = {
  id: string
  listing_id: string
  status: string
  br_form_type: string | null
  user_violation_type: string
  ai_violation_type: string | null
  ai_confidence_score: number | null
  confirmed_violation_type: string | null
  disagreement_flag: boolean
  draft_title: string | null
  draft_body: string | null
  rejection_reason: string | null
  pd_case_id: string | null
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
  const router = useRouter()
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const [showScreenshot, setShowScreenshot] = useState(false)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([])

  const canDelete = userRole === 'owner' || userRole === 'admin'

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (checkedIds.size === listings.length) {
      setCheckedIds(new Set())
    } else {
      setCheckedIds(new Set(listings.map((l) => l.id)))
    }
  }

  const requestDelete = (ids: string[]) => {
    if (ids.length === 0) return
    setDeleteTargetIds(ids)
  }

  const confirmDelete = async () => {
    if (deleteTargetIds.length === 0) return
    setDeleting(true)
    try {
      const res = await fetch('/api/listings/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deleteTargetIds }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error?.message ?? 'Delete failed')
        return
      }
      setCheckedIds(new Set())
      setSelectedListingId(null)
      router.refresh()
    } finally {
      setDeleting(false)
      setDeleteTargetIds([])
    }
  }

  const selectedListing = selectedListingId ? listings.find((l) => l.id === selectedListingId) ?? null : null
  const selectedReports = selectedListingId ? reports.filter((r) => r.listing_id === selectedListingId) : []
  const screenshotUrl = selectedListing?.screenshot_url ?? null

  const handleClosePanel = useCallback(() => setSelectedListingId(null), [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton href="/campaigns" />
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold leading-none text-th-text">{campaign.keyword}</h1>
            <StatusBadge status={campaign.status as 'active' | 'paused' | 'completed' | 'scheduled'} type="campaign" />
          </div>
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
                {new Date(campaign.start_date).toLocaleDateString('en-CA')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-th-text-tertiary">{t('campaigns.detail.endDate')}</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">
                {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('en-CA') : t('campaigns.detail.noEndDate')}
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
            <div className="flex items-center gap-2">
              {canDelete && checkedIds.size > 0 && (
                <button
                  onClick={() => requestDelete(Array.from(checkedIds))}
                  disabled={deleting}
                  className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting ? 'Deleting...' : `Delete (${checkedIds.size})`}
                </button>
              )}
              <Badge variant="info">{totalListings} {t('campaigns.detail.items')}</Badge>
            </div>
          </div>
        </CardHeader>
        {listings.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-th-border bg-th-bg-tertiary">
                    {canDelete && (
                      <th className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={checkedIds.size === listings.length && listings.length > 0}
                          onChange={toggleAll}
                          className="h-4 w-4 rounded border-th-border accent-th-accent-text"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('campaigns.detail.asin')}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('campaigns.detail.listingTitle')}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('campaigns.detail.seller')}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('common.status')}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('common.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-th-border">
                  {listings.map((listing) => {
                    return (
                      <tr
                        key={listing.id}
                        className="cursor-pointer bg-surface-card transition-colors hover:bg-th-bg-hover"
                        onClick={() => setSelectedListingId(listing.id)}
                      >
                        {canDelete && (
                          <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checkedIds.has(listing.id)}
                              onChange={() => toggleCheck(listing.id)}
                              className="h-4 w-4 rounded border-th-border accent-th-accent-text"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            {listing.screenshot_url && (
                              <div className="h-9 w-9 shrink-0 overflow-hidden rounded border border-th-border bg-th-bg-secondary">
                                <img src={listing.screenshot_url} alt="" className="h-full w-full object-cover" />
                              </div>
                            )}
                            <span className="font-mono text-th-accent-text">{listing.asin}</span>
                          </div>
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-th-text-secondary">{listing.title}</td>
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
                              className="rounded-full px-2.5 py-0.5 text-xs font-medium text-th-accent-text bg-th-accent-soft/50 hover:bg-th-accent-soft"
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

            {/* Mobile Card List */}
            <div className="divide-y divide-th-border md:hidden">
              {canDelete && (
                <div className="flex items-center gap-2 border-b border-th-border bg-th-bg-tertiary px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={checkedIds.size === listings.length && listings.length > 0}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-th-border accent-th-accent-text"
                  />
                  <span className="text-xs text-th-text-muted">Select all</span>
                </div>
              )}
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="flex gap-3 bg-surface-card px-4 py-3 transition-colors active:bg-th-bg-hover"
                  onClick={() => setSelectedListingId(listing.id)}
                >
                  {canDelete && (
                    <div className="flex items-start pt-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checkedIds.has(listing.id)}
                        onChange={() => toggleCheck(listing.id)}
                        className="h-4 w-4 rounded border-th-border accent-th-accent-text"
                      />
                    </div>
                  )}
                  {listing.screenshot_url && (
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-th-border bg-th-bg-secondary">
                      <img
                        src={listing.screenshot_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-th-accent-text">{listing.asin}</span>
                      {listing.is_suspect ? (
                        <Badge variant="danger">{t('campaigns.detail.suspect')}</Badge>
                      ) : (
                        <Badge variant="success">{t('campaigns.detail.normal')}</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm leading-snug text-th-text line-clamp-2">{listing.title}</p>
                    <p className="mt-1 text-xs text-th-text-muted">
                      {listing.seller_name ?? '—'}
                      <span className="mx-1.5 text-th-border">·</span>
                      <span className="capitalize">{listing.source}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
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
          <div className="flex items-center gap-2">
            {selectedListing.is_suspect ? (
              <Badge variant="danger" className="px-3 py-1 text-sm">{t('campaigns.detail.suspect')}</Badge>
            ) : (
              <Badge variant="success" className="px-3 py-1 text-sm">{t('campaigns.detail.normal')}</Badge>
            )}
            {canDelete && selectedReports.length === 0 && (
              <button
                onClick={() => requestDelete([selectedListing.id])}
                disabled={deleting}
                className="flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
                {deleting ? '...' : 'Delete'}
              </button>
            )}
          </div>
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

            {/* Suspect Reasons */}
            {selectedListing.is_suspect && selectedListing.suspect_reasons.length > 0 && (
              <div className="rounded-xl border border-st-danger-text/15 bg-gradient-to-r from-st-danger-bg/60 to-st-danger-bg/30 p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <FileWarning className="h-4 w-4 text-st-danger-text" />
                  <p className="text-xs font-semibold text-st-danger-text tracking-wide uppercase">Flagged Reasons</p>
                </div>
                <div className="space-y-2">
                  {selectedListing.suspect_reasons.map((reason, i) => {
                    const [category, keyword] = reason.split(':')
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 rounded-lg bg-surface-card/60 px-3 py-2 border border-st-danger-text/10"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-st-danger-text" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-th-text">
                            {REASON_LABELS[category] ?? category}
                          </p>
                          {keyword && (
                            <p className="text-[11px] text-th-text-muted mt-0.5">
                              Matched: <span className="font-mono text-st-danger-text">{keyword.trim()}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Page Screenshot */}
            {screenshotUrl && (
              <div>
                <p className="mb-2 text-xs font-medium text-th-text-tertiary">Page Screenshot</p>
                <button
                  onClick={() => setShowScreenshot(true)}
                  className="group w-full overflow-hidden rounded-lg border border-th-border bg-th-bg-secondary"
                >
                  <img
                    src={screenshotUrl}
                    alt="Page screenshot"
                    className="min-h-[280px] w-full object-contain transition-transform group-hover:scale-[1.02]"
                  />
                </button>
              </div>
            )}

            {/* Screenshot Lightbox */}
            {showScreenshot && screenshotUrl && (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                onClick={() => setShowScreenshot(false)}
              >
                <button
                  onClick={() => setShowScreenshot(false)}
                  className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                >
                  <X className="h-5 w-5" />
                </button>
                <img
                  src={screenshotUrl}
                  alt="Page screenshot"
                  className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

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
                    <Link href={`/reports?new=1&asin=${selectedListing.asin}&marketplace=${campaign.marketplace}`}>
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
                      href={`/reports?new=1&asin=${selectedListing.asin}&marketplace=${campaign.marketplace}`}
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
                      <StatusBadge status={report.status as ReportStatus} type="report" size="md" />
                      <span className="text-xs text-th-text-muted">
                        {new Date(report.created_at).toLocaleDateString('en-CA')}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <ViolationBadge code={report.br_form_type ?? report.user_violation_type} size="md" />
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
                    {report.pd_case_id && (
                      <p className="mt-1 text-xs text-th-text-muted">
                        PD Case: {report.pd_case_id}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteTargetIds.length > 0}
        onClose={() => setDeleteTargetIds([])}
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-th-text">Delete Listings</h3>
          <p className="mt-2 text-sm text-th-text-muted">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-th-text">{deleteTargetIds.length}</span>{' '}
            listing{deleteTargetIds.length > 1 ? 's' : ''}?
            This action cannot be undone.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setDeleteTargetIds([])}
              className="flex-1 rounded-xl border border-th-border px-4 py-2.5 text-sm font-medium text-th-text transition-colors hover:bg-th-bg-hover"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
