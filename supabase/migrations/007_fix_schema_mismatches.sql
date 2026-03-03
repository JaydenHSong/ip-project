-- Migration 007: Fix schema-code mismatches for Supabase live integration
-- Adds missing columns and extends CHECK constraints used by API routes

-- ============================================================
-- 1. reports: add sc_submit_data JSONB
-- Used by: approve-submit, confirm-submitted, pending-sc-submit routes
-- ============================================================
ALTER TABLE reports ADD COLUMN IF NOT EXISTS sc_submit_data JSONB;

COMMENT ON COLUMN reports.sc_submit_data IS
  'Temporary SC form data for extension auto-fill. Cleared after submission confirmed.';

-- ============================================================
-- 2. audit_logs: add details JSONB
-- Used by: users/[id], sc-automation, confirm-submitted,
--          start-monitoring, resolve, monitoring/callback routes
-- ============================================================
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB;

COMMENT ON COLUMN audit_logs.details IS
  'Additional context for the audit action (e.g., field changes, resolution type).';

-- ============================================================
-- 3. audit_logs: extend action CHECK constraint
-- Original (001): login, logout, role_changed, report_created, report_approved,
--   report_rejected, report_cancelled, report_submitted, report_edited,
--   sc_credential_accessed, sc_credential_updated, campaign_created,
--   campaign_updated, campaign_deleted, patent_sync_triggered,
--   patent_sync_completed, settings_changed, system_error
--
-- New actions used by API routes:
--   update, monitoring_started, monitoring_callback, monitoring_resolved,
--   submitted_sc, auto_submitted_sc, auto_submit_failed_sc
-- ============================================================
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check
  CHECK (action IN (
    -- Original actions
    'login', 'logout', 'role_changed',
    'report_created', 'report_approved', 'report_rejected',
    'report_cancelled', 'report_submitted', 'report_edited',
    'sc_credential_accessed', 'sc_credential_updated',
    'campaign_created', 'campaign_updated', 'campaign_deleted',
    'patent_sync_triggered', 'patent_sync_completed',
    'settings_changed', 'system_error',
    -- New actions (007)
    'update',
    'monitoring_started', 'monitoring_callback', 'monitoring_resolved',
    'submitted_sc', 'auto_submitted_sc', 'auto_submit_failed_sc'
  ));
