-- Migration 004: Add 'archived' status to reports + archived columns + monitoring seed
-- Required for: /reports/archived page, archive/unarchive API routes, monitoring settings

-- 1. Drop old CHECK and add new with 'archived'
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE reports ADD CONSTRAINT reports_status_check
  CHECK (status IN (
    'draft', 'pending_review', 'approved', 'rejected', 'cancelled',
    'submitted', 'monitoring', 'resolved', 'unresolved', 'resubmitted',
    'escalated', 'archived'
  ));

-- 2. Add archive-related columns
ALTER TABLE reports ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS pre_archive_status TEXT;

-- 3. Add monitoring seed data to system_configs
INSERT INTO system_configs (key, value, description) VALUES
  ('monitoring_interval_days', '3', 'Days between follow-up monitoring checks'),
  ('monitoring_max_days', '90', 'Maximum days to continue monitoring a report')
ON CONFLICT (key) DO NOTHING;
