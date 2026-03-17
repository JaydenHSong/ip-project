'use client'

import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
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
import { BR_FORM_DESCRIPTION_GUIDE, BR_FORM_FIELD_CONTEXT } from '@/lib/reports/br-data'
import { BR_FORM_TYPES, isBrSubmittable, brFormHasField, toBrFormType, type BrFormTypeCode } from '@/constants/br-form-types'
import { VIOLATION_FILTER_OPTIONS } from '@/components/ui/ViolationBadge'
import { AiAnalysisTab } from '@/components/features/AiAnalysisTab'
import { CaseThread } from '@/components/features/case-thread/CaseThread'
import { CaseActivityLog } from '@/components/features/case-thread/CaseActivityLog'
import { CaseChain } from '@/components/features/CaseChain'
import { RelatedReports } from '@/components/features/RelatedReports'
import { getBrFormTypeLabel } from '@/constants/br-form-types'
import type { ReportStatus, TimelineEvent } from '@/types/reports'
import type { BrCaseStatus } from '@/types/br-case'
import { useToast } from '@/hooks/useToast'
import { formatDateTime } from '@/lib/utils/date'
import type { ReportSnapshot } from '@/types/monitoring'
import { FetchStatusBar } from '@/components/features/FetchStatusBar'

type ReportDetailContentProps = {
  report: {
    id: string
    report_number: number
    status: string
    br_form_type: string | null
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
    br_case_id_retry_count?: number | null
    br_last_amazon_reply_at?: string | null
    br_last_our_reply_at?: string | null
    br_submitted_at?: string | null
    br_reply_pending_text?: string | null
    parent_report_id?: string | null
    escalation_level?: number | null
    pd_followup_interval_days?: number | null
    admin_memo?: string | null
    br_submit_data?: {
      product_urls?: string[]
      review_urls?: string[]
      seller_storefront_url?: string
      policy_url?: string
      asins?: string[]
      order_id?: string
    } | null
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
  listingId?: string
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

// Case ID 수동 입력 컴포넌트
const CaseIdManualInput = ({ reportId, onSaved }: { reportId: string; onSaved: (caseId: string) => void }) => {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!/^\d{5,}$/.test(value)) {
      setError('5자리 이상 숫자를 입력하세요')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports/${reportId}/case-id`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ br_case_id: value }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed')
        return
      }
      onSaved(value)
    } catch {
      setError('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Case ID 입력"
          className="w-36 rounded border border-th-border bg-th-bg px-2 py-1 text-xs font-mono text-th-text"
        />
        <button
          onClick={handleSave}
          disabled={saving || !value}
          className="rounded bg-th-accent px-2 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? '...' : '저장'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <a
        href="https://brandregistry.amazon.com/gp/case-dashboard/lobby.html"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-xs text-th-accent hover:underline"
      >
        BR Dashboard에서 확인
      </a>
    </div>
  )
}

export const ReportDetailContent = ({ report, listing, listingId, creatorName, canEdit, userRole, currentUserId, timeline, snapshots, monitoringStartedAt, embedded, onNavigate }: ReportDetailContentProps) => {
  const { t } = useI18n()
  const { addToast } = useToast()
  const router = useRouter()

  const [currentStatus, setCurrentStatus] = useState(report.status)
  const isDraftEditable = canEdit && (currentStatus === 'draft' || currentStatus === 'pending_review')

  const [editTitle, setEditTitle] = useState(report.draft_title ?? '')
  const [editSubject, setEditSubject] = useState(report.draft_subject ?? '')
  const [editBody, setEditBody] = useState(report.draft_body ?? '')
  const [draftTab, setDraftTab] = useState<'edit' | 'templates'>('edit')
  const [aiWriting, setAiWriting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [suggestedTemplate, setSuggestedTemplate] = useState<{ id: string; title: string; body: string } | null>(null)
  const [templateDismissed, setTemplateDismissed] = useState(false)
  const showBrFormType = isDraftEditable
  const initialViolationType = report.user_violation_type ?? report.violation_category ?? report.br_form_type ?? 'other_policy'
  const [violationType, setViolationType] = useState(initialViolationType)
  const [brFormType, setBrFormType] = useState<BrFormTypeCode>(
    toBrFormType(initialViolationType)
  )
  const [brFields, setBrFields] = useState(() => {
    const arrToLines = (v: unknown) => Array.isArray(v) ? v.join('\n') : (typeof v === 'string' ? v : '')

    // 1순위: br_submit_data (approve 후 저장된 확정 데이터)
    const bsd = report.br_submit_data
    if (bsd) {
      return {
        product_urls: arrToLines(bsd.product_urls) || (listing?.asin ? `https://www.amazon.com/dp/${listing.asin}` : ''),
        seller_storefront_url: bsd.seller_storefront_url ?? '',
        policy_url: bsd.policy_url ?? '',
        asins: arrToLines(bsd.asins) || (listing?.asin ?? ''),
        review_urls: arrToLines(bsd.review_urls),
        order_id: bsd.order_id ?? '',
      }
    }

    // 2순위: note (Extension이 JSON으로 저장한 초기 데이터)
    let extra: Record<string, unknown> = {}
    if (report.note) {
      try { extra = JSON.parse(report.note) as Record<string, unknown> } catch { /* not JSON, ignore */ }
    }
    return {
      product_urls: arrToLines(extra.product_urls) || (listing?.asin ? `https://www.amazon.com/dp/${listing.asin}` : ''),
      seller_storefront_url: (extra.seller_storefront_url as string) ?? '',
      policy_url: (extra.policy_url as string) ?? '',
      asins: arrToLines(extra.asins) || (listing?.asin ?? ''),
      review_urls: arrToLines(extra.review_urls),
      order_id: (extra.order_id as string) ?? '',
    }
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
  const hasScreenshots = (report.screenshots ?? []).length > 0 || !!report.screenshot_url
  const [extraTab, setExtraTab] = useState<'screenshots' | 'ai'>(hasScreenshots ? 'screenshots' : 'ai')
  const [adminMemo, setAdminMemo] = useState(report.admin_memo ?? '')
  const [memoSaving, setMemoSaving] = useState(false)
  const [memoSaved, setMemoSaved] = useState(false)
  const memoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [relatedData, setRelatedData] = useState<{
    parent_chain: Array<{ id: string; status: string; br_case_status: string | null; escalation_level: number | null; created_at: string; user_violation_type: string }>
    children: Array<{ id: string; status: string; br_case_status: string | null; escalation_level: number | null; created_at: string; user_violation_type: string }>
    same_listing: Array<{ id: string; status: string; br_case_id: string | null; br_case_status: string | null; created_at: string; user_violation_type: string; violation_category: string | null; br_form_type: string; listings: { asin: string; title: string } | null }>
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
          ...(showBrFormType && isBrSubmittable(brFormType) ? {
            br_extra_fields: {
              ...(brFields.product_urls ? { product_urls: brFields.product_urls.split('\n').map((u: string) => u.trim()).filter(Boolean) } : {}),
              ...(brFields.seller_storefront_url ? { seller_storefront_url: brFields.seller_storefront_url } : {}),
              ...(brFields.policy_url ? { policy_url: brFields.policy_url } : {}),
              ...(brFields.asins ? { asins: brFields.asins.split(/[,;\n]/).map((a) => a.trim()).filter(Boolean) } : {}),
              ...(brFields.review_urls ? { review_urls: brFields.review_urls.split('\n').map((u: string) => u.trim()).filter(Boolean) } : {}),
              ...(brFields.order_id ? { order_id: brFields.order_id } : {}),
            },
          } : {}),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Submit failed')
      }
      const result = await res.json()
      const newStatus = result.status ?? 'approved'
      setCurrentStatus(newStatus)
      addToast({ type: 'success', title: 'Submitted', message: newStatus === 'br_submitting' ? 'BR 케이스 제출이 시작됩니다.' : '승인 완료되었습니다.' })
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

  const addToastRef = useRef(addToast)
  addToastRef.current = addToast

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
        addToastRef.current({ type: 'error', title: 'Save failed', message: 'Draft could not be saved.' })
      }
    } catch {
      setAutoSaveStatus('idle')
      addToastRef.current({ type: 'error', title: 'Save failed', message: 'Network error while saving draft.' })
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

  // 미저장 변경사항 추적 + 페이지 이탈 시 자동 저장
  const hasUnsavedRef = useRef(false)
  const editRef = useRef({ title: '', subject: '', body: '' })
  useEffect(() => {
    editRef.current = { title: editTitle, subject: editSubject, body: editBody }
    if (!isDraftEditable) return
    hasUnsavedRef.current = editTitle !== lastSavedRef.current.title
      || editSubject !== lastSavedRef.current.subject
      || editBody !== lastSavedRef.current.body
  }, [editTitle, editSubject, editBody, isDraftEditable])

  useEffect(() => {
    if (!isDraftEditable) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedRef.current) return
      // sendBeacon으로 즉시 저장 (페이지 이탈 시에도 전송 보장)
      const payload = JSON.stringify({
        draft_title: editRef.current.title,
        draft_subject: editRef.current.subject,
        draft_body: editRef.current.body,
      })
      navigator.sendBeacon(`/api/reports/${report.id}/save-draft`, new Blob([payload], { type: 'application/json' }))
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDraftEditable, report.id])

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
          <span className="font-mono text-4xl font-bold leading-none text-th-accent">#{String(report.report_number).padStart(5, '0')}</span>
          <StatusBadge status={currentStatus as ReportStatus} type="report" size="md" />
          {isDraftEditable && (
            <span className="rounded-full bg-th-accent-soft px-2 py-0.5 text-xs font-medium text-th-accent-text">
              {t('reports.detail.editing')}
            </span>
          )}
          <div className="ml-auto">
            <ReportActions
                reportId={report.id}
                status={currentStatus}
                brFormType={report.br_form_type}
                userRole={userRole}
                createdBy={report.created_by}
                currentUserId={currentUserId}
                resubmitCount={report.resubmit_count}
                nextResubmitAt={report.next_resubmit_at}
              />
          </div>
        </div>
      )}
      {embedded && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-4xl font-bold leading-none text-th-accent">#{String(report.report_number).padStart(5, '0')}</span>
          <StatusBadge status={currentStatus as ReportStatus} type="report" size="md" />
          {isDraftEditable && (
            <span className="rounded-full bg-th-accent-soft px-2 py-0.5 text-xs font-medium text-th-accent-text">
              {t('reports.detail.editing')}
            </span>
          )}
          <div className="ml-auto">
            <ReportActions
                reportId={report.id}
                status={currentStatus}
                brFormType={report.br_form_type}
                userRole={userRole}
                createdBy={report.created_by}
                currentUserId={currentUserId}
                resubmitCount={report.resubmit_count}
                nextResubmitAt={report.next_resubmit_at}
              />
          </div>
        </div>
      )}

      {/* Fetch Status Bar — 크롤링 상태 + 리프레시 */}
      {listingId && currentStatus === 'draft' && (
        <FetchStatusBar
          listingId={listingId}
          reportId={report.id}
          onDataUpdated={() => window.location.reload()}
        />
      )}

      {/* BR Submitting Banner */}
      {currentStatus === 'br_submitting' && (
        <div className="overflow-hidden rounded-xl border border-sky-500/30 bg-sky-50 dark:bg-sky-950/30">
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/20">
                <svg className="h-5 w-5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-th-text">BR 제출 큐 등록 완료</p>
                <p className="mt-0.5 text-xs text-th-text-secondary">
                  Crawler가 자동으로 Brand Registry에 제출합니다.
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
                  setCurrentStatus('draft')
                  addToast({ type: 'success', title: '취소 완료', message: 'Draft 상태로 돌아갔습니다.' })
                  router.refresh()
                } catch (e) {
                  addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
                } finally {
                  setStopping(false)
                }
              }}
            >
              Cancel
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
              ) : report.br_case_id ? (
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">Submitted</span>
              ) : (
                <span className="rounded-full bg-th-bg-secondary px-2.5 py-1 text-xs font-medium text-th-text-muted">Not submitted</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-0">
            {/* BR Case Info */}
            {(report.br_case_status || report.br_case_id) ? (
              <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2.5">
                <dt className="text-xs text-th-text-tertiary self-center">Case ID</dt>
                <dd className="font-mono text-sm font-medium text-th-text">
                  {report.br_case_id && report.br_case_id !== 'submitted' ? (
                    <a
                      href={`https://brandregistry.amazon.com/cu/case-dashboard/view-case?caseID=${report.br_case_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-th-accent hover:underline"
                    >
                      {report.br_case_id}
                    </a>
                  ) : report.br_case_status === 'case_id_missing' ? (
                    <CaseIdManualInput reportId={report.id} onSaved={(caseId) => {
                      report.br_case_id = caseId
                      report.br_case_status = null
                      router.refresh()
                    }} />
                  ) : (report.br_case_id_retry_count ?? 0) > 0 ? (
                    <span className="text-th-text-muted text-xs">자동 복구 중... ({report.br_case_id_retry_count}/3)</span>
                  ) : (
                    <span className="text-th-text-muted">Pending</span>
                  )}
                </dd>
                {report.br_submitted_at && (
                  <>
                    <dt className="text-xs text-th-text-tertiary self-center">Submitted</dt>
                    <dd className="text-sm text-th-text">{formatDateTime(report.br_submitted_at)}</dd>
                  </>
                )}
                {report.br_last_amazon_reply_at && (
                  <>
                    <dt className="text-xs text-th-text-tertiary self-center">Last Reply</dt>
                    <dd className="text-sm text-th-text">{formatDateTime(report.br_last_amazon_reply_at)}</dd>
                  </>
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

            {/* Extension Report */}
            <div className="mt-4 border-t border-th-border pt-4">
              <h3 className="mb-3 text-xs font-semibold text-th-text-tertiary">Extension Report</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-th-text-tertiary">Type</span>
                <ViolationBadge code={report.user_violation_type ?? report.br_form_type ?? ''} violationCategory={report.violation_category} size="md" />
                {report.note && (() => {
                  try {
                    const parsed = JSON.parse(report.note) as Record<string, string>
                    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                      const entries = Object.entries(parsed).filter(([, v]) => v && String(v).trim())
                      if (entries.length > 0) {
                        return entries.map(([key, value]) => (
                          <Fragment key={key}>
                            <span className="text-th-border">|</span>
                            <span className="text-xs text-th-text-tertiary capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-sm text-th-text">{String(value)}</span>
                          </Fragment>
                        ))
                      }
                    }
                  } catch {
                    // not JSON
                  }
                  return (
                    <>
                      <span className="text-th-border">|</span>
                      <span className="text-xs text-th-text-tertiary">Reason</span>
                      <span className="text-sm text-th-text">{report.note}</span>
                    </>
                  )
                })()}
              </div>
              {report.disagreement_flag && (
                <div className="mt-3 rounded-lg border border-st-warning-text/30 bg-st-warning-bg px-3 py-2">
                  <p className="text-xs font-medium text-st-warning-text">
                    {t('reports.detail.disagreementWarning')}
                  </p>
                </div>
              )}
            </div>

            {/* Admin Memo */}
            {canEdit && (
              <div className="mt-4 border-t border-th-border pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-th-text-tertiary">Memo</h3>
                  <span className="text-[11px] text-th-text-muted">
                    {memoSaving ? t('common.loading' as Parameters<typeof t>[0]) : memoSaved ? t('common.save' as Parameters<typeof t>[0]) : ''}
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

        {/* Right: Listing Information */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-th-text">Listing Information</h2>
          </CardHeader>
          <CardContent className="space-y-0">
            {listing && (
              <>
                <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2.5">
                  <dt className="text-xs text-th-text-tertiary self-center">ASIN</dt>
                  <dd>
                    <a
                      href={getAmazonUrl(listing.asin, listing.marketplace)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-th-bg-subtle px-2.5 py-1 font-mono text-sm font-semibold text-th-accent-text transition-colors hover:bg-th-accent-soft"
                    >
                      {listing.asin}
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  </dd>

                  <dt className="text-xs text-th-text-tertiary self-center">Channel</dt>
                  <dd>
                    <span className="rounded bg-th-bg-tertiary px-2 py-1 text-xs font-medium text-th-text-secondary">
                      {listing.marketplace.replace('www.amazon.', '').toUpperCase()}
                    </span>
                  </dd>

                  <dt className="text-xs text-th-text-tertiary">Title</dt>
                  <dd className="text-sm text-th-text line-clamp-2">{listing.title}</dd>

                  {listing.seller_name && (
                    <>
                      <dt className="text-xs text-th-text-tertiary self-center">{t('reports.seller')}</dt>
                      <dd className="text-sm text-th-text">{listing.seller_name}</dd>
                    </>
                  )}

                  <dt className="text-xs text-th-text-tertiary self-center">{t('reports.detail.brand')}</dt>
                  <dd className="text-sm text-th-text">{listing.brand ?? '-'}</dd>

                  <dt className="text-xs text-th-text-tertiary self-center">{t('reports.detail.price')}</dt>
                  <dd className="text-sm font-medium text-th-text">
                    {listing.price_amount != null
                      ? `${listing.price_currency === 'JPY' ? '¥' : '$'}${listing.price_amount.toLocaleString()}`
                      : '-'}
                  </dd>

                  <dt className="text-xs text-th-text-tertiary self-center">{t('reports.detail.rating')}</dt>
                  <dd className="flex items-center gap-1 text-sm text-th-text">
                    {listing.rating != null ? (
                      <>
                        <svg className="h-3.5 w-3.5 fill-yellow-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        {listing.rating.toFixed(1)}
                        {listing.review_count != null && (
                          <span className="text-xs text-th-text-muted">({listing.review_count.toLocaleString()})</span>
                        )}
                      </>
                    ) : '-'}
                  </dd>
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
          </CardContent>
        </Card>
      </div>

      {/* Screenshots + AI Analysis — 접힌 상태, 탭 전환 */}
      {(screenshotList.length > 0 || report.ai_analysis || report.ai_violation_type) && (
        <details className="group rounded-xl border border-th-border bg-th-bg-card">
          <summary className="flex cursor-pointer items-center gap-3 px-5 py-3">
            <h2 className="font-semibold text-th-text">Details</h2>
            {screenshotList.length > 0 && (
              <span className="rounded-full bg-th-accent/15 px-2 py-0.5 text-xs font-medium text-th-accent-text">
                {screenshotList.length} {screenshotList.length === 1 ? 'screenshot' : 'screenshots'}
              </span>
            )}
            {report.ai_analysis && (
              <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-400">
                AI
              </span>
            )}
            <svg className="ml-auto h-4 w-4 text-th-text-muted transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="border-t border-th-border">
            {/* Tabs */}
            <div className="flex border-b border-th-border">
              {screenshotList.length > 0 && (
                <button
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                    extraTab === 'screenshots'
                      ? 'border-b-2 border-th-accent text-th-accent-text'
                      : 'text-th-text-muted hover:text-th-text'
                  }`}
                  onClick={() => setExtraTab('screenshots')}
                >
                  Screenshots ({screenshotList.length})
                </button>
              )}
              {(report.ai_analysis || report.ai_violation_type) && (
                <button
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                    extraTab === 'ai'
                      ? 'border-b-2 border-th-accent text-th-accent-text'
                      : 'text-th-text-muted hover:text-th-text'
                  }`}
                  onClick={() => setExtraTab('ai')}
                >
                  AI Analysis
                </button>
              )}
            </div>

            {/* Screenshot content */}
            {extraTab === 'screenshots' && screenshotList.length > 0 && (
              <div className="p-4">
                {screenshotList.length > 1 && (
                  <div className="mb-3 flex flex-wrap gap-1">
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
                  <div className="group/single relative mb-3 flex items-center gap-2">
                    <span className="text-xs text-th-text-muted">
                      {formatDateTime(screenshotList[0].captured_at)}
                    </span>
                    <button
                      className="rounded px-1.5 py-0.5 text-xs text-th-text-muted opacity-0 transition-all hover:bg-red-500 hover:text-white group-hover/single:opacity-100"
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
                <img
                  src={screenshotList[activeScreenshotIdx]?.url}
                  alt="Listing screenshot"
                  className="w-full h-auto rounded-lg border border-th-border"
                />
              </div>
            )}

            {/* AI Analysis content */}
            {extraTab === 'ai' && (report.ai_analysis || report.ai_violation_type) && (
              <AiAnalysisTab
                aiAnalysis={report.ai_analysis}
                aiViolationType={report.ai_violation_type}
                aiSeverity={report.ai_severity}
                aiConfidenceScore={report.ai_confidence_score}
                userViolationType={report.user_violation_type}
                disagreementFlag={report.disagreement_flag}
                policyReferences={report.policy_references ?? []}
              />
            )}
          </div>
        </details>
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
            {/* Violation Type 드롭다운 + BR 가이드 배너 */}
            {showBrFormType && (
              <div className="rounded-lg border border-th-border bg-th-bg-secondary/50 p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <label className="shrink-0 text-xs font-semibold uppercase tracking-wider text-th-text-muted">
                    Violation Type
                  </label>
                  <select
                    value={violationType}
                    onChange={async (e) => {
                      const val = e.target.value
                      const prevViolation = violationType
                      const prevBr = brFormType
                      const newBr = toBrFormType(val)
                      setViolationType(val)
                      setBrFormType(newBr)
                      try {
                        const res = await fetch(`/api/reports/${report.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            user_violation_type: val,
                            violation_category: ['V01', 'V02', 'V03', 'V04'].includes(val) ? val : null,
                            br_form_type: newBr,
                          }),
                        })
                        if (!res.ok) throw new Error()
                        setAutoSaveStatus('saved')
                        setTimeout(() => setAutoSaveStatus('idle'), 2000)
                      } catch {
                        setViolationType(prevViolation)
                        setBrFormType(prevBr)
                        addToast({ type: 'error', title: 'Save failed', message: 'Violation type could not be saved.' })
                      }
                    }}
                    className="flex-1 rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text"
                  >
                    {VIOLATION_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                {brFormType === 'ip_violation' ? (
                  <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    <p className="font-medium">IP Violation은 RAV (Report a Violation) 경로로 처리됩니다.</p>
                    <p className="mt-1 text-amber-600 dark:text-amber-400">BR Contact Support가 아닌 별도의 RAV 도구를 통해 아마존에 직접 위반 신고합니다.</p>
                  </div>
                ) : (
                  <div className="rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:bg-sky-900/50 dark:text-sky-100">
                    <p className="font-medium">{BR_FORM_DESCRIPTION_GUIDE[brFormType]}</p>
                    <p className="mt-1 text-sky-700 dark:text-sky-200">{BR_FORM_FIELD_CONTEXT[brFormType]}</p>
                  </div>
                )}
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
                          placeholder={BR_FORM_TYPES[brFormType].subject || 'BR case subject line'}
                        />
                        <Textarea
                          label={BR_FORM_TYPES[brFormType].descriptionLabel || t('reports.detail.draftBody')}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={8}
                        />
                        {/* Extra fields — IP는 BR Contact Support 아님 */}
                        {showBrFormType && isBrSubmittable(brFormType) && (
                          <>
                            {brFormHasField(brFormType, 'product_urls') && (
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
                            )}
                            {brFormHasField(brFormType, 'seller_storefront_url') && (
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
                            )}
                            {brFormHasField(brFormType, 'policy_url') && (
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
                            )}
                            {brFormHasField(brFormType, 'asins') && (
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
                            )}
                            {brFormHasField(brFormType, 'review_urls') && (
                              <div>
                                <label className="mb-1 block text-xs font-medium text-th-text-secondary">
                                  Review URLs <span className="text-th-text-muted">(one per line, max 10)</span>
                                </label>
                                <textarea
                                  placeholder={'https://www.amazon.com/gp/customer-reviews/...\nhttps://www.amazon.com/gp/customer-reviews/...'}
                                  value={brFields.review_urls}
                                  onChange={(e) => setBrFields((f) => ({ ...f, review_urls: e.target.value }))}
                                  rows={2}
                                  className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
                                />
                              </div>
                            )}
                            {brFormHasField(brFormType, 'order_id') && (
                              <div>
                                <label className="mb-1 block text-xs font-medium text-th-text-secondary">
                                  Order ID <span className="text-th-text-muted">(optional)</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="121-1234567-1234567"
                                  value={brFields.order_id}
                                  onChange={(e) => setBrFields((f) => ({ ...f, order_id: e.target.value }))}
                                  className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
                                />
                              </div>
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
                        placeholder={BR_FORM_TYPES[brFormType].subject || 'BR case subject line'}
                      />
                      <Textarea
                        label={BR_FORM_TYPES[brFormType].descriptionLabel || t('reports.detail.draftBody')}
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={10}
                      />
                      {/* Extra fields — field-based visibility matching Amazon BR forms */}
                      {showBrFormType && isBrSubmittable(brFormType) && (
                        <>
                          {brFormHasField(brFormType, 'product_urls') && (
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
                          )}
                          {brFormHasField(brFormType, 'seller_storefront_url') && (
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
                          )}
                          {brFormHasField(brFormType, 'policy_url') && (
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
                          )}
                          {brFormHasField(brFormType, 'asins') && (
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
                          )}
                          {brFormHasField(brFormType, 'review_urls') && (
                            <div>
                              <label className="mb-1 block text-xs font-medium text-th-text-secondary">
                                Review URLs <span className="text-th-text-muted">(one per line, max 10)</span>
                              </label>
                              <textarea
                                placeholder={'https://www.amazon.com/gp/customer-reviews/...\nhttps://www.amazon.com/gp/customer-reviews/...'}
                                value={brFields.review_urls}
                                onChange={(e) => setBrFields((f) => ({ ...f, review_urls: e.target.value }))}
                                rows={3}
                                className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
                              />
                            </div>
                          )}
                          {brFormHasField(brFormType, 'order_id') && (
                            <div>
                              <label className="mb-1 block text-xs font-medium text-th-text-secondary">
                                Order ID <span className="text-th-text-muted">(optional)</span>
                              </label>
                              <input
                                type="text"
                                placeholder="121-1234567-1234567"
                                value={brFields.order_id}
                                onChange={(e) => setBrFields((f) => ({ ...f, order_id: e.target.value }))}
                                className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none"
                              />
                            </div>
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
                {/* BR Extra Fields — 읽기 전용 (Completed/Monitoring 등) */}
                {(brFields.review_urls || brFields.product_urls || brFields.seller_storefront_url || brFields.order_id) && (
                  <div className="space-y-3 border-t border-th-border pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-th-text-tertiary">BR Fields</p>
                    {brFields.product_urls && (
                      <div>
                        <p className="text-sm text-th-text-tertiary">Product URLs</p>
                        <div className="mt-1 whitespace-pre-wrap text-sm text-th-text-secondary">{brFields.product_urls}</div>
                      </div>
                    )}
                    {brFields.review_urls && (
                      <div>
                        <p className="text-sm text-th-text-tertiary">Review URLs</p>
                        <div className="mt-1 whitespace-pre-wrap text-sm text-th-text-secondary">{brFields.review_urls}</div>
                      </div>
                    )}
                    {brFields.seller_storefront_url && (
                      <div>
                        <p className="text-sm text-th-text-tertiary">Seller Storefront URL</p>
                        <div className="mt-1 text-sm text-th-text-secondary">{brFields.seller_storefront_url}</div>
                      </div>
                    )}
                    {brFields.order_id && (
                      <div>
                        <p className="text-sm text-th-text-tertiary">Order ID</p>
                        <div className="mt-1 text-sm text-th-text-secondary">{brFields.order_id}</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monitoring Snapshots (only show for monitoring/resolved/unresolved) */}
      {snapshots && snapshots.length > 0 && ['monitoring', 'resolved', 'unresolved'].includes(currentStatus) && (
        <SnapshotViewer
          initialSnapshot={snapshots.find((s) => s.snapshot_type === 'initial') ?? null}
          followupSnapshots={snapshots.filter((s) => s.snapshot_type === 'followup')}
        />
      )}

      {/* Monitoring Info + Resubmit Interval */}
      {monitoringStartedAt && ['monitoring', 'resolved', 'unresolved'].includes(currentStatus) && (
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
          {canEdit && ['monitoring', 'unresolved'].includes(currentStatus) && (
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
          {canEdit && currentStatus === 'monitoring' && (
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
