'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { BackButton } from '@/components/ui/BackButton'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { ReportActions } from './ReportActions'
import { ReportTimeline } from './ReportTimeline'
import { SnapshotViewer } from './SnapshotViewer'
import { InlineTemplateList } from './InlineTemplateList'
import { AiAnalysisTab } from '@/components/features/AiAnalysisTab'
import { CaseThread } from '@/components/features/case-thread/CaseThread'
import { CaseActivityLog } from '@/components/features/case-thread/CaseActivityLog'
import { SlaBadge } from '@/components/ui/SlaBadge'
import { CaseChain } from '@/components/features/CaseChain'
import { RelatedReports } from '@/components/features/RelatedReports'
import type { ViolationCode } from '@/constants/violations'
import type { ReportStatus, TimelineEvent } from '@/types/reports'
import type { BrCaseStatus } from '@/types/br-case'
import { useToast } from '@/hooks/useToast'
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
    sc_submission_error: string | null
    sc_submit_attempts: number
    sc_submit_data: { sc_rav_url?: string; asin?: string; marketplace?: string } | null
    resubmit_count: number
    resubmit_interval_days: number | null
    next_resubmit_at: string | null
    screenshot_url: string | null
    related_asins: { asin: string; marketplace?: string; url?: string }[]
    created_at: string
    approved_at: string | null
    rejected_at: string | null
    created_by?: string
    br_case_id?: string | null
    br_case_status?: string | null
    br_last_amazon_reply_at?: string | null
    br_last_our_reply_at?: string | null
    br_submitted_at?: string | null
    br_sla_deadline_at?: string | null
    br_reply_pending_text?: string | null
    parent_report_id?: string | null
    escalation_level?: number | null
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
  currentUserId?: string
  timeline: TimelineEvent[]
  snapshots?: ReportSnapshot[]
  monitoringStartedAt?: string | null
}

import { getAmazonUrl } from '@/lib/utils/amazon-url'

