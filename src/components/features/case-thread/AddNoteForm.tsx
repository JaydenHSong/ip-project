'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'

type AddNoteFormProps = {
  reportId: string
  onAdded?: () => void
}

export const AddNoteForm = ({ reportId, onAdded }: AddNoteFormProps) => {
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!body.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/${reportId}/case-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      if (res.ok) {
        setBody('')
        onAdded?.()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-yellow-400/30 bg-yellow-50/50 p-3 dark:bg-yellow-900/5">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add internal note (team only)..."
        rows={2}
      />
      <div className="mt-2 flex justify-end">
        <Button size="sm" loading={loading} onClick={handleSubmit} disabled={!body.trim()}>
          Add Note
        </Button>
      </div>
    </div>
  )
}
