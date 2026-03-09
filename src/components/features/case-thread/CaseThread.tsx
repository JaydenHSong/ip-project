'use client'

import { useState, useEffect, useCallback } from 'react'
import { CaseMessage } from './CaseMessage'
import { CaseNote } from './CaseNote'
import { CaseEvent } from './CaseEvent'
import { AddNoteForm } from './AddNoteForm'
import { ReplyForm } from './ReplyForm'
import { CaseCloseButton } from './CaseCloseButton'
import type { BrCaseEventType } from '@/types/br-case'

type ThreadItem = {
  type: 'message' | 'note' | 'event'
  id: string
  timestamp: string
  data: {
    direction?: 'inbound' | 'outbound'
    sender?: string
    body?: string
    sent_at?: string
    created_at?: string
    user_id?: string
    users?: { name: string } | null
    event_type?: string
    old_value?: string | null
    new_value?: string | null
  }
}

type CaseThreadProps = {
  reportId: string
  currentUserId?: string
  canEdit: boolean
  hasPendingReply?: boolean
  brCaseStatus?: string | null
  onCaseChanged?: () => void
}

export const CaseThread = ({ reportId, currentUserId, canEdit, hasPendingReply = false, brCaseStatus, onCaseChanged }: CaseThreadProps) => {
  const [items, setItems] = useState<ThreadItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchThread = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports/${reportId}/case-thread`)
      if (res.ok) {
        const data = (await res.json()) as { items: ThreadItem[] }
        setItems(data.items)
      }
    } finally {
      setLoading(false)
    }
  }, [reportId])

  useEffect(() => { fetchThread() }, [fetchThread])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg className="h-5 w-5 animate-spin text-th-text-muted" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-th-text-muted">
          No messages yet. Messages will appear here when Amazon responds.
        </p>
      ) : (
        items.map((item) => {
          if (item.type === 'message') {
            return (
              <CaseMessage
                key={item.id}
                direction={item.data.direction ?? 'inbound'}
                sender={item.data.sender ?? 'Unknown'}
                body={item.data.body ?? ''}
                sentAt={item.data.sent_at ?? item.timestamp}
              />
            )
          }
          if (item.type === 'note') {
            return (
              <CaseNote
                key={item.id}
                id={item.id}
                reportId={reportId}
                body={item.data.body ?? ''}
                userName={item.data.users?.name ?? null}
                createdAt={item.data.created_at ?? item.timestamp}
                isOwner={item.data.user_id === currentUserId}
                onUpdate={fetchThread}
              />
            )
          }
          if (item.type === 'event') {
            return (
              <CaseEvent
                key={item.id}
                eventType={(item.data.event_type ?? 'br_status_changed') as BrCaseEventType}
                oldValue={item.data.old_value ?? null}
                newValue={item.data.new_value ?? null}
                createdAt={item.data.created_at ?? item.timestamp}
              />
            )
          }
          return null
        })
      )}

      {canEdit && brCaseStatus !== 'closed' && (
        <ReplyForm reportId={reportId} hasPendingReply={hasPendingReply} onSent={() => { fetchThread(); onCaseChanged?.() }} />
      )}

      {canEdit && <AddNoteForm reportId={reportId} onAdded={fetchThread} />}

      {canEdit && brCaseStatus !== 'closed' && (
        <CaseCloseButton reportId={reportId} onClosed={onCaseChanged} />
      )}
    </div>
  )
}
