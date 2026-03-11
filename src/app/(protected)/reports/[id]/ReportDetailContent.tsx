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
import { BrTemplateList } from './BrTemplateList'
import { isBrReportable, getBrFormType, BR_FORM_OPTIONS, BR_FORM_DESCRIPTION_GUIDE, BR_FORM_FIELD_CONTEXT } from '@/lib/reports/br-data'
import type { BrFormType } from '@/types/reports'
import { AiAnalysisTab } from '@/components/features/AiAnalysisTab'
import { CaseThread } from '@/components/features/case-thread/CaseThread'
import { CaseActivityLog } from '@/components/features/case-thread/CaseActivityLog'
import { SlaBadge } from '@/components/ui/SlaBadge'
import { CaseChain } from '@/components/features/CaseChain'
import { RelatedReports } from '@/components/features/RelatedReports'
import { VIOLATION_CATEGORIES } from '@/constants/violations'
import type { ViolationCode, ViolationCategory } from '@/constants/violations'
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
    draft_subject: string | null
    draft_body: string | null
    rejection_reason: string | null
    pd_case_id: string | null
    pd_submission_error: string | null
    pd_submit_attempts: number
    pd_submit_data: { pd_rav_url?: string; asin?: string; marketplace?: string } | null
    violation_category: string | null
    note: string | null
    resubmit_count: number
    resubmit_interval_days: number | null
    next_resubmit_at: string | null
    screenshot_url: string | null
    screenshots: { url: string; captured_at: string; source?: string }[]
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
    pd_followup_interval_days?: number | null
    admin_memo?: string | null
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
  embedded?: boolean
  onNavigate?: (reportId: string) => void
}

import { getAmazonUrl } from '@/lib/utils/amazon-url'

