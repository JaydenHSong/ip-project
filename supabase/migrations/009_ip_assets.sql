-- Migration 009: IP Assets table for IP Registry
-- Stores patents, design patents, trademarks, copyrights
-- Synced from Monday.com via /api/patents/sync (단방향)

CREATE TABLE IF NOT EXISTS ip_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_type TEXT NOT NULL
    CHECK (ip_type IN ('patent', 'design_patent', 'trademark', 'copyright')),
  management_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  status TEXT NOT NULL DEFAULT 'filed'
    CHECK (status IN ('preparing', 'filed', 'oa', 'registered', 'transferred', 'disputed', 'expired', 'abandoned')),
  application_number TEXT,
  application_date DATE,
  registration_number TEXT,
  registration_date DATE,
  expiry_date DATE,
  keywords TEXT[] DEFAULT '{}',
  image_urls TEXT[] DEFAULT '{}',
  related_products TEXT[] DEFAULT '{}',
  report_url TEXT,
  assignee TEXT,
  notes TEXT,
  monday_item_id TEXT,
  monday_board_id TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for Monday.com upsert (monday_item_id 기준 중복 방지)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_assets_monday_item
  ON ip_assets (monday_item_id) WHERE monday_item_id IS NOT NULL;

-- Index for type filtering
CREATE INDEX IF NOT EXISTS idx_ip_assets_type ON ip_assets (ip_type);

-- Index for search
CREATE INDEX IF NOT EXISTS idx_ip_assets_search
  ON ip_assets USING gin (to_tsvector('simple', coalesce(management_number, '') || ' ' || coalesce(name, '')));

-- RLS
ALTER TABLE ip_assets ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자 읽기 가능
CREATE POLICY ip_assets_select ON ip_assets
  FOR SELECT TO authenticated USING (true);

-- Admin만 수정 가능
CREATE POLICY ip_assets_insert ON ip_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY ip_assets_update ON ip_assets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY ip_assets_delete ON ip_assets
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- audit_logs action에 patent_sync 추가
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check
  CHECK (action IN (
    'login', 'logout', 'role_changed',
    'report_created', 'report_approved', 'report_rejected',
    'report_cancelled', 'report_submitted', 'report_edited',
    'sc_credential_accessed', 'sc_credential_updated',
    'campaign_created', 'campaign_updated', 'campaign_deleted',
    'patent_sync_triggered', 'patent_sync_completed', 'patent_sync',
    'settings_changed', 'system_error',
    'update',
    'monitoring_started', 'monitoring_callback', 'monitoring_resolved',
    'submitted_sc', 'auto_submitted_sc', 'auto_submit_failed_sc'
  ));
