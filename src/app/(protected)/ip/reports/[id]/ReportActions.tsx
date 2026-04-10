'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { useI18n } from '@/lib/i18n/context'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils/date'

type ReportActionsProps = {
  reportId: string
  status: string
  brFormType?: string | null
  approvePayload?: Record<string, unknown>
  userRole: string
  createdBy?: string | null
  currentUserId?: string | null
  resubmitCount?: number
  nextResubmitAt?: string | null
  backHref?: string
}

export const ReportActions = ({
  reportId,
  status,
  brFormType,
  approvePayload,
  userRole,
  createdBy,
  currentUserId,
  resubmitCount,
  nextResubmitAt,
  backHref = '/ip/reports',
}: ReportActionsProps) => {
  const router = useRouter()
  const { t } = useI18n()
  const { addToast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  const [showRewriteModal, setShowRewriteModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCloneConfirm, setShowCloneConfirm] = useState(false)
  const [cloneWarningDaysAgo, setCloneWarningDaysAgo] = useState<number | null>(null)
  const [showForceResolveConfirm, setShowForceResolveConfirm] = useState(false)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [rewriteStep, setRewriteStep] = useState<1 | 2>(1)
  const [feedback, setFeedback] = useState('')
  const [rewritePreview, setRewritePreview] = useState<{ draft_title: string; draft_body: string } | null>(null)
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewBody, setPreviewBody] = useState('')

  const canAct = userRole === 'owner' || userRole === 'admin' || userRole === 'editor'
  if (!canAct) return null

  const isAdmin = userRole === 'owner' || userRole === 'admin'
  const canDelete = isAdmin || (
    ['draft', 'pending_review'].includes(status) && createdBy === currentUserId
  )

  const handleApprove = async () => {
    setLoading('approve')
    try {
      const res = await fetch(`/api/reports/${reportId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approvePayload ?? {}),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Approve failed')
      }
      router.refresh()
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
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
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setLoading(null)
    }
  }

  // Rewrite Step 1: Get AI preview
  const handleRewritePreview = async () => {
    if (!feedback.trim()) return
    setLoading('rewrite')
    try {
      const res = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: reportId,
          feedback: feedback.trim(),
          preview_only: true,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Rewrite failed')
      }
      const data = await res.json() as { draft_title: string; draft_body: string }
      setRewritePreview(data)
      setPreviewTitle(data.draft_title)
      setPreviewBody(data.draft_body)
      setRewriteStep(2)
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setLoading(null)
    }
  }

  // Rewrite Step 2: Save edited preview
  const handleRewriteSave = async () => {
    setLoading('rewriteSave')
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_title: previewTitle,
          draft_body: previewBody,
          status: 'pending_review',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Save failed')
      }
      setShowRewriteModal(false)
      resetRewriteModal()
      router.refresh()
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setLoading(null)
    }
  }

  const resetRewriteModal = () => {
    setRewriteStep(1)
    setFeedback('')
    setRewritePreview(null)
    setPreviewTitle('')
    setPreviewBody('')
  }

  const handleForceResubmit = async () => {
    setLoading('brResubmit')
    try {
      const res = await fetch(`/api/reports/${reportId}/force-resubmit?track=br`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Force resubmit failed')
      }
      router.refresh()
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setLoading(null)
    }
  }

  const handleClone = async (force = false) => {
    setLoading('clone')
    try {
      const res = await fetch(`/api/reports/${reportId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null) as {
          error?: {
            code?: string
            message?: string
            details?: { daysAgo?: number }
          }
        } | null
        if (res.status === 409 && err?.error?.code === 'RECENT_CLONE_EXISTS') {
          setCloneWarningDaysAgo(err.error.details?.daysAgo ?? null)
          setShowCloneConfirm(true)
          setLoading(null)
          return
        }
        throw new Error(err?.error?.message ?? `Clone failed (${res.status})`)
      }
      const result = await res.json()
      const newId = result?.data?.id
      if (!newId) throw new Error('Clone succeeded but no ID returned')
      // Report Queue로 이동 → SlidePanel에서 draft 열기
      window.location.href = `/ip/reports?preview=${newId}`
    } catch (e) {
      addToast({ type: 'error', title: 'Clone failed', message: e instanceof Error ? e.message : 'Unknown error' })
      setLoading(null)
    }
  }

  const handleManualSubmit = async () => {
    setLoading('manualSubmit')
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'monitoring' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Manual submit failed')
      }
      addToast({ type: 'success', title: 'Submitted', message: 'RAV 수동 제출 처리 완료' })
      router.refresh()
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setLoading(null)
    }
  }

  const handleDecline = async () => {
    if (!declineReason.trim()) return
    setLoading('decline')
    try {
      const res = await fetch(`/api/reports/${reportId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellation_reason: declineReason.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Decline failed')
      }
      addToast({ type: 'success', title: 'Declined', message: '신고가 거절되었습니다.' })
      setShowDeclineModal(false)
      setDeclineReason('')
      setLoading(null)
      router.replace('/ip/reports/completed?status=cancelled')
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
      setLoading(null)
    }
  }

  const handleDelete = async () => {
    setLoading('delete')
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Delete failed')
      }
      addToast({ type: 'success', title: t('reports.detail.deleted'), message: t('reports.detail.deletedDesc') })
      setShowDeleteConfirm(false)
      setLoading(null)
      router.replace(backHref)
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
      setLoading(null)
      setShowDeleteConfirm(false)
    }
  }

  const handleForceResolved = async () => {
    setLoading('forceResolved')
    try {
      const res = await fetch(`/api/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_type: 'content_modified' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error?.message ?? 'Force resolve failed')
      }
      setShowForceResolveConfirm(false)
      setLoading(null)
      addToast({ type: 'success', title: 'Resolved', message: '해결 처리되어 Completed Reports로 이동합니다.' })
      router.replace('/ip/reports/completed?status=resolved')
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
      setLoading(null)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {/* Pending Review: Approve + Rewrite only */}
        {status === 'pending_review' && (
          <>
            <Button
              size="sm"
              loading={loading === 'approve'}
              onClick={handleApprove}
            >
              {t('reports.detail.approve')}
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

        {/* Rejected: Rewrite + Submit for Review */}
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

        {/* BR Submitting: Read-only spinner */}
        {status === 'br_submitting' && (
          <div className="flex items-center gap-2 text-sm text-th-text-muted">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>BR 제출 중...</span>
          </div>
        )}

        {/* Monitoring: BR 재신고 */}
        {status === 'monitoring' && (
          <Button
            variant="outline"
            size="sm"
            loading={loading === 'brResubmit'}
            onClick={handleForceResubmit}
          >
            BR 재신고
          </Button>
        )}

        {/* Clone as New — for resolved/unresolved/archived (Completed Reports) */}
        {['resolved', 'unresolved', 'archived'].includes(status) && (
          <Button
            variant="outline"
            size="sm"
            loading={loading === 'clone'}
            onClick={() => handleClone()}
          >
            Clone as New
          </Button>
        )}

        {/* Approved: Resubmit to BR (non-IP) or Mark Submitted (IP) */}
        {status === 'approved' && isAdmin && (
          brFormType === 'ip_violation' ? (
            <Button
              variant="outline"
              size="sm"
              loading={loading === 'manualSubmit'}
              onClick={handleManualSubmit}
            >
              Mark Submitted
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              loading={loading === 'brResubmit'}
              onClick={handleForceResubmit}
            >
              Resubmit to BR
            </Button>
          )
        )}

        {/* Decline — admin only, draft status */}
        {status === 'draft' && isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
            onClick={() => setShowDeclineModal(true)}
          >
            Decline
          </Button>
        )}

        {/* Delete */}
        {status === 'monitoring' && (
          <Button
            variant="outline"
            size="sm"
            className="border-st-success-text/30 text-st-success-text hover:bg-st-success-bg"
            onClick={() => setShowForceResolveConfirm(true)}
          >
            Force Resolved
          </Button>
        )}

        {/* Delete */}
        {canDelete && (
          <Button
            variant="outline"
            size="sm"
            className="border-st-danger-text/30 text-st-danger-text hover:bg-st-danger-text/10"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete
          </Button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showCloneConfirm}
        onClose={() => {
          if (loading === 'clone') return
          setShowCloneConfirm(false)
          setCloneWarningDaysAgo(null)
        }}
        title="Clone confirmation"
      >
        <p className="text-sm text-th-text-secondary">
          {cloneWarningDaysAgo != null
            ? `${cloneWarningDaysAgo}일 전에 동일 케이스에서 생성한 Clone 이력이 있습니다. 그래도 새로 만드시겠습니까?`
            : '동일 케이스에서 생성한 Clone 이력이 있습니다. 그래도 새로 만드시겠습니까?'}
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={loading === 'clone'}
            onClick={() => {
              setShowCloneConfirm(false)
              setCloneWarningDaysAgo(null)
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            loading={loading === 'clone'}
            onClick={() => handleClone(true)}
          >
            계속 생성
          </Button>
        </div>
      </Modal>

      {/* Force Resolved Confirmation Modal */}
      <Modal
        open={showForceResolveConfirm}
        onClose={() => {
          if (loading === 'forceResolved') return
          setShowForceResolveConfirm(false)
        }}
        title="해결 처리"
      >
        <p className="text-sm text-th-text-secondary">
          이 신고를 강제로 해결(Resolved) 처리하시겠습니까?
          처리 후 Completed Reports로 이동합니다.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={loading === 'forceResolved'}
            onClick={() => setShowForceResolveConfirm(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            className="bg-st-success-text hover:opacity-90"
            loading={loading === 'forceResolved'}
            onClick={handleForceResolved}
          >
            해결 처리
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Report"
      >
        <p className="text-sm text-th-text-secondary">
          이 신고를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            className="bg-st-danger-text hover:bg-st-danger-text/90"
            loading={loading === 'delete'}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </Modal>

      {/* Decline Modal */}
      <Modal
        open={showDeclineModal}
        onClose={() => { setShowDeclineModal(false); setDeclineReason('') }}
        title="Decline Report"
      >
        <p className="text-sm text-th-text-secondary">
          이 신고를 거절하시겠습니까? 사유를 입력해 주세요.
        </p>
        <Textarea
          className="mt-3"
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
          placeholder="거절 사유를 입력하세요"
          rows={3}
        />
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setShowDeclineModal(false); setDeclineReason('') }}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white"
            loading={loading === 'decline'}
            disabled={!declineReason.trim()}
            onClick={handleDecline}
          >
            Decline
          </Button>
        </div>
      </Modal>

      {/* Rewrite Modal — 2-step flow */}
      <Modal
        open={showRewriteModal}
        onClose={() => { setShowRewriteModal(false); resetRewriteModal() }}
        title={rewriteStep === 1 ? t('reports.detail.rewrite') : 'Review AI Rewrite'}
      >
        {rewriteStep === 1 ? (
          <>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t('reports.detail.rewriteFeedback')}
              rows={4}
            />
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => { setShowRewriteModal(false); resetRewriteModal() }}>
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                loading={loading === 'rewrite'}
                disabled={!feedback.trim()}
                onClick={handleRewritePreview}
              >
                {t('reports.detail.rewriteConfirm')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <Input
                label="Title"
                value={previewTitle}
                onChange={(e) => setPreviewTitle(e.target.value)}
              />
              <Textarea
                label="Body"
                value={previewBody}
                onChange={(e) => setPreviewBody(e.target.value)}
                rows={8}
              />
            </div>
            <div className="mt-4 flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setRewriteStep(1)}>
                ← Back
              </Button>
              <div className="flex gap-3">
                <Button variant="ghost" size="sm" onClick={() => { setShowRewriteModal(false); resetRewriteModal() }}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  loading={loading === 'rewriteSave'}
                  onClick={handleRewriteSave}
                >
                  Save & Submit
                </Button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