export const ReportDetailContent = ({ report, listing, creatorName, canEdit, userRole, currentUserId, timeline, snapshots, monitoringStartedAt }: ReportDetailContentProps) => {
  const { t } = useI18n()
  const { addToast } = useToast()
  const router = useRouter()

  const isDraftEditable = canEdit && (report.status === 'draft' || report.status === 'pending_review')

  const [editTitle, setEditTitle] = useState(report.draft_title ?? '')
  const [editBody, setEditBody] = useState(report.draft_body ?? '')
  const [draftTab, setDraftTab] = useState<'edit' | 'templates'>('edit')
  const [aiWriting, setAiWriting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [suggestedTemplate, setSuggestedTemplate] = useState<{ id: string; title: string; body: string } | null>(null)
  const [templateDismissed, setTemplateDismissed] = useState(false)
  const [resubmitIntervalLocal, setResubmitIntervalLocal] = useState<string>(
    report.resubmit_interval_days != null ? String(report.resubmit_interval_days) : 'default'
  )
  const [savingInterval, setSavingInterval] = useState(false)
  const [caseThreadTab, setCaseThreadTab] = useState<'thread' | 'activity'>('thread')
  const [relatedData, setRelatedData] = useState<{
    parent_chain: Array<{ id: string; status: string; br_case_status: string | null; escalation_level: number | null; created_at: string; user_violation_type: string }>
    children: Array<{ id: string; status: string; br_case_status: string | null; escalation_level: number | null; created_at: string; user_violation_type: string }>
    same_listing: Array<{ id: string; status: string; br_case_id: string | null; br_case_status: string | null; created_at: string; user_violation_type: string; listings: { asin: string; title: string } | null }>
  } | null>(null)

  // Fetch related reports data
  useEffect(() => {
    fetch(`/api/reports/${report.id}/related`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setRelatedData(data) })
      .catch(() => {})
  }, [report.id])

  // Issue #9: Sync state when report.draft_title/draft_body changes (e.g. after rewrite)
  useEffect(() => {
    setEditTitle(report.draft_title ?? '')
    setEditBody(report.draft_body ?? '')
  }, [report.draft_title, report.draft_body])

  // Sprint 3-6: Template auto-suggestion for draft + empty body
  useEffect(() => {
    if (report.status !== 'draft' || report.draft_body || templateDismissed) return
    fetch('/api/templates')
      .then((res) => res.json())
      .then((templates: { id: string; title: string; body: string; violation_types: string[]; is_default: boolean }[]) => {
        const match = templates.find((t) =>
          t.violation_types.includes(report.user_violation_type) || t.is_default
        )
        if (match) setSuggestedTemplate({ id: match.id, title: match.title, body: match.body })
      })
      .catch(() => {})
  }, [report.status, report.draft_body, report.user_violation_type, templateDismissed])

  const handleSubmit = async () => {
    setApproving(true)
    try {
      const res = await fetch(`/api/reports/${report.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(hasChanges ? { edited_draft_title: editTitle, edited_draft_body: editBody } : {}),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Submit failed')
      }
      router.refresh()
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setApproving(false)
    }
  }

  const handleAiWrite = async () => {
    setAiWriting(true)
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: report.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'AI Write failed')
      }
      router.refresh()
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setAiWriting(false)
    }
  }

  const handleResubmitIntervalChange = async (value: string) => {
    setResubmitIntervalLocal(value)
    setSavingInterval(true)
    try {
      const interval = value === 'default' ? null : Number(value)
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resubmit_interval_days: interval }),
      })
      if (!res.ok) throw new Error('Failed to update interval')
    } catch {
      setResubmitIntervalLocal(report.resubmit_interval_days != null ? String(report.resubmit_interval_days) : 'default')
    } finally {
      setSavingInterval(false)
    }
  }

  const hasChanges = editTitle !== (report.draft_title ?? '') || editBody !== (report.draft_body ?? '')
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef({ title: report.draft_title ?? '', body: report.draft_body ?? '' })

  const autoSave = useCallback(async (title: string, body: string) => {
    if (title === lastSavedRef.current.title && body === lastSavedRef.current.body) return
    setAutoSaveStatus('saving')
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_title: title, draft_body: body }),
      })
      if (res.ok) {
        lastSavedRef.current = { title, body }
        setAutoSaveStatus('saved')
        setTimeout(() => setAutoSaveStatus('idle'), 2000)
      }
    } catch {
      setAutoSaveStatus('idle')
    }
  }, [report.id])

  // Debounced autosave — 1.5s after last keystroke
  useEffect(() => {
    if (!isDraftEditable) return
    if (editTitle === lastSavedRef.current.title && editBody === lastSavedRef.current.body) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => autoSave(editTitle, editBody), 1500)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [editTitle, editBody, isDraftEditable, autoSave])

  return (
    <div className="space-y-6">
      {/* Header with back, title, status, and actions */}
      <div className="flex flex-wrap items-center gap-3">
        <BackButton href="/reports" />
        <h1 className="text-2xl font-bold text-th-text">{t('reports.detail.title')}</h1>
        <StatusBadge status={report.status as ReportStatus} type="report" size="md" />
        {isDraftEditable && (
          <span className="rounded-full bg-th-accent-soft px-2 py-0.5 text-xs font-medium text-th-accent-text">
            {t('reports.detail.editing')}
          </span>
        )}
        <div className="ml-auto">
          <ReportActions
              reportId={report.id}
              status={report.status}
              userRole={userRole}
              createdBy={report.created_by}
              currentUserId={currentUserId}
              scCaseId={report.sc_case_id}
              scSubmissionError={report.sc_submission_error}
              scSubmitAttempts={report.sc_submit_attempts}
              resubmitCount={report.resubmit_count}
              nextResubmitAt={report.next_resubmit_at}
            />
        </div>
      </div>

      {/* SC Submitting Banner */}
      {report.status === 'sc_submitting' && (
        <div className="overflow-hidden rounded-xl border border-th-accent/30 bg-th-accent-soft">
          <div className="h-1 w-full overflow-hidden bg-th-accent/20">
            <div className="h-full w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-th-accent" />
          </div>
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-th-accent/20">
                <svg className="h-5 w-5 animate-spin text-th-accent" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-th-text">SC 신고 대기 중</p>
                <p className="mt-0.5 text-xs text-th-text-secondary">
                  Seller Central에서 신고를 제출하세요. Extension이 자동으로 폼을 채워줍니다.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={report.sc_submit_data?.sc_rav_url ?? `https://sellercentral.amazon.com/abuse-submission/report-abuse${listing ? `?asin=${listing.asin}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-th-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-th-accent-hover"
              >
                SC 신고 열기 ↗
              </a>
              <Button
                variant="outline"
                size="sm"
                loading={approving}
                onClick={async () => {
                  setApproving(true)
                  try {
                    const res = await fetch(`/api/reports/${report.id}/confirm-submitted`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({}),
                    })
                    if (!res.ok) {
                      const err = await res.json()
                      throw new Error(err.error?.message ?? 'Confirm failed')
                    }
                    router.refresh()
                  } catch (e) {
                    addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
                  } finally {
                    setApproving(false)
                  }
                }}
              >
                제출 완료
              </Button>
              <Button
                variant="ghost"
                size="sm"
                loading={stopping}
                className="text-st-danger-text hover:bg-st-danger-bg"
                onClick={async () => {
                  setStopping(true)
                  try {
                    const res = await fetch(`/api/reports/${report.id}/cancel-submit`, {
                      method: 'POST',
                    })
                    if (!res.ok) {
                      const err = await res.json()
                      throw new Error(err.error?.message ?? 'Cancel failed')
                    }
                    router.refresh()
                  } catch (e) {
                    addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
                  } finally {
                    setStopping(false)
                  }
                }}
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* BR Submitting Banner */}
      {report.status === 'br_submitting' && (
        <div className="overflow-hidden rounded-xl border border-sky-500/30 bg-sky-50 dark:bg-sky-950/30">
          <div className="h-1 w-full overflow-hidden bg-sky-500/20">
            <div className="h-full w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-sky-500" />
          </div>
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/20">
                <svg className="h-5 w-5 animate-spin text-sky-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-th-text">BR 신고 제출 중</p>
                <p className="mt-0.5 text-xs text-th-text-secondary">
                  Brand Registry에 자동으로 신고를 제출하고 있습니다.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              loading={stopping}
              className="text-st-danger-text hover:bg-st-danger-bg"
              onClick={async () => {
                setStopping(true)
                try {
                  const res = await fetch(`/api/reports/${report.id}/cancel-submit`, {
                    method: 'POST',
                  })
                  if (!res.ok) {
                    const err = await res.json()
                    throw new Error(err.error?.message ?? 'Cancel failed')
                  }
                  router.refresh()
                } catch (e) {
                  addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
                } finally {
                  setStopping(false)
                }
              }}
            >
              취소
            </Button>
          </div>
        </div>
      )}

      {/* Submitted Success Banner */}
      {report.status === 'submitted' && (
        <div className="flex items-center gap-4 rounded-xl border border-st-success-text/30 bg-st-success-bg px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-st-success-text/20">
            <svg className="h-5 w-5 text-st-success-text" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-th-text">SC 제출 완료</p>
            <p className="mt-0.5 text-xs text-th-text-secondary">
              Seller Central에 성공적으로 신고되었습니다.
              {report.sc_case_id && <span className="ml-1 font-medium">Case ID: {report.sc_case_id}</span>}
            </p>
          </div>
        </div>
      )}

      {/* BR Case Info */}
      {report.br_case_id && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-th-text">BR Case</h2>
              {report.br_case_status && (
                <StatusBadge status={report.br_case_status as BrCaseStatus} type="br_case" size="md" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-th-text-tertiary">Case ID</dt>
                <dd className="mt-1 font-mono text-sm font-medium text-th-text">{report.br_case_id}</dd>
              </div>
              {report.br_sla_deadline_at && (
                <div>
                  <dt className="text-sm text-th-text-tertiary">SLA</dt>
                  <dd className="mt-1">
                    <SlaBadge
                      deadline={report.br_sla_deadline_at}
                      paused={['open', 'work_in_progress', 'answered'].includes(report.br_case_status ?? '')}
                    />
                  </dd>
                </div>
              )}
              {report.br_submitted_at && (
                <div>
                  <dt className="text-sm text-th-text-tertiary">Submitted</dt>
                  <dd className="mt-1 text-sm text-th-text">{new Date(report.br_submitted_at).toLocaleString()}</dd>
                </div>
              )}
              {report.br_last_amazon_reply_at && (
                <div>
                  <dt className="text-sm text-th-text-tertiary">Last Amazon Reply</dt>
                  <dd className="mt-1 text-sm text-th-text">{new Date(report.br_last_amazon_reply_at).toLocaleString()}</dd>
                </div>
              )}
              {report.br_last_our_reply_at && (
                <div>
                  <dt className="text-sm text-th-text-tertiary">Last Our Reply</dt>
                  <dd className="mt-1 text-sm text-th-text">{new Date(report.br_last_our_reply_at).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Case Chain (R07) */}
      {relatedData && (relatedData.parent_chain.length > 0 || relatedData.children.length > 0) && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-th-text">Case Chain</h2>
          </CardHeader>
          <CardContent>
            <CaseChain
              currentId={report.id}
              parentChain={relatedData.parent_chain}
              children={relatedData.children}
            />
          </CardContent>
        </Card>
      )}

      {/* Related Reports (R07) */}
      {relatedData && relatedData.same_listing.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <RelatedReports reports={relatedData.same_listing} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-th-text">{t('reports.detail.violationInfo')}</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-th-text-tertiary">{t('reports.detail.userViolationType')}</p>
              <div className="mt-1">
                <ViolationBadge code={report.user_violation_type as ViolationCode} size="md" />
              </div>
            </div>
            {report.ai_violation_type && (
              <div>
                <p className="text-sm text-th-text-tertiary">{t('reports.detail.aiViolationType')}</p>
                <div className="mt-1 flex items-center gap-2">
                  <ViolationBadge code={report.ai_violation_type as ViolationCode} size="md" />
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
                <ViolationBadge code={report.confirmed_violation_type as ViolationCode} size="md" />
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
            <h2 className="font-semibold text-th-text">{t('reports.detail.listing')}</h2>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-th-text-tertiary">ASIN</dt>
                <dd className="mt-1 text-sm font-medium">
                  <a
                    href={getAmazonUrl(listing.asin, listing.marketplace)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-th-accent-text hover:underline"
                  >
                    {listing.asin} ↗
                  </a>
                </dd>
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
            {/* Related ASINs */}
            {report.related_asins && report.related_asins.length > 0 && (
              <div className="mt-4 border-t border-th-border pt-4">
                <p className="text-sm font-medium text-th-text-secondary">
                  Related ASINs ({report.related_asins.length})
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {report.related_asins.map((ra, idx) => (
                    <a
                      key={idx}
                      href={getAmazonUrl(ra.asin, ra.marketplace ?? listing.marketplace)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg border border-th-border bg-th-bg-tertiary px-2.5 py-1 font-mono text-xs text-th-accent-text hover:bg-th-accent-soft"
                    >
                      {ra.asin} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Screenshot (Issue #6) */}
      {report.screenshot_url ? (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-th-text">{t('reports.detail.screenshots')}</h2>
          </CardHeader>
          <CardContent>
            <img
              src={report.screenshot_url}
              alt="Listing screenshot"
              className="w-full rounded-lg border border-th-border"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="text-sm text-th-text-muted">
          No screenshot — captured from extension only.
        </div>
      )}

      {/* Template auto-suggestion banner */}
      {suggestedTemplate && !templateDismissed && isDraftEditable && !editBody && (
        <div className="flex items-center gap-3 rounded-lg border border-th-accent/30 bg-th-accent/5 px-4 py-3">
          <span className="flex-1 text-sm text-th-text">
            {t('reports.detail.templateSuggestion' as Parameters<typeof t>[0]).replace('{name}', suggestedTemplate.title)}
          </span>
          <Button
            size="sm"
            onClick={() => {
              setEditBody(suggestedTemplate.body)
              setEditTitle(suggestedTemplate.title)
              setSuggestedTemplate(null)
            }}
          >
            {t('reports.detail.templateApply' as Parameters<typeof t>[0])}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTemplateDismissed(true)}
          >
            {t('reports.detail.templateDismiss' as Parameters<typeof t>[0])}
          </Button>
        </div>
      )}

      {(report.draft_title || isDraftEditable) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              {isDraftEditable ? (
                <div className="flex items-center gap-1 rounded-lg bg-th-bg-secondary p-0.5">
                  <button
                    onClick={() => setDraftTab('edit')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      draftTab === 'edit'
                        ? 'bg-surface-card text-th-text shadow-sm'
                        : 'text-th-text-muted hover:text-th-text-secondary'
                    }`}
                  >
                    {t('reports.detail.reportDraft')}
                  </button>
                  <button
                    onClick={() => setDraftTab('templates')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      draftTab === 'templates'
                        ? 'bg-surface-card text-th-text shadow-sm'
                        : 'text-th-text-muted hover:text-th-text-secondary'
                    }`}
                  >
                    Templates
                  </button>
                </div>
              ) : (
                <h2 className="font-semibold text-th-text">{t('reports.detail.reportDraft')}</h2>
              )}
              {isDraftEditable && draftTab === 'edit' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    loading={aiWriting}
                    onClick={handleAiWrite}
                  >
                    AI Write
                  </Button>
                  {canEdit && (
                    <Button
                      size="sm"
                      loading={approving}
                      onClick={handleSubmit}
                    >
                      {t('reports.detail.submitReview')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isDraftEditable && draftTab === 'templates' ? (
              <InlineTemplateList
                listing={listing ?? {}}
                report={report}
                currentViolationType={report.user_violation_type}
                onApply={(body, title) => {
                  setEditBody(body)
                  if (title) setEditTitle(title)
                  setDraftTab('edit')
                }}
              />
            ) : isDraftEditable ? (
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
                {autoSaveStatus !== 'idle' && (
                  <div className="flex justify-end">
                    <span className="inline-flex items-center gap-1 rounded-md border border-th-border bg-th-bg-tertiary px-2 py-0.5 text-xs text-th-text-secondary">
                      {autoSaveStatus === 'saving' ? (
                        <>
                          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Saving...
                        </>
                      ) : '✓ Saved'}
                    </span>
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

      {/* Monitoring Info + Resubmit Interval */}
      {monitoringStartedAt && ['monitoring', 'resolved', 'unresolved'].includes(report.status) && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-th-text-muted">
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
          {/* Case-specific resubmit interval dropdown */}
          {canEdit && ['monitoring', 'unresolved'].includes(report.status) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-th-text-tertiary">
                {t('reports.detail.resubmitInterval' as Parameters<typeof t>[0])}:
              </span>
              <select
                value={resubmitIntervalLocal}
                onChange={(e) => handleResubmitIntervalChange(e.target.value)}
                disabled={savingInterval}
                className="rounded-md border border-th-border bg-th-bg-secondary px-2 py-1 text-xs text-th-text focus:border-th-accent focus:outline-none"
              >
                <option value="default">{t('reports.detail.resubmitIntervalDefault' as Parameters<typeof t>[0])}</option>
                {[3, 5, 7, 14, 30].map((d) => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
              {savingInterval && (
                <svg className="h-3 w-3 animate-spin text-th-text-muted" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
          )}
        </div>
      )}

      {/* Case Thread (R03) + Activity Log (R05) */}
      {report.br_case_id && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1 rounded-lg bg-th-bg-secondary p-0.5">
              <button
                onClick={() => setCaseThreadTab('thread')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  caseThreadTab === 'thread'
                    ? 'bg-surface-card text-th-text shadow-sm'
                    : 'text-th-text-muted hover:text-th-text-secondary'
                }`}
              >
                Case Thread
              </button>
              <button
                onClick={() => setCaseThreadTab('activity')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  caseThreadTab === 'activity'
                    ? 'bg-surface-card text-th-text shadow-sm'
                    : 'text-th-text-muted hover:text-th-text-secondary'
                }`}
              >
                Activity Log
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {caseThreadTab === 'thread' ? (
              <CaseThread
                reportId={report.id}
                currentUserId={currentUserId}
                canEdit={canEdit}
                hasPendingReply={!!report.br_reply_pending_text}
                brCaseStatus={report.br_case_status}
                onCaseChanged={() => router.refresh()}
              />
            ) : (
              <CaseActivityLog reportId={report.id} />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-th-text">{t('reports.timeline.title' as Parameters<typeof t>[0])}</h2>
        </CardHeader>
        <CardContent>
          <ReportTimeline events={timeline} />
        </CardContent>
      </Card>

    </div>
  )
}
