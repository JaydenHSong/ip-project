'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { XCircle } from 'lucide-react'

type CaseCloseButtonProps = {
  reportId: string
  onClosed?: () => void
}

export const CaseCloseButton = ({ reportId, onClosed }: CaseCloseButtonProps) => {
  const [confirming, setConfirming] = useState(false)
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
      onClosed?.()
    } catch {
      setConfirming(false)
    } finally {
      setLoading(false)
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-50/50 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100/50 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        <XCircle className="h-4 w-4" />
        Close Case
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-red-400/30 bg-red-50/50 p-3 dark:bg-red-900/10">
      <p className="mb-2 text-sm font-medium text-red-700 dark:text-red-300">
        Close this case?
      </p>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setResolution('resolved')}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            resolution === 'resolved'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-th-bg-secondary text-th-text-muted hover:bg-th-bg-hover'
          }`}
        >
          Resolved
        </button>
        <button
          type="button"
          onClick={() => setResolution('unresolved')}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            resolution === 'unresolved'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-th-bg-secondary text-th-text-muted hover:bg-th-bg-hover'
          }`}
        >
          Unresolved
        </button>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="danger" loading={loading} onClick={handleClose} className="flex-1">
          Confirm Close
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
