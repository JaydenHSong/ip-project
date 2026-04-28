'use client'

import { useState, useEffect } from 'react'
import { formatDateTime } from '@/lib/utils/date'

type EventRow = {
  id: string
  event_type: string
  old_value: string | null
  new_value: string | null
  metadata: Record<string, unknown>
  actor_id: string | null
  created_at: string
}

const EVENT_ICONS: Record<string, string> = {
  br_submitted: '📨',
  br_amazon_replied: '💬',
  br_reply_sent: '📤',
  br_info_requested: '❓',
  br_status_changed: '🔄',
  br_case_closed: '✅',
  br_case_reopened: '🔓',
  br_escalated: '⚡',
  br_sla_warning: '⏰',
  br_sla_breached: '🚨',
  br_note_added: '📝',
  br_file_attached: '📎',
}

const EVENT_LABELS: Record<string, string> = {
  br_submitted: 'Case submitted to Brand Registry',
  br_amazon_replied: 'Amazon replied',
  br_reply_sent: 'Reply sent to Amazon',
  br_info_requested: 'Additional information requested',
  br_status_changed: 'Case status changed',
  br_case_closed: 'Case closed',
  br_case_reopened: 'Case reopened',
  br_escalated: 'Case escalated',
  br_sla_warning: 'SLA warning threshold reached',
  br_sla_breached: 'SLA breached',
  br_note_added: 'Internal note added',
  br_file_attached: 'File attached',
}

type CaseActivityLogProps = {
  reportId: string
}

export const CaseActivityLog = ({ reportId }: CaseActivityLogProps) => {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/reports/${reportId}/case-events`)
      .then((res) => res.json())
      .then((data: { events: EventRow[] }) => setEvents(data.events))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [reportId])

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

  if (events.length === 0) {
    return <p className="py-6 text-center text-sm text-th-text-muted">No activity yet.</p>
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical timeline line */}
      <div className="absolute left-4 top-0 h-full w-px bg-th-border" />

      {events.map((event) => {
        const icon = EVENT_ICONS[event.event_type] ?? '📋'
        const label = EVENT_LABELS[event.event_type] ?? event.event_type
        const detail = event.old_value && event.new_value
          ? `${event.old_value} → ${event.new_value}`
          : event.new_value ?? ''

        return (
          <div key={event.id} className="relative flex items-start gap-3 py-2.5 pl-2">
            <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-th-bg-secondary text-xs">
              {icon}
            </div>
            <div className="flex-1">
              <p className="text-sm text-th-text">{label}</p>
              {detail && (
                <p className="mt-0.5 text-xs text-th-text-secondary">{detail}</p>
              )}
              <p className="mt-0.5 text-xs text-th-text-muted">
                {formatDateTime(event.created_at)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
