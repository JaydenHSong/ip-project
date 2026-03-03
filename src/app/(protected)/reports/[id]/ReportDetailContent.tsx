'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { ReportActions } from './ReportActions'
import { ReportTimeline } from './ReportTimeline'
import { SnapshotViewer } from './SnapshotViewer'
import { TemplatePanel } from './TemplatePanel'
import { AiAnalysisTab } from '@/components/features/AiAnalysisTab'
import type { ViolationCode } from '@/constants/violations'
import type { ReportStatus, TimelineEvent } from '@/types/reports'
import type { ReportSnapshot } from '@/types/monitoring'

type ReportDetailContentProps = {
  report: {
    id: string
    status: string
    user_violation_type: string
    ai_violation_type: string | null
    ai_confidence_score: number | null
    ai_severity: string | null
    ai_analysis: {
      violation_detected: boolean
      confidence: number
      reasons: string[]
      evidence: { type: string; location: string; description: string }[]
    } | null
    policy_references: string[]
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
  listing: {
    asin: string
    title: string
    marketplace: string
    seller_name: string | null
    brand: string | null
    rating: number | null
    review_count: number | null
    price_amount: number | null
    price_currency: string
  } | null
  creatorName: string | null
  canEdit: boolean
  userRole: string
  timeline: TimelineEvent[]
  snapshots?: ReportSnapshot[]
  monitoringStartedAt?: string | null
}

export const ReportDetailContent = ({ report, listing, creatorName, canEdit, userRole, timeline, snapshots, monitoringStartedAt }: ReportDetailContentProps) => {
  const { t } = useI18n()
  const router = useRouter()

  const isDraftEditable = canEdit && (report.status === 'draft' || report.status === 'pending_review')

  const [editTitle, setEditTitle] = useState(report.draft_title ?? '')
  const [editBody, setEditBody] = useState(report.draft_body ?? '')
  const [saving, setSaving] = useState(false)
  const [showTemplatePanel, setShowTemplatePanel] = useState(false)
  const [capturing, setCapturing] = useState(false)

  const handleCaptureScreenshot = async () => {
    if (!listing) return
    setCapturing(true)
    try {
      const res = await fetch(`/api/reports/${report.id}/screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin: listing.asin, marketplace: listing.marketplace }),
      })
      if (!res.ok) throw new Error('Capture failed')
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setCapturing(false)
    }
  }

  const hasChanges = editTitle !== (report.draft_title ?? '') || editBody !== (report.draft_body ?? '')

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_title: editTitle,
          draft_body: editBody,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Save failed')
      }
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with back, title, status, and actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/reports" className="text-th-text-muted hover:text-th-text-secondary">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-th-text">{t('reports.detail.title')}</h1>
        <StatusBadge status={report.status as ReportStatus} type="report" />
        {isDraftEditable && (
          <span className="rounded-full bg-th-accent-soft px-2 py-0.5 text-xs font-medium text-th-accent-text">
            {t('reports.detail.editing')}
          </span>
        )}
        <div className="ml-auto">
          <ReportActions reportId={report.id} status={report.status} userRole={userRole} scCaseId={report.sc_case_id} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-th-text">{t('reports.detail.violationInfo')}</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-th-text-tertiary">{t('reports.detail.userViolationType')}</p>
              <div className="mt-1">
                <ViolationBadge code={report.user_violation_type as ViolationCode} />
              </div>
            </div>
            {report.ai_violation_type && (
              <div>
                <p className="text-sm text-th-text-tertiary">{t('reports.detail.aiViolationType')}</p>
                <div className="mt-1 flex items-center gap-2">
                  <ViolationBadge code={report.ai_violation_type as ViolationCode} />
                  {report.ai_confidence_score !== null && (
                    <span className="text-sm text-th-text-muted">{report.ai_confidence_score}%</span>
                  )}
                </div>
              </div>
            )}
          </div>
          {report.disagreement_flag && (
            <div className="rounded-lg border border-st-warning-text/30 bg-st-warning-bg px-4 py-3">
              <p className="text-sm font-medium text-st-warning-text">
                {t('reports.detail.disagreementWarning')}
              </p>
            </div>
          )}
          {report.confirmed_violation_type && (
            <div>
              <p className="text-sm text-th-text-tertiary">{t('reports.detail.confirmedViolationType')}</p>
              <div className="mt-1">
                <ViolationBadge code={report.confirmed_violation_type as ViolationCode} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Section */}
      {(report.ai_analysis || report.ai_violation_type) && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-th-text">AI Analysis</h2>
          </CardHeader>
          <CardContent>
            <AiAnalysisTab
              aiAnalysis={report.ai_analysis}
              aiViolationType={report.ai_violation_type}
              aiSeverity={report.ai_severity}
              aiConfidenceScore={report.ai_confidence_score}
              userViolationType={report.user_violation_type}
              disagreementFlag={report.disagreement_flag}
              policyReferences={report.policy_references ?? []}
            />
          </CardContent>
        </Card>
      )}

      {listing && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-th-text">{t('reports.detail.listing')}</h2>
              <Button
                variant="outline"
                size="sm"
                loading={capturing}
                onClick={handleCaptureScreenshot}
              >
                {t('reports.detail.captureScreenshot')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-th-text-tertiary">ASIN</dt>
                <dd className="mt-1 text-sm font-medium text-th-text">{listing.asin}</dd>
              </div>
              <div>
                <dt className="text-sm text-th-text-tertiary">{t('reports.detail.marketplace')}</dt>
                <dd className="mt-1 text-sm font-medium text-th-text">{listing.marketplace}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm text-th-text-tertiary">{t('reports.title')}</dt>
                <dd className="mt-1 text-sm font-medium text-th-text">{listing.title}</dd>
              </div>
              {listing.seller_name && (
                <div>
                  <dt className="text-sm text-th-text-tertiary">{t('reports.seller')}</dt>
                  <dd className="mt-1 text-sm font-medium text-th-text">{listing.seller_name}</dd>
                </div>
              )}
              {listing.brand && (
                <div>
                  <dt className="text-sm text-th-text-tertiary">{t('reports.detail.brand')}</dt>
                  <dd className="mt-1 text-sm font-medium text-th-text">{listing.brand}</dd>
                </div>
              )}
              {listing.rating != null && (
                <div>
                  <dt className="text-sm text-th-text-tertiary">{t('reports.detail.rating')}</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-th-text">
                    <svg className="h-4 w-4 fill-yellow-400 text-yellow-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {listing.rating.toFixed(1)}
                    {listing.review_count != null && (
                      <span className="text-th-text-muted">({listing.review_count.toLocaleString()})</span>
                    )}
                  </dd>
                </div>
              )}
              {listing.price_amount != null && (
                <div>
                  <dt className="text-sm text-th-text-tertiary">{t('reports.detail.price')}</dt>
                  <dd className="mt-1 text-sm font-medium text-th-text">
                    {listing.price_currency === 'JPY' ? '¥' : '$'}{listing.price_amount.toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {(report.draft_title || isDraftEditable) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-th-text">{t('reports.detail.reportDraft')}</h2>
              {isDraftEditable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplatePanel(true)}
                >
                  {t('reports.detail.applyTemplate')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isDraftEditable ? (
              <>
                <Input
                  label={t('reports.detail.draftTitle')}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <Textarea
                  label={t('reports.detail.draftBody')}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={8}
                />
                {hasChanges && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      loading={saving}
                      onClick={handleSave}
                    >
                      {t('reports.detail.saveChanges')}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-th-text-tertiary">{t('reports.detail.draftTitle')}</p>
                  <p className="mt-1 text-sm font-medium text-th-text">{report.draft_title}</p>
                </div>
                {report.draft_body && (
                  <div>
                    <p className="text-sm text-th-text-tertiary">{t('reports.detail.draftBody')}</p>
                    <div className="mt-1 rounded-lg bg-th-bg-tertiary p-4 text-sm text-th-text-secondary whitespace-pre-wrap">
                      {report.draft_body}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monitoring Snapshots (only show for monitoring/resolved/unresolved) */}
      {snapshots && snapshots.length > 0 && ['monitoring', 'resolved', 'unresolved'].includes(report.status) && (
        <SnapshotViewer
          initialSnapshot={snapshots.find((s) => s.snapshot_type === 'initial') ?? null}
          followupSnapshots={snapshots.filter((s) => s.snapshot_type === 'followup')}
        />
      )}

      {/* Monitoring Info */}
      {monitoringStartedAt && ['monitoring', 'resolved', 'unresolved'].includes(report.status) && (
        <div className="flex items-center gap-3 text-sm text-th-text-muted">
          <span>
            {t('reports.monitoring.daysMonitored' as Parameters<typeof t>[0]).replace('{days}', String(
              Math.floor((Date.now() - new Date(monitoringStartedAt).getTime()) / (1000 * 60 * 60 * 24))
            ))}
          </span>
          {snapshots && (
            <span>
              {t('reports.monitoring.snapshotCount' as Parameters<typeof t>[0]).replace('{count}', String(snapshots.length))}
            </span>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-th-text">{t('reports.timeline.title' as Parameters<typeof t>[0])}</h2>
        </CardHeader>
        <CardContent>
          <ReportTimeline events={timeline} />
        </CardContent>
      </Card>

      {isDraftEditable && (
        <TemplatePanel
          open={showTemplatePanel}
          onClose={() => setShowTemplatePanel(false)}
          onApply={(body, _title) => {
            setEditBody(body)
          }}
          listing={listing ?? {}}
          report={report}
          currentViolationType={report.user_violation_type}
        />
      )}
    </div>
  )
}
