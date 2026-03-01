export const NOTIFICATION_TYPES = [
  'report_approved', 'report_rejected', 'report_submitted',
  'followup_change_detected', 'followup_no_change',
  'campaign_completed', 'system_error',
  'patent_sync_completed', 'changelog_new',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export type Notification = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  metadata: Record<string, unknown>
  is_read: boolean
  created_at: string
}