export const ReportDetailContent = ({ report, listing, creatorName, canEdit, userRole, currentUserId, timeline, snapshots, monitoringStartedAt, embedded, onNavigate }: ReportDetailContentProps) => {
  const { t } = useI18n()
  const { addToast } = useToast()
  const router = useRouter()

  const isDraftEditable = canEdit && (report.status === 'draft' || report.status === 'pending_review')

  const [editTitle, setEditTitle] = useState(report.draft_title ?? '')
  const [editSubject, setEditSubject] = useState(report.draft_subject ?? '')
  const [editBody, setEditBody] = useState(report.draft_body ?? '')
  const [draftTab, setDraftTab] = useState<'edit' | 'templates'>('edit')
  const [aiWriting, setAiWriting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [suggestedTemplate, setSuggestedTemplate] = useState<{ id: string; title: string; body: string } | null>(null)
  const [templateDismissed, setTemplateDismissed] = useState(false)
  const showBrFormType = isDraftEditable && isBrReportable(report.user_violation_type)
  const [brFormType, setBrFormType] = useState<BrFormType>(
    getBrFormType(report.user_violation_type) ?? 'other_policy'
  )
  const [brFields, setBrFields] = useState({
    product_urls: listing?.asin ? `https://www.amazon.com/dp/${listing.asin}` : '',
    seller_storefront_url: '',
    policy_url: '',
    asins: listing?.asin ?? '',
    order_id: '',
  })
  const [brFieldsExpanded, setBrFieldsExpanded] = useState(false)
  const [aiPreview, setAiPreview] = useState<{ draft_title: string; draft_body: string } | null>(null)
  const [resubmitIntervalLocal, setResubmitIntervalLocal] = useState<string>(
    report.resubmit_interval_days != null ? String(report.resubmit_interval_days) : 'default'
  )
  const [savingInterval, setSavingInterval] = useState(false)
  const [followupIntervalLocal, setFollowupIntervalLocal] = useState<string>(
    report.pd_followup_interval_days != null ? String(report.pd_followup_interval_days) : 'default'
  )
  const [savingFollowupInterval, setSavingFollowupInterval] = useState(false)
  const [caseThreadTab, setCaseThreadTab] = useState<'thread' | 'activity'>('thread')
  const [adminMemo, setAdminMemo] = useState(report.admin_memo ?? '')
  const [memoSaving, setMemoSaving] = useState(false)
  const [memoSaved, setMemoSaved] = useState(false)
  const memoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    setEditSubject(report.draft_subject ?? '')
    setEditBody(report.draft_body ?? '')
  }, [report.draft_title, report.draft_subject, report.draft_body])

  // Template auto-suggestion — br_templates 기반
  useEffect(() => {
    if (report.status !== 'draft' || report.draft_body || templateDismissed) return
    fetch(`/api/br-templates?form_type=${brFormType}`)
      .then((res) => res.json())
      .then((data: { templates: { id: string; title: string; body: string; code: string }[] }) => {
        const match = data.templates?.[0]
        if (match) setSuggestedTemplate({ id: match.id, title: match.title, body: match.body })
      })
      .catch(() => {})
  }, [report.status, report.draft_body, brFormType, templateDismissed])

  // Admin memo auto-save (debounce 1.5s)
  const saveMemo = useCallback(async (text: string) => {
    setMemoSaving(true)
    try {
      await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_memo: text || null }),
      })
      setMemoSaved(true)
      setTimeout(() => setMemoSaved(false), 2000)
    } catch { /* silent */ }
    finally { setMemoSaving(false) }
  }, [report.id])

  const handleMemoChange = useCallback((value: string) => {
    setAdminMemo(value)
    if (memoTimerRef.current) clearTimeout(memoTimerRef.current)
    memoTimerRef.current = setTimeout(() => saveMemo(value), 1500)
  }, [saveMemo])

  const handleSubmit = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setApproving(true)
    try {
      const res = await fetch(`/api/reports/${report.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edited_draft_title: editTitle,
          edited_draft_subject: editSubject,
          edited_draft_body: editBody,
          ...(showBrFormType ? { br_form_type: brFormType } : {}),
          ...(showBrFormType ? {
            br_extra_fields: {
              ...(brFields.product_urls ? { product_urls: brFields.product_urls.split('\n').map((u: string) => u.trim()).filter(Boolean) } : {}),
              ...(brFields.seller_storefront_url ? { seller_storefront_url: brFields.seller_storefront_url } : {}),
              ...(brFields.policy_url ? { policy_url: brFields.policy_url } : {}),
              ...(brFields.asins ? { asins: brFields.asins.split(/[,;\n]/).map((a) => a.trim()).filter(Boolean) } : {}),
              ...(brFields.order_id ? { order_id: brFields.order_id } : {}),
            },
          } : {}),
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
        body: JSON.stringify({
          report_id: report.id,
          preview: true,
          ...(showBrFormType ? { br_form_type: brFormType } : {}),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'AI Write failed')
      }
      const data = await res.json()
      setAiPreview({ draft_title: data.draft_title, draft_body: data.draft_body })
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setAiWriting(false)
    }
  }

  const handleAiApply = () => {
    if (!aiPreview) return
    setEditTitle(aiPreview.draft_title)
    setEditBody(aiPreview.draft_body)
    setAiPreview(null)
    addToast({ type: 'success', title: 'AI draft applied' })
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

  const handleFollowupIntervalChange = async (value: string) => {
    setFollowupIntervalLocal(value)
    setSavingFollowupInterval(true)
    try {
      const interval = value === 'default' ? null : Number(value)
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pd_followup_interval_days: interval }),
      })
      if (!res.ok) throw new Error('Failed to update followup interval')
    } catch {
      setFollowupIntervalLocal(report.pd_followup_interval_days != null ? String(report.pd_followup_interval_days) : 'default')
    } finally {
      setSavingFollowupInterval(false)
    }
  }

  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef({ title: report.draft_title ?? '', subject: report.draft_subject ?? '', body: report.draft_body ?? '' })

  const autoSave = useCallback(async (title: string, subject: string, body: string) => {
    if (title === lastSavedRef.current.title && subject === lastSavedRef.current.subject && body === lastSavedRef.current.body) return
    setAutoSaveStatus('saving')
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_title: title, draft_subject: subject, draft_body: body }),
      })
      if (res.ok) {
        lastSavedRef.current = { title, subject, body }
        setAutoSaveStatus('saved')
        setTimeout(() => setAutoSaveStatus('idle'), 2000)
      } else {
        setAutoSaveStatus('idle')
      }
    } catch {
      setAutoSaveStatus('idle')
    }
  }, [report.id])

  // Debounced autosave — 1.5s after last keystroke
  useEffect(() => {
    if (!isDraftEditable) return
    if (editTitle === lastSavedRef.current.title && editSubject === lastSavedRef.current.subject && editBody === lastSavedRef.current.body) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => autoSave(editTitle, editSubject, editBody), 1500)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [editTitle, editSubject, editBody, isDraftEditable, autoSave])

  // Screenshot capture via extension bgfetch
  const [capturing, setCapturing] = useState(false)
  const [screenshotList, setScreenshotList] = useState<{ url: string; captured_at: string; source?: string }[]>(
    report.screenshots ?? []
  )
  const [activeScreenshotIdx, setActiveScreenshotIdx] = useState(0)

  // Merge legacy screenshot_url into list if not already present
  useEffect(() => {
    const merged = [...(report.screenshots ?? [])]
    if (report.screenshot_url && !merged.some((s) => s.url === report.screenshot_url)) {
      merged.unshift({ url: report.screenshot_url, captured_at: report.created_at, source: 'extension' })
    }
    setScreenshotList(merged)
    setActiveScreenshotIdx(merged.length > 0 ? merged.length - 1 : 0)
  }, [report.screenshots, report.screenshot_url, report.created_at])

  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteScreenshot = async (idx: number) => {
    const target = screenshotList[idx]
    if (!target) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/reports/${report.id}/screenshot`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target.url }),
      })
      if (!res.ok) throw new Error('Delete failed')
      const data = await res.json() as { screenshots: { url: string; captured_at: string; source?: string }[] }
      setScreenshotList(data.screenshots)
      setActiveScreenshotIdx(Math.min(activeScreenshotIdx, Math.max(0, data.screenshots.length - 1)))
      addToast({ type: 'success', title: 'Screenshot deleted' })
    } catch {
      addToast({ type: 'error', title: 'Failed to delete screenshot' })
    } finally {
      setDeleting(false)
      setDeleteConfirmIdx(null)
    }
  }

  const handleCaptureScreenshot = async () => {
    if (!listing) return
    setCapturing(true)
    try {
      const res = await fetch(`/api/reports/${report.id}/screenshot`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Capture request failed')
      }
      const data = await res.json() as { queue_id: string; status: string }

      // Poll for completion
      const pollInterval = 3000
      const maxPolls = 20 // 60s max
      let polls = 0

      const poll = async (): Promise<void> => {
        polls++
        const pollRes = await fetch(`/api/reports/${report.id}/screenshot?queue_id=${data.queue_id}`)
        const pollData = await pollRes.json() as { status: string; screenshots?: { url: string; captured_at: string; source?: string }[]; screenshot_url?: string; error?: string }

        if (pollData.status === 'completed') {
          if (pollData.screenshots && pollData.screenshots.length > 0) {
            setScreenshotList(pollData.screenshots)
            setActiveScreenshotIdx(pollData.screenshots.length - 1)
            addToast({ type: 'success', title: t('reports.detail.captureScreenshot'), message: 'Screenshot captured successfully.' })
          } else {
            addToast({ type: 'error', title: t('reports.detail.captureScreenshot'), message: 'Capture completed but screenshot was not saved.' })
          }
          setCapturing(false)
          return
        }

        if (pollData.status === 'failed') {
          throw new Error(pollData.error ?? 'Capture failed')
        }

        if (polls >= maxPolls) {
          throw new Error('Capture timed out. Extension may not be active.')
        }

        await new Promise((r) => setTimeout(r, pollInterval))
        return poll()
      }

      await poll()
    } catch (e) {
      addToast({ type: 'error', title: 'Capture failed', message: e instanceof Error ? e.message : 'Unknown error' })
      setCapturing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with back, title, status, and actions */}
      {!embedded && (
        <div className="flex flex-wrap items-center gap-3">
          <BackButton href="/reports" />
          <h1 className="text-2xl font-bold text-th-text">{t('reports.detail.title')}</h1>
          <StatusBadge status={report.status as ReportStatus} type="report" size="md" />
          {report.status === 'submitted' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-st-success-bg px-2.5 py-0.5 text-xs font-medium text-st-success-text">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              PD Reported
            </span>
          )}
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
                pdCaseId={report.pd_case_id}
                pdSubmissionError={report.pd_submission_error}
                pdSubmitAttempts={report.pd_submit_attempts}
                resubmitCount={report.resubmit_count}
                nextResubmitAt={report.next_resubmit_at}
              />
          </div>
        </div>
      )}
      {embedded && (
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={report.status as ReportStatus} type="report" size="md" />
          {report.status === 'submitted' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-st-success-bg px-2.5 py-0.5 text-xs font-medium text-st-success-text">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              PD Reported
            </span>
          )}
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
                pdCaseId={report.pd_case_id}
                pdSubmissionError={report.pd_submission_error}
                pdSubmitAttempts={report.pd_submit_attempts}
                resubmitCount={report.resubmit_count}
                nextResubmitAt={report.next_resubmit_at}
              />
          </div>
        </div>
      )}

      {/* PD Reporting Banner */}
      {report.status === 'pd_submitting' && (
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
                <p className="text-sm font-semibold text-th-text">PD Reporting 대기 중</p>
                <p className="mt-0.5 text-xs text-th-text-secondary">
                  Product Detail 페이지에서 신고를 제출하세요. Extension이 자동으로 폼을 채워줍니다.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={report.pd_submit_data?.pd_rav_url ?? `https://sellercentral.amazon.com/abuse-submission/report-abuse${listing ? `?asin=${listing.asin}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-th-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-th-accent-hover"
              >
                PD Report 열기 ↗
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

      {/* Submitted Success — removed full banner, now inline tag in header */}

      {/* Case Management + Report Details — side-by-side on desktop */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Left: Case Management (BR Case + Related Reports) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-th-text">Case Management</h2>
              {report.br_case_status ? (
                <StatusBadge status={report.br_case_status as BrCaseStatus} type="br_case" size="md" />
              ) : (
                <span className="rounded-full bg-th-bg-secondary px-2.5 py-1 text-xs font-medium text-th-text-muted">Not submitted</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-0">
            {/* BR Case Info */}
            {report.br_case_status ? (
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-th-text-tertiary">Case ID</dt>
                  <dd className="mt-1 font-mono text-sm font-medium text-th-text">
                    {report.br_case_id && report.br_case_id !== 'submitted' ? (
                      <a
                        href={`https://brandregistry.amazon.com/cu/case-dashboard/view-case?caseID=${report.br_case_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-th-accent hover:underline"
                      >
                        {report.br_case_id}
                      </a>
                    ) : (
                      <span className="text-th-text-muted">Pending</span>
                    )}
                  </dd>
                </div>
                {report.br_sla_deadline_at && (
                  <div>
                    <dt className="text-xs text-th-text-tertiary">SLA</dt>
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
                    <dt className="text-xs text-th-text-tertiary">Submitted</dt>
                    <dd className="mt-1 text-sm text-th-text">{new Date(report.br_submitted_at).toLocaleString()}</dd>
                  </div>
                )}
                {report.br_last_amazon_reply_at && (
                  <div>
                    <dt className="text-xs text-th-text-tertiary">Last Amazon Reply</dt>
                    <dd className="mt-1 text-sm text-th-text">{new Date(report.br_last_amazon_reply_at).toLocaleString()}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-th-text-muted">BR case has not been submitted yet.</p>
            )}

            {/* Case Chain */}
            {relatedData && (relatedData.parent_chain.length > 0 || relatedData.children.length > 0) && (
              <div className="mt-4 border-t border-th-border pt-4">
                <h3 className="mb-2 text-xs font-semibold text-th-text-tertiary">Case Chain</h3>
                <CaseChain
                  currentId={report.id}
                  parentChain={relatedData.parent_chain}
                  children={relatedData.children}
                />
              </div>
            )}

            {/* Related Reports */}
            {relatedData && relatedData.same_listing.length > 0 && (
              <div className="mt-4 border-t border-th-border pt-4">
                <h3 className="mb-2 text-xs font-semibold text-th-text-tertiary">Related Reports</h3>
                <RelatedReports reports={relatedData.same_listing} currentReportId={report.id} onNavigate={onNavigate} />
              </div>
            )}

            {/* Admin Memo */}
            {canEdit && (
              <div className="mt-4 border-t border-th-border pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-th-text-tertiary">Memo</h3>
                  <span className="text-[11px] text-th-text-muted">
                    {memoSaving ? 'Saving...' : memoSaved ? 'Saved' : ''}
                  </span>
                </div>
                <Textarea
                  value={adminMemo}
                  onChange={(e) => handleMemoChange(e.target.value)}
                  placeholder="Internal notes..."
                  rows={2}
                  className="resize-y text-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Report Details (Listing + Violation Info) */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-th-text">Report Details</h2>
          </CardHeader>
          <CardContent className="space-y-0">
            {/* Listing Info */}
            {listing && (
              <>
                <div className="flex items-center gap-3">
                  <a
                    href={getAmazonUrl(listing.asin, listing.marketplace)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-th-bg-subtle px-3 py-1.5 font-mono text-sm font-semibold text-th-accent-text transition-colors hover:bg-th-accent-soft"
                  >
                    {listing.asin}
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                  <span className="rounded bg-th-bg-tertiary px-2 py-1 text-xs font-medium text-th-text-secondary">
                    {listing.marketplace.replace('www.amazon.', '').toUpperCase()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-th-text line-clamp-2">{listing.title}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                  {listing.seller_name && (
                    <div>
                      <dt className="text-xs text-th-text-tertiary">{t('reports.seller')}</dt>
                      <dd className="mt-0.5 text-sm text-th-text">{listing.seller_name}</dd>
                    </div>
                  )}
                  {listing.brand && (
                    <div>
                      <dt className="text-xs text-th-text-tertiary">{t('reports.detail.brand')}</dt>
                      <dd className="mt-0.5 text-sm text-th-text">{listing.brand}</dd>
                    </div>
                  )}
                  {listing.rating != null && (
                    <div>
                      <dt className="text-xs text-th-text-tertiary">{t('reports.detail.rating')}</dt>
                      <dd className="mt-0.5 flex items-center gap-1 text-sm text-th-text">
                        <svg className="h-3.5 w-3.5 fill-yellow-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        {listing.rating.toFixed(1)}
                        {listing.review_count != null && (
                          <span className="text-xs text-th-text-muted">({listing.review_count.toLocaleString()})</span>
                        )}
                      </dd>
                    </div>
                  )}
                  {listing.price_amount != null && (
                    <div>
                      <dt className="text-xs text-th-text-tertiary">{t('reports.detail.price')}</dt>
                      <dd className="mt-0.5 text-sm font-medium text-th-text">
                        {listing.price_currency === 'JPY' ? '¥' : '$'}{listing.price_amount.toLocaleString()}
                      </dd>
                    </div>
                  )}
                </dl>
                {report.related_asins && report.related_asins.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {report.related_asins.map((ra, idx) => (
                      <a
                        key={idx}
                        href={getAmazonUrl(ra.asin, ra.marketplace ?? listing.marketplace)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-th-bg-subtle px-2 py-1 font-mono text-xs text-th-accent-text transition-colors hover:bg-th-accent-soft"
                      >
                        {ra.asin}
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Violation Info */}
            <div className={listing ? 'mt-4 border-t border-th-border pt-4' : ''}>
              <h3 className="mb-2 text-xs font-semibold text-th-text-tertiary">{t('reports.detail.violationInfo')}</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                {report.violation_category && (
                  <div>
                    <dt className="text-xs text-th-text-tertiary">{t('reports.detail.violationCategory')}</dt>
                    <dd className="mt-1">
                      <ViolationBadge code={report.violation_category as ViolationCode} size="md" />
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-th-text-tertiary">{t('reports.detail.userViolationType')}</dt>
                  <dd className="mt-1">
                    <ViolationBadge code={report.user_violation_type as ViolationCode} size="md" />
                  </dd>
                </div>
                {report.ai_violation_type && (
                  <div>
                    <dt className="text-xs text-th-text-tertiary">{t('reports.detail.aiViolationType')}</dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <ViolationBadge code={report.ai_violation_type as ViolationCode} size="md" />
                      {report.ai_confidence_score !== null && (
                        <span className="text-xs text-th-text-muted">{report.ai_confidence_score}%</span>
                      )}
                    </dd>
                  </div>
                )}
                {report.confirmed_violation_type && (
                  <div>
                    <dt className="text-xs text-th-text-tertiary">{t('reports.detail.confirmedViolationType')}</dt>
                    <dd className="mt-1">
                      <ViolationBadge code={report.confirmed_violation_type as ViolationCode} size="md" />
                    </dd>
                  </div>
                )}
              </dl>
              {report.disagreement_flag && (
                <div className="mt-3 rounded-lg border border-st-warning-text/30 bg-st-warning-bg px-3 py-2">
                  <p className="text-xs font-medium text-st-warning-text">
                    {t('reports.detail.disagreementWarning')}
                  </p>
                </div>
              )}
            </div>

            {/* Extra fields / note */}
            {report.note && (() => {
              try {
                const parsed = JSON.parse(report.note) as Record<string, string>
                if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                  const entries = Object.entries(parsed).filter(([, v]) => v && String(v).trim())
                  if (entries.length > 0) {
                    return (
                      <div className="mt-4 border-t border-th-border pt-4">
                        <h3 className="mb-2 text-xs font-semibold text-th-text-tertiary">{t('reports.detail.reportDetails')}</h3>
                        <dl className="space-y-2">
                          {entries.map(([key, value]) => (
                            <div key={key} className="rounded bg-th-bg-subtle px-3 py-2">
                              <dt className="text-[11px] font-medium uppercase tracking-wide text-th-text-muted">{key.replace(/_/g, ' ')}</dt>
                              <dd className="mt-0.5 text-sm text-th-text whitespace-pre-wrap">{String(value)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )
                  }
                }
              } catch {
                // not JSON
              }
              return (
                <div className="mt-4 border-t border-th-border pt-4">
                  <h3 className="mb-2 text-xs font-semibold text-th-text-tertiary">{t('reports.detail.reportDetails')}</h3>
                  <p className="text-sm text-th-text whitespace-pre-wrap">{report.note}</p>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Screenshot Card */}
      {screenshotList.length > 0 && (
        <Card>
          <CardHeader>
            <div className="group flex items-center justify-between">
              <h2 className="font-semibold text-th-text">{t('reports.detail.screenshots')}</h2>
              <div className="flex items-center gap-2">
                {screenshotList.length > 1 && (
                  <div className="flex flex-wrap gap-1">
                    {screenshotList.map((ss, idx) => {
                      const d = new Date(ss.captured_at)
                      const label = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
                      return (
                        <div key={ss.url} className="group/tab relative flex items-center">
                          <button
                            className={`rounded-l px-2 py-1 text-xs transition-colors ${
                              idx === activeScreenshotIdx
                                ? 'bg-th-accent text-white'
                                : 'bg-th-bg-subtle text-th-text-secondary hover:bg-th-bg-muted'
                            }`}
                            onClick={() => setActiveScreenshotIdx(idx)}
                          >
                            {label}
                          </button>
                          <button
                            className={`rounded-r px-1 py-1 text-xs transition-all ${
                              idx === activeScreenshotIdx
                                ? 'bg-th-accent/80 text-white hover:bg-red-500'
                                : 'opacity-0 group-hover/tab:opacity-100 bg-th-bg-subtle text-th-text-muted hover:bg-red-500 hover:text-white'
                            }`}
                            onClick={() => setDeleteConfirmIdx(idx)}
                            title="Delete screenshot"
                          >
                            ✕
                          </button>
                          {deleteConfirmIdx === idx && (
                            <div className="absolute right-0 top-full z-10 mt-1 flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-300 bg-white px-3 py-2 shadow-lg dark:border-red-800 dark:bg-gray-900">
                              <span className="text-xs text-red-600 dark:text-red-400">Delete?</span>
                              <button
                                className="rounded bg-red-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                                onClick={() => handleDeleteScreenshot(idx)}
                                disabled={deleting}
                              >
                                {deleting ? '...' : 'Yes'}
                              </button>
                              <button
                                className="rounded px-2 py-0.5 text-xs text-th-text-muted hover:bg-th-bg-muted"
                                onClick={() => setDeleteConfirmIdx(null)}
                                disabled={deleting}
                              >
                                No
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {screenshotList.length === 1 && (
                  <div className="relative flex items-center gap-2">
                    <span className="text-xs text-th-text-muted">
                      {new Date(screenshotList[0].captured_at).toLocaleString()}
                    </span>
                    <button
                      className="rounded px-1.5 py-0.5 text-xs text-th-text-muted opacity-0 transition-all hover:bg-red-500 hover:text-white group-hover:opacity-100"
                      onClick={() => setDeleteConfirmIdx(0)}
                      title="Delete screenshot"
                    >
                      ✕
                    </button>
                    {deleteConfirmIdx === 0 && (
                      <div className="absolute right-0 top-full z-10 mt-1 flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-300 bg-white px-3 py-2 shadow-lg dark:border-red-800 dark:bg-gray-900">
                        <span className="text-xs text-red-600 dark:text-red-400">Delete?</span>
                        <button
                          className="rounded bg-red-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                          onClick={() => handleDeleteScreenshot(0)}
                          disabled={deleting}
                        >
                          {deleting ? '...' : 'Yes'}
                        </button>
                        <button
                          className="rounded px-2 py-0.5 text-xs text-th-text-muted hover:bg-th-bg-muted"
                          onClick={() => setDeleteConfirmIdx(null)}
                          disabled={deleting}
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <img
              src={screenshotList[activeScreenshotIdx]?.url}
              alt="Listing screenshot"
              className="w-full h-auto rounded-lg border border-th-border"
            />
          </CardContent>
        </Card>
      )}

      {/* AI Analysis */}
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

      {/* Draft + Templates — Desktop: side-by-side, Mobile: tabs */}
      {(report.draft_title || isDraftEditable) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              {/* Mobile: tab toggle */}
              {isDraftEditable ? (
                <div className="flex items-center gap-1 rounded-lg bg-th-bg-secondary p-0.5 md:hidden">
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
              ) : null}
              {/* Desktop: just title */}
              <h2 className={`font-semibold text-th-text ${isDraftEditable ? 'hidden md:block' : ''}`}>
                {t('reports.detail.reportDraft')}
              </h2>
              {isDraftEditable && (
                <div className={`flex items-center gap-2 ${draftTab !== 'edit' ? 'hidden md:flex' : ''}`}>
                  {listing && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={capturing}
                      onClick={handleCaptureScreenshot}
                    >
                      <svg className="mr-1 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      {t('reports.detail.captureScreenshot')}
                    </Button>
                  )}
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
            {/* BR Form Type 드롭다운 + 가이드 배너 */}
            {showBrFormType && (
              <div className="rounded-lg border border-th-border bg-th-bg-secondary/50 p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <label className="shrink-0 text-xs font-semibold uppercase tracking-wider text-th-text-muted">
                    BR Report Category
                  </label>
                  <select
                    value={brFormType}
                    onChange={(e) => setBrFormType(e.target.value as BrFormType)}
                    className="flex-1 rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text"
                  >
                    {BR_FORM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-950/30 dark:text-sky-300">
                  <p className="font-medium">{BR_FORM_DESCRIPTION_GUIDE[brFormType]}</p>
                  <p className="mt-1 text-sky-600 dark:text-sky-400">{BR_FORM_FIELD_CONTEXT[brFormType]}</p>
                </div>
              </div>
            )}

            {isDraftEditable ? (
              <>
                {/* Title — always standalone */}
                <Input
                  label={t('reports.detail.draftTitle')}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />

                {/* Mobile: tab-based view */}
                <div className="md:hidden">
                  {draftTab === 'templates' ? (
                    <div className="space-y-3">
                      {/* Recommended template inside template tab */}
                      {suggestedTemplate && !templateDismissed && !editBody && (
                        <div className="flex items-center gap-3 rounded-lg border border-th-accent/30 bg-th-accent/5 px-3 py-2.5">
                          <span className="flex-1 text-sm text-th-text">
                            {t('reports.detail.templateSuggestion' as Parameters<typeof t>[0]).replace('{name}', suggestedTemplate.title)}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => {
                              setEditBody(suggestedTemplate.body)
                              setEditTitle(suggestedTemplate.title)
                              setSuggestedTemplate(null)
                              setDraftTab('edit')
                            }}
                          >
                            {t('reports.detail.templateApply' as Parameters<typeof t>[0])}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setTemplateDismissed(true)}>
                            {t('reports.detail.templateDismiss' as Parameters<typeof t>[0])}
                          </Button>
                        </div>
                      )}
                      <BrTemplateList
                        formType={brFormType}
                        listing={listing ?? {}}
                        compact
                        onApply={(body, title, subject) => {
                          setEditBody(body)
                          if (title) setEditTitle(title)
                          if (subject) setEditSubject(subject)
                          setDraftTab('edit')
                        }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Mobile: AI Preview banner */}
                      {aiPreview && (
                        <div className="rounded-lg border border-th-accent/30 bg-th-accent/5 p-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-th-accent-text">AI Preview</p>
                          <p className="text-sm font-medium text-th-text">{aiPreview.draft_title}</p>
                          <div className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-th-bg-tertiary p-2 text-xs text-th-text-secondary">
                            {aiPreview.draft_body}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" onClick={handleAiApply}>Apply</Button>
                            <Button variant="outline" size="sm" loading={aiWriting} onClick={handleAiWrite}>Rewrite</Button>
                            <Button variant="ghost" size="sm" onClick={() => setAiPreview(null)}>Discard</Button>
                          </div>
                        </div>
                      )}
                      {/* BR Form Fields section — subject, body, URLs */}
                      <div className="rounded-lg border border-th-border p-3 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-th-text-muted">BR Form Fields</p>
                        <Input
                          label="Subject"
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          placeholder="BR case subject line"
                        />
                        <Textarea
                          label={t('reports.detail.draftBody')}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={8}
                        />
                        {/* Extra fields */}
                        {showBrFormType && (
                          <>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-th-text-secondary">
                                Product URLs <span className="text-th-text-muted">(one per line, max 10)</span>
                              </label>
                              <textarea
                                placeholder={'https://www.amazon.com/dp/B0...\nhttps://www.amazon.com/dp/B0...'}
                                value={brFields.product_urls}
                                onChange={(e) => setBrFields((f) => ({ ...f, product_urls: e.target.value }))}
                                rows={2}
                                className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
                              />
                            </div>
                            {brFormType === 'other_policy' && (
                              <>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-th-text-secondary">Seller Storefront URL</label>
                                  <input
                                    type="url"
                                    placeholder="https://www.amazon.com/stores/..."
                                    value={brFields.seller_storefront_url}
                                    onChange={(e) => setBrFields((f) => ({ ...f, seller_storefront_url: e.target.value }))}
                                    className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-th-text-secondary">Amazon Policy URL</label>
                                  <input
                                    type="url"
                                    placeholder="https://sellercentral.amazon.com/..."
                                    value={brFields.policy_url}
                                    onChange={(e) => setBrFields((f) => ({ ...f, policy_url: e.target.value }))}
                                    className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
                                  />
                                </div>
                              </>
                            )}
                            {brFormType === 'product_review' && (
                              <>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-th-text-secondary">
                                    ASINs <span className="text-th-text-muted">(comma separated)</span>
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="B09F2J4SX1, B09F2J4SX2"
                                    value={brFields.asins}
                                    onChange={(e) => setBrFields((f) => ({ ...f, asins: e.target.value }))}
                                    className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-th-text-secondary">Order ID</label>
                                  <input
                                    type="text"
                                    placeholder="111-1234567-1234567"
                                    value={brFields.order_id}
                                    onChange={(e) => setBrFields((f) => ({ ...f, order_id: e.target.value }))}
                                    className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
                                  />
                                </div>
                              </>
                            )}
                          </>
                        )}
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
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop: side-by-side — BR Form Fields + Templates */}
                <div className="hidden gap-5 md:flex">
                  {/* Left: BR Form Fields (subject + body + URLs) */}
                  <div className="basis-1/2 space-y-3">
                    <div className="rounded-lg border border-th-border p-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-th-text-muted">BR Form Fields</p>
                      <Input
                        label="Subject"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        placeholder="BR case subject line"
                      />
                      <Textarea
                        label={t('reports.detail.draftBody')}
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={10}
                      />
                      {/* Extra fields */}
                      {showBrFormType && (
                        <>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-th-text-secondary">
                              Product URLs <span className="text-th-text-muted">(one per line, max 10)</span>
                            </label>
                            <textarea
                              placeholder={'https://www.amazon.com/dp/B0...\nhttps://www.amazon.com/dp/B0...'}
                              value={brFields.product_urls}
                              onChange={(e) => setBrFields((f) => ({ ...f, product_urls: e.target.value }))}
                              rows={3}
                              className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
                            />
                          </div>
                          {brFormType === 'other_policy' && (
                            <>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-th-text-secondary">Seller Storefront URL</label>
                                <input
                                  type="url"
                                  placeholder="https://www.amazon.com/stores/..."
                                  value={brFields.seller_storefront_url}
                                  onChange={(e) => setBrFields((f) => ({ ...f, seller_storefront_url: e.target.value }))}
                                  className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-th-text-secondary">Amazon Policy URL</label>
                                <input
                                  type="url"
                                  placeholder="https://sellercentral.amazon.com/..."
                                  value={brFields.policy_url}
                                  onChange={(e) => setBrFields((f) => ({ ...f, policy_url: e.target.value }))}
                                  className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
                                />
                              </div>
                            </>
                          )}
                          {brFormType === 'product_review' && (
                            <>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-th-text-secondary">
                                  ASINs <span className="text-th-text-muted">(comma separated, max 10)</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="B09F2J4SX1, B09F2J4SX2"
                                  value={brFields.asins}
                                  onChange={(e) => setBrFields((f) => ({ ...f, asins: e.target.value }))}
                                  className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-th-text-secondary">Order ID</label>
                                <input
                                  type="text"
                                  placeholder="111-1234567-1234567"
                                  value={brFields.order_id}
                                  onChange={(e) => setBrFields((f) => ({ ...f, order_id: e.target.value }))}
                                  className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
                                />
                              </div>
                            </>
                          )}
                        </>
                      )}
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
                    </div>
                  </div>
                  {/* Right: AI Preview or Templates */}
                  <div className="basis-1/2 rounded-lg border border-th-border bg-th-bg-secondary/50 p-3">
                    {aiPreview ? (
                      <>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wider text-th-accent-text">AI Preview</p>
                          <button
                            onClick={() => setAiPreview(null)}
                            className="text-xs text-th-text-muted hover:text-th-text-secondary"
                          >
                            Back to templates
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-th-text-tertiary">Title</p>
                            <p className="mt-0.5 text-sm font-medium text-th-text">{aiPreview.draft_title}</p>
                          </div>
                          <div>
                            <p className="text-xs text-th-text-tertiary">Body</p>
                            <div className="mt-0.5 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-th-bg-tertiary p-3 text-sm text-th-text-secondary">
                              {aiPreview.draft_body}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" onClick={handleAiApply}>
                              Apply
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              loading={aiWriting}
                              onClick={handleAiWrite}
                            >
                              Rewrite
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAiPreview(null)}
                            >
                              Discard
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-th-text-muted">Templates</p>
                        {/* Recommended template inside template section */}
                        {suggestedTemplate && !templateDismissed && !editBody && (
                          <div className="mb-3 flex flex-col gap-2 rounded-lg border border-th-accent/30 bg-th-accent/5 p-3">
                            <span className="text-sm text-th-text">
                              {t('reports.detail.templateSuggestion' as Parameters<typeof t>[0]).replace('{name}', suggestedTemplate.title)}
                            </span>
                            <div className="flex gap-2">
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
                              <Button variant="ghost" size="sm" onClick={() => setTemplateDismissed(true)}>
                                {t('reports.detail.templateDismiss' as Parameters<typeof t>[0])}
                              </Button>
                            </div>
                          </div>
                        )}
                        <BrTemplateList
                          formType={brFormType}
                          listing={listing ?? {}}
                          compact
                          onApply={(body, title, subject) => {
                            setEditBody(body)
                            if (title) setEditTitle(title)
                            if (subject) setEditSubject(subject)
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-th-text-tertiary">{t('reports.detail.draftTitle')}</p>
                  <p className="mt-1 text-sm font-medium text-th-text">{report.draft_title}</p>
                </div>
                {report.draft_subject && (
                  <div>
                    <p className="text-sm text-th-text-tertiary">Subject</p>
                    <p className="mt-1 text-sm font-medium text-th-text">{report.draft_subject}</p>
                  </div>
                )}
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
        <Card>
        <CardContent className="pt-4">
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
          {/* PD 재신고 간격 */}
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
          {/* PD 팔로업 재방문 간격 */}
          {canEdit && report.status === 'monitoring' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-th-text-tertiary">Follow-up:</span>
              <select
                value={followupIntervalLocal}
                onChange={(e) => handleFollowupIntervalChange(e.target.value)}
                disabled={savingFollowupInterval}
                className="rounded-md border border-th-border bg-th-bg-secondary px-2 py-1 text-xs text-th-text focus:border-th-accent focus:outline-none"
              >
                <option value="default">Default (7d)</option>
                {[3, 5, 7, 14, 30].map((d) => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
              {savingFollowupInterval && (
                <svg className="h-3 w-3 animate-spin text-th-text-muted" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
          )}
        </div>
        </CardContent>
        </Card>
      )}

      {/* Case Thread (R03) + Activity Log (R05) */}
      {report.br_case_status && (
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
