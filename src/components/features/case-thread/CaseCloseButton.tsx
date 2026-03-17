'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { XCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

type CaseCloseButtonProps = {
  reportId: string
  onClosed?: () => void
}

export const CaseCloseButton = ({ reportId, onClosed }: CaseCloseButtonProps) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resolution, setResolution] = useState<'resolved' | 'unresolved'>('resolved')

  const handleClose = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/${reportId}/case-close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message ?? 'Failed to close case')
      }
      setOpen(false)
      onClosed?.()
    } catch {
      // keep modal open
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-full border border-red-400/30 px-2.5 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-100/50 dark:hover:bg-red-900/20"
      >
        <XCircle className="h-3.5 w-3.5" />
        Close Case
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Close Case">
        <div className="space-y-4">
          <p className="text-sm text-th-text-secondary">
            How was this case resolved?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setResolution('resolved')}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                resolution === 'resolved'
                  ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/50 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-th-bg-secondary text-th-text-muted hover:bg-th-bg-hover'
              }`}
            >
              Resolved
            </button>
            <button
              type="button"
              onClick={() => setResolution('unresolved')}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                resolution === 'unresolved'
                  ? 'bg-red-100 text-red-700 ring-2 ring-red-500/50 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-th-bg-secondary text-th-text-muted hover:bg-th-bg-hover'
              }`}
            >
              Unresolved
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" loading={loading} onClick={handleClose}>
              Close Case
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
