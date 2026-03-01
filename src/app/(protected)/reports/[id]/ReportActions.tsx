'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { useI18n } from '@/lib/i18n/context'

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
  const [feedback, setFeedback] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  const canAct = userRole === 'admin' || userRole === 'editor'
  if (!canAct) return null

  const handleApprove = async () => {
    setLoading('approve')
    // Demo mode: just refresh
    router.refresh()
    setLoading(null)
  }

  const handleSubmitReview = async () => {
    setLoading('submitReview')
    router.refresh()
    setLoading(null)
  }

  const handleSubmitSC = async () => {
    setLoading('submitSC')
    router.refresh()
    setLoading(null)
  }

  const handleRewrite = async () => {
    setLoading('rewrite')
    router.refresh()
    setLoading(null)
    setShowRewriteModal(false)
    setFeedback('')
  }

  const handleCancel = async () => {
    setLoading('cancel')
    router.refresh()
    setLoading(null)
    setShowCancelModal(false)
    setCancelReason('')
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
              onClick={() => setShowRewriteModal(true)}
            >
              {t('reports.detail.rewrite')}
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
        <Button
          variant="danger"
          size="sm"
          onClick={() => setShowCancelModal(true)}
        >
          {t('reports.detail.cancelReport')}
        </Button>
      </div>

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
