'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

type CaseCloseButtonProps = {
  reportId: string
  onClosed?: () => void
}

export const CaseCloseButton = ({ reportId, onClosed }: CaseCloseButtonProps) => {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleClose = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/${reportId}/case-close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      <Button variant="ghost" size="sm" className="text-th-text-muted" onClick={() => setConfirming(true)}>
        Close Case
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-50/50 px-3 py-2 dark:bg-red-900/10">
      <span className="text-sm text-red-700 dark:text-red-300">Close this case?</span>
      <Button size="sm" variant="danger" loading={loading} onClick={handleClose}>
        Confirm
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  )
}
