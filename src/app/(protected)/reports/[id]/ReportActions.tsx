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
  userRole: string
  createdBy?: string | null
  currentUserId?: string | null
  resubmitCount?: number
  nextResubmitAt?: string | null
}

export const ReportActions = ({
  reportId,
  status,
  brFormType,
  userRole,
  createdBy,
  currentUserId,
  resubmitCount,
  nextResubmitAt,
}: ReportActionsProps) => {
  const router = useRouter()
  const { t } = useI18n()
  const { addToast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  const [showRewriteModal, setShowRewriteModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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
        body: JSON.stringify({}),
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

  const handleClone = async () => {
    setLoading('clone')
    try {
      const res = await fetch(`/api/reports/${reportId}/clone`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error?.message ?? `Clone failed (${res.status})`)
      }
      const result = await res.json()
      const newId = result?.data?.id
      if (!newId) throw new Error('Clone succeeded but no ID returned')
      // Full page navigation — router.push unreliable inside SlidePanel
      window.location.href = `/reports/${newId}`
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
      router.replace('/reports')
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
      setLoading(null)
      setShowDeleteConfirm(false)
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

        {/* Monitoring: Status + BR 재신고 */}
        {status === 'monitoring' && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-th-text-muted">모니터링 중...</span>
            <Button
              variant="outline"
              size="sm"
              loading={loading === 'brResubmit'}
              onClick={handleForceResubmit}
            >
              BR 재신고
            </Button>
          </div>
        )}

        {/* Unresolved: Resubmit info + Force resubmit */}
        {status === 'unresolved' && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-th-text-muted">
              {nextResubmitAt
                ? `재제출 예정: ${formatDate(nextResubmitAt)} (${resubmitCount ?? 0}회 완료)`
                : `미해결 (${resubmitCount ?? 0}회 재제출)`}
            </span>
            <Button
              variant="outline"
              size="sm"
              loading={loading === 'forceResubmit'}
              onClick={handleForceResubmit}
            >
              강제 재제출
            </Button>
          </div>
        )}

        {/* Resolved: Done + BR 재신고 */}
        {status === 'resolved' && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-st-success-text">해결 완료</span>
            <Button
              variant="outline"
              size="sm"
              loading={loading === 'brResubmit'}
              onClick={handleForceResubmit}
            >
              BR 재신고
            </Button>
          </div>
        )}

        {/* Clone as New — for monitoring/resolved/unresolved/archived */}
        {['monitoring', 'resolved', 'unresolved', 'archived'].includes(status) && (
          <Button
            variant="outline"
            size="sm"
            loading={loading === 'clone'}
            onClick={handleClone}
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
