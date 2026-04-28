'use client'

import type { BrCaseEventType } from '@/types/br-case'
import { formatDateTime } from '@/lib/utils/date'

const EVENT_LABELS: Record<string, string> = {
  br_submitted: 'Case submitted to BR',
  br_amazon_replied: 'Amazon replied',
  br_reply_sent: 'Reply sent to Amazon',
  br_info_requested: 'Additional info requested',
  br_status_changed: 'Status changed',
  br_case_closed: 'Case closed',
  br_case_reopened: 'Case reopened',
  br_escalated: 'Case escalated',
  br_sla_warning: 'SLA warning',
  br_sla_breached: 'SLA breached',
  br_note_added: 'Internal note added',
  br_file_attached: 'File attached',
}

type CaseEventProps = {
  eventType: BrCaseEventType
  oldValue: string | null
  newValue: string | null
  createdAt: string
}

export const CaseEvent = ({ eventType, oldValue, newValue, createdAt }: CaseEventProps) => {
  const label = EVENT_LABELS[eventType] ?? eventType
  const detail = oldValue && newValue
    ? `${oldValue} → ${newValue}`
    : newValue ?? ''

  return (
    <div className="flex items-center justify-center gap-3 py-1.5">
      <div className="h-px flex-1 bg-th-border" />
      <div className="flex items-center gap-2 text-xs text-th-text-muted">
        <span>{label}</span>
        {detail && <span className="font-medium text-th-text-secondary">{detail}</span>}
        <span>{formatDateTime(createdAt)}</span>
      </div>
      <div className="h-px flex-1 bg-th-border" />
    </div>
  )
}
