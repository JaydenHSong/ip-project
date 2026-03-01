'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

type CampaignActionsProps = {
  campaignId: string
  status: string
  userRole: string
}

export const CampaignActions = ({ campaignId, status, userRole }: CampaignActionsProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleAction = async (action: 'pause' | 'resume' | 'delete' | 'export') => {
    setLoading(action)

    if (action === 'export') {
      window.open(`/api/campaigns/${campaignId}/export`, '_blank')
      setLoading(null)
      return
    }

    if (action === 'delete') {
      const res = await fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/campaigns')
        router.refresh()
      }
      setLoading(null)
      setShowDeleteModal(false)
      return
    }

    const res = await fetch(`/api/campaigns/${campaignId}/${action}`, { method: 'POST' })
    if (res.ok) {
      router.refresh()
    }
    setLoading(null)
  }

  return (
    <>
      <div className="flex gap-2">
        {status === 'active' && (
          <Button
            variant="outline"
            size="sm"
            loading={loading === 'pause'}
            onClick={() => handleAction('pause')}
          >
            Pause
          </Button>
        )}
        {status === 'paused' && (
          <Button
            variant="outline"
            size="sm"
            loading={loading === 'resume'}
            onClick={() => handleAction('resume')}
          >
            Resume
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          loading={loading === 'export'}
          onClick={() => handleAction('export')}
        >
          Export CSV
        </Button>
        {userRole === 'admin' && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete
          </Button>
        )}
      </div>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Campaign"
      >
        <p className="text-sm text-th-text-secondary">
          Are you sure you want to delete this campaign? This action cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={loading === 'delete'}
            onClick={() => handleAction('delete')}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  )
}
