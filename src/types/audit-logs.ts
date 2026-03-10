export const AUDIT_ACTIONS = [
  'login', 'logout', 'role_changed',
  'report_created', 'report_approved', 'report_rejected',
  'report_cancelled', 'report_submitted', 'report_edited',
  'pd_credential_accessed', 'pd_credential_updated',
  'campaign_created', 'campaign_updated', 'campaign_deleted',
  'patent_sync_triggered', 'patent_sync_completed',
  'settings_changed', 'system_error',
  'bulk_br_resubmit', 'bulk_archive',
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export type AuditLog = {
  id: number
  user_id: string | null
  action: AuditAction
  resource_type: string | null
  resource_id: string | null
  before_data: unknown
  after_data: unknown
  ip_address: string | null
  user_agent: string | null
  created_at: string
}
