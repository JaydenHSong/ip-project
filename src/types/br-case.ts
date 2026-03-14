// BR Case Management Types

// === BR Case Status ===

export const BR_CASE_STATUSES = [
  'open', 'work_in_progress', 'answered', 'needs_attention', 'closed',
] as const
export type BrCaseStatus = (typeof BR_CASE_STATUSES)[number]

// === Message Direction ===

export const BR_MESSAGE_DIRECTIONS = ['inbound', 'outbound'] as const
export type BrMessageDirection = (typeof BR_MESSAGE_DIRECTIONS)[number]

// === Case Event Types ===

export const BR_CASE_EVENT_TYPES = [
  'br_submitted',
  'br_amazon_replied',
  'br_reply_sent',
  'br_info_requested',
  'br_status_changed',
  'br_case_closed',
  'br_case_reopened',
  'br_escalated',
  'br_note_added',
  'br_file_attached',
] as const
export type BrCaseEventType = (typeof BR_CASE_EVENT_TYPES)[number]

// === Notification Channel ===

export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'slack'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

// === Notification Trigger Types ===

export const NOTIFICATION_TRIGGER_TYPES = [
  'amazon_replied',
  'action_required',
  'stale_case',
  'case_closed',
] as const
export type NotificationTriggerType = (typeof NOTIFICATION_TRIGGER_TYPES)[number]

// === DB Row Types ===

export type BrCaseMessageAttachment = {
  name: string
  url: string
  size: number
}

export type BrCaseMessage = {
  id: string
  report_id: string
  br_case_id: string
  direction: BrMessageDirection
  sender: string
  body: string
  attachments: BrCaseMessageAttachment[]
  sent_at: string
  scraped_at: string
  created_at: string
}

export type BrCaseNote = {
  id: string
  report_id: string
  user_id: string
  body: string
  created_at: string
  updated_at: string
}

export type BrCaseEventMetadata = Record<string, unknown>

export type BrCaseEvent = {
  id: string
  report_id: string
  event_type: BrCaseEventType
  old_value: string | null
  new_value: string | null
  metadata: BrCaseEventMetadata
  actor_id: string | null
  created_at: string
}

export type NotificationRuleCondition = Record<string, unknown>

export type NotificationRule = {
  id: string
  trigger_type: NotificationTriggerType
  condition: NotificationRuleCondition
  target_role: string
  channel: NotificationChannel
  enabled: boolean
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  report_id: string | null
  type: string
  title: string
  body: string | null
  read: boolean
  created_at: string
}

// === Pending Reply Attachment ===

export type BrReplyPendingAttachment = {
  name: string
  storage_path: string
  size: number
}
