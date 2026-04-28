'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { formatDateTime } from '@/lib/utils/date'

type CaseNoteProps = {
  id: string
  reportId: string
  body: string
  userName: string | null
  createdAt: string
  isOwner: boolean
  onUpdate?: () => void
}

export const CaseNote = ({ id, reportId, body, userName, createdAt, isOwner, onUpdate }: CaseNoteProps) => {
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState(body)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!editBody.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/${reportId}/case-notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editBody }),
      })
      if (res.ok) {
        setEditing(false)
        onUpdate?.()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await fetch(`/api/reports/${reportId}/case-notes/${id}`, { method: 'DELETE' })
      onUpdate?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-yellow-400/40 bg-yellow-50 px-4 py-3 dark:bg-yellow-900/10">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
          🔒 Internal Note
        </span>
        <span className="text-xs text-th-text-muted">{userName ?? 'Unknown'}</span>
        <span className="text-xs text-th-text-muted">{formatDateTime(createdAt)}</span>
        {isOwner && !editing && (
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-th-text-muted hover:text-th-text-secondary"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs text-st-danger-text hover:text-st-danger-text/80"
            >
              Delete
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3} />
          <div className="flex gap-2">
            <Button size="sm" loading={loading} onClick={handleSave}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditBody(body) }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-th-text">{body}</p>
      )}
    </div>
  )
}
