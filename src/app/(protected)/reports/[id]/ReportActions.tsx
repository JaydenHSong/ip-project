'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { useI18n } from '@/lib/i18n/context'
import { REJECTION_CATEGORIES } from '@/types/reports'

type ReportActionsProps = {
  reportId: string
  status: string
  userRole: string
}

export const ReportActions = ({ reportId, status, userRole }: ReportActionsProps) => {
  const router = useRouter()
  const { t } = useI18n()
  const [loading, setLoading] = useState<string | null>(null)
  const [showRewriteModal, setShowRewriteModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [rejectionCategory, setRejectionCategory] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

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

  const handleCancel = async () => {
    if (!cancelReason.trim()) return
    setLoading('cancel')
    try {
      const res = await fetch(`/api/reports/${reportId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancellation_reason: cancelReason.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Cancel failed')
      }
      setShowCancelModal(false)
      setCancelReason('')
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
        {['draft', 'pending_review', 'approved'].includes(status) && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowCancelModal(true)}
          >
            {t('reports.detail.cancelReport')}
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

      {/* Cancel Modal */}
      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title={t('reports.detail.cancelReport')}
      >
        <p className="mb-3 text-sm text-th-text-secondary">
          {t('reports.detail.cancelConfirm')}
        </p>
        <Textarea
          label={t('reports.detail.cancelReason')}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={3}
        />
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowCancelModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={loading === 'cancel'}
            disabled={!cancelReason.trim()}
            onClick={handleCancel}
          >
            {t('reports.detail.cancelReport')}
          </Button>
        </div>
      </Modal>
    </>
  )
}
