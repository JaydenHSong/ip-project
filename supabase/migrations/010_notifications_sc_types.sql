-- Migration 010: Add SC submit notification types
-- Required for: SC 제출 성공/실패 알림

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'report_approved', 'report_rejected', 'report_submitted',
    'followup_change_detected', 'followup_no_change',
    'campaign_completed', 'system_error',
    'patent_sync_completed', 'changelog_new',
    'sc_submit_success', 'sc_submit_failed'
  ));
