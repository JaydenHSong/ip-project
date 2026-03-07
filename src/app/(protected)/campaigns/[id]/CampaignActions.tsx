'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/hooks/useToast'

type CampaignActionsProps = {
  campaignId: string
  status: string
  userRole: string
}

export const CampaignActions = ({ campaignId, status, userRole }: CampaignActionsProps) => {
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleForceRun = async () => {
    setLoading('force-run')
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/force-run`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        addToast({ type: 'success', title: 'Crawl job queued successfully' })
      } else {
        addToast({ type: 'error', title: data.error?.message ?? 'Failed to trigger crawl' })
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to connect to crawler' })
    }
    setLoading(null)
  }

  const handleAction = async (action: 'pause' | 'resume' | 'delete' | 'export') => {
    setLoading(action)

    if (action === 'export') {
      window.open(`/api/campaigns/${campaignId}/export`, '_blank')
      setLoading(null)
      return
    }

    if (action === 'delete') {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error?.message ?? 'Delete failed')
        }
        addToast({ type: 'success', title: 'Campaign deleted' })
        router.push('/campaigns')
        router.refresh()
      } catch (e) {
        addToast({ type: 'error', title: 'Delete failed', message: e instanceof Error ? e.message : 'Unknown error' })
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
      <div className="flex items-center gap-2">
        {status === 'active' && (userRole === 'owner' || userRole === 'admin') && (
          <Button
            variant="outline"
            size="sm"
            loading={loading === 'force-run'}
            onClick={handleForceRun}
          >
            Run Now
          </Button>
        )}
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
        {(userRole === 'owner' || userRole === 'admin') && (
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
