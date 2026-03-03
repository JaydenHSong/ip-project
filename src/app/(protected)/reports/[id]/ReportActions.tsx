'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { useI18n } from '@/lib/i18n/context'
import { REJECTION_CATEGORIES, RESOLUTION_TYPES } from '@/types/reports'

type ScSubmitData = {
  asin: string
  violation_type_sc: string
  description: string
  evidence_urls: string[]
  marketplace: string
  prepared_at: string
}

type ReportActionsProps = {
  reportId: string
  status: string
  userRole: string
  scCaseId?: string | null
}

export const ReportActions = ({ reportId, status, userRole, scCaseId }: ReportActionsProps) => {
  const router = useRouter()
  const { t } = useI18n()
  const [loading, setLoading] = useState<string | null>(null)
  const [showRewriteModal, setShowRewriteModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showManualConfirmModal, setShowManualConfirmModal] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [rejectionCategory, setRejectionCategory] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [manualCaseId, setManualCaseId] = useState('')
  const [resolutionType, setResolutionType] = useState('')
  const [archiveReason, setArchiveReason] = useState('')

  const canAct = userRole === 'admin' || userRole === 'editor'
  if (!canAct) return null

  const handleApprove = async () => {
    setLoading('approve')
    try {
      const res = await fetch(`/api/reports/${reportId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Approve failed')
      }
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  const handleSubmitReview = async () => {
    setLoading('submitReview')
    try {
      const res = await fetch(`/api/reports/${reportId}/submit-review`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Submit failed')
      }
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  const formatClipboardText = (data: ScSubmitData): string => {
    return [
      `ASIN: ${data.asin}`,
      `Violation Type: ${data.violation_type_sc}`,
      '',
      '--- Description ---',
      data.description,
      data.evidence_urls.length > 0
        ? `\n--- Evidence ---\n${data.evidence_urls.join('\n')}`
        : '',
    ].filter(Boolean).join('\n')
  }

  const handleSubmitSC = async () => {
    setLoading('submitSC')
    try {
      const res = await fetch(`/api/reports/${reportId}/submit-sc`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Submit to SC failed')
      }

      const data = await res.json() as {
        sc_rav_url: string
        sc_submit_data: ScSubmitData
      }

      // SC RAV 페이지 새 탭 열기
      if (data.sc_rav_url) {
        window.open(data.sc_rav_url, '_blank')
      }

      // 클립보드 fallback (Extension 없을 때 대비)
      if (data.sc_submit_data) {
        const clipboardText = formatClipboardText(data.sc_submit_data)
        await navigator.clipboard.writeText(clipboardText).catch(() => {})
      }

      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  const handleConfirmSubmitted = async () => {
    setLoading('confirmSubmitted')
    try {
      const res = await fetch(`/api/reports/${reportId}/confirm-submitted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sc_case_id: manualCaseId.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Confirm failed')
      }
      setShowManualConfirmModal(false)
      setManualCaseId('')
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  const handleRewrite = async () => {
    if (!feedback.trim()) return
    setLoading('rewrite')
    try {
      const res = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: reportId,
          feedback: feedback.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Rewrite failed')
      }
      setShowRewriteModal(false)
      setFeedback('')
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectionCategory || !rejectionReason.trim()) return
    setLoading('reject')
    try {
      const res = await fetch(`/api/reports/${reportId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejection_reason: rejectionReason.trim(),
          rejection_category: rejectionCategory,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Reject failed')
      }
      setShowRejectModal(false)
      setRejectionCategory('')
      setRejectionReason('')
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  const handleApproveAndSubmit = async () => {
    setLoading('approveSubmit')
    try {
      const res = await fetch(`/api/reports/${reportId}/approve-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.partial?.approved) {
          alert(data.error?.message ?? 'Approved but SC submit failed')
          router.refresh()
          return
        }
        throw new Error(data.error?.message ?? 'Approve & Submit failed')
      }

      // SC RAV 페이지 새 탭 열기
      if (data.sc_rav_url) {
        window.open(data.sc_rav_url, '_blank')
      }

      // 클립보드 fallback
      if (data.sc_submit_data) {
        const clipboardText = formatClipboardText(data.sc_submit_data)
        await navigator.clipboard.writeText(clipboardText).catch(() => {})
      }

      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  const handleStartMonitoring = async () => {
    setLoading('startMonitoring')
    try {
      const res = await fetch(`/api/reports/${reportId}/start-monitoring`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Start monitoring failed')
      }
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  const handleArchive = async () => {
    setLoading('archive')
    try {
      const res = await fetch(`/api/reports/${reportId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive_reason: archiveReason.trim() || undefined }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Archive failed')
      }
      setShowArchiveModal(false)
      setArchiveReason('')
      router.push('/reports/archived')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  const handleUnarchive = async () => {
    setLoading('unarchive')
    try {
      const res = await fetch(`/api/reports/${reportId}/unarchive`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Unarchive failed')
      }
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  const handleResolve = async (type?: string) => {
    const rt = type ?? resolutionType
    if (!rt) return
    setLoading('resolve')
    try {
      const res = await fetch(`/api/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_type: rt }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Resolve failed')
      }
      setShowResolveModal(false)
      setResolutionType('')
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === 'draft' && (
          <Button
            size="sm"
            loading={loading === 'submitReview'}
            onClick={handleSubmitReview}
          >
            {t('reports.detail.submitReview')}
          </Button>
        )}
        {status === 'pending_review' && (
          <>
            <Button
              size="sm"
              loading={loading === 'approveSubmit'}
              onClick={handleApproveAndSubmit}
            >
              {t('reports.detail.approveAndSubmit')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={loading === 'approve'}
              onClick={handleApprove}
            >
              {t('reports.detail.approve')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRejectModal(true)}
            >
              {t('reports.detail.reject')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRewriteModal(true)}
            >
              {t('reports.detail.rewrite')}
            </Button>
          </>
        )}
        {status === 'rejected' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRewriteModal(true)}
            >
              {t('reports.detail.rewrite')}
            </Button>
            <Button
              size="sm"
              loading={loading === 'submitReview'}
              onClick={handleSubmitReview}
            >
              {t('reports.detail.submitReview')}
            </Button>
          </>
        )}
        {status === 'approved' && userRole === 'admin' && (
          <Button
            size="sm"
            loading={loading === 'submitSC'}
            onClick={handleSubmitSC}
          >
            {t('reports.detail.submitSC')}
          </Button>
        )}
        {status === 'submitted' && (
          <>
            <Button
              size="sm"
              loading={loading === 'startMonitoring'}
              onClick={handleStartMonitoring}
            >
              {t('reports.monitoring.startMonitoring' as Parameters<typeof t>[0])}
            </Button>
            {!scCaseId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManualConfirmModal(true)}
              >
                {t('reports.detail.confirmSubmitted')}
              </Button>
            )}
          </>
        )}
        {status === 'monitoring' && (
          <>
            <Button
              size="sm"
              onClick={() => setShowResolveModal(true)}
            >
              {t('reports.monitoring.resolve' as Parameters<typeof t>[0])}
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={loading === 'resolve'}
              onClick={() => handleResolve('no_change')}
            >
              {t('reports.monitoring.markUnresolved' as Parameters<typeof t>[0])}
            </Button>
          </>
        )}
        {['draft', 'pending_review', 'approved', 'monitoring', 'unresolved', 'resolved'].includes(status) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchiveModal(true)}
          >
            {['monitoring', 'unresolved', 'resolved'].includes(status)
              ? t('reports.detail.forceArchive' as Parameters<typeof t>[0])
              : t('reports.detail.archiveReport')}
          </Button>
        )}
        {status === 'archived' && (
          <Button
            variant="outline"
            size="sm"
            loading={loading === 'unarchive'}
            onClick={handleUnarchive}
          >
            {t('reports.detail.unarchive' as Parameters<typeof t>[0])}
          </Button>
        )}
      </div>

      {/* Rewrite Modal */}
      <Modal
        open={showRewriteModal}
        onClose={() => setShowRewriteModal(false)}
        title={t('reports.detail.rewrite')}
      >
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={t('reports.detail.rewriteFeedback')}
          rows={4}
        />
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowRewriteModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            loading={loading === 'rewrite'}
            disabled={!feedback.trim()}
            onClick={handleRewrite}
          >
            {t('reports.detail.rewriteConfirm')}
          </Button>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={t('reports.detail.reject')}
      >
        <fieldset className="mb-4 space-y-2">
          <legend className="mb-2 text-sm font-medium text-th-text-secondary">
            {t('reports.detail.rejectionCategory')}
          </legend>
          {REJECTION_CATEGORIES.map((cat) => (
            <label key={cat} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="rejection_category"
                value={cat}
                checked={rejectionCategory === cat}
                onChange={(e) => setRejectionCategory(e.target.value)}
                className="accent-th-accent"
              />
              <span className="text-sm text-th-text">
                {t(`reports.detail.rejectionCategories.${cat}` as Parameters<typeof t>[0])}
              </span>
            </label>
          ))}
        </fieldset>
        <Textarea
          label={t('reports.detail.rejectionReasonLabel')}
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          rows={3}
        />
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowRejectModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={loading === 'reject'}
            disabled={!rejectionCategory || !rejectionReason.trim()}
            onClick={handleReject}
          >
            {t('reports.detail.rejectConfirm')}
          </Button>
        </div>
      </Modal>

      {/* Manual Confirm Modal */}
      <Modal
        open={showManualConfirmModal}
        onClose={() => setShowManualConfirmModal(false)}
        title={t('reports.detail.confirmSubmitted')}
      >
        <p className="mb-3 text-sm text-th-text-secondary">
          {t('reports.detail.confirmSubmittedDesc')}
        </p>
        <Input
          label={t('reports.detail.scCaseId')}
          value={manualCaseId}
          onChange={(e) => setManualCaseId(e.target.value)}
          placeholder={t('reports.detail.scCaseIdPlaceholder')}
        />
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowManualConfirmModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            loading={loading === 'confirmSubmitted'}
            onClick={handleConfirmSubmitted}
          >
            {t('reports.detail.confirmSubmitted')}
          </Button>
        </div>
      </Modal>

      {/* Resolve Modal */}
      <Modal
        open={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title={t('reports.monitoring.resolveTitle' as Parameters<typeof t>[0])}
      >
        <p className="mb-3 text-sm text-th-text-secondary">
          {t('reports.monitoring.resolveDesc' as Parameters<typeof t>[0])}
        </p>
        <fieldset className="space-y-2">
          {RESOLUTION_TYPES.filter((rt) => rt !== 'no_change').map((rt) => (
            <label key={rt} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="resolution_type"
                value={rt}
                checked={resolutionType === rt}
                onChange={(e) => setResolutionType(e.target.value)}
                className="accent-th-accent"
              />
              <span className="text-sm text-th-text">
                {t(`reports.monitoring.resolutionTypes.${rt}` as Parameters<typeof t>[0])}
              </span>
            </label>
          ))}
        </fieldset>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowResolveModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            loading={loading === 'resolve'}
            disabled={!resolutionType}
            onClick={() => handleResolve()}
          >
            {t('reports.monitoring.resolve' as Parameters<typeof t>[0])}
          </Button>
        </div>
      </Modal>

      {/* Archive Modal */}
      <Modal
        open={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        title={t('reports.detail.forceArchive' as Parameters<typeof t>[0])}
      >
        <p className="mb-3 text-sm text-th-text-secondary">
          {t('reports.detail.archiveConfirm' as Parameters<typeof t>[0])}
        </p>
        <Textarea
          label={t('reports.detail.archiveReason' as Parameters<typeof t>[0])}
          value={archiveReason}
          onChange={(e) => setArchiveReason(e.target.value)}
          placeholder={t('reports.detail.archiveReasonPlaceholder' as Parameters<typeof t>[0])}
          rows={3}
        />
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowArchiveModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={loading === 'archive'}
            onClick={handleArchive}
          >
            {t('reports.detail.forceArchive' as Parameters<typeof t>[0])}
          </Button>
        </div>
      </Modal>

    </>
  )
}
