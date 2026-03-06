-- ============================================================
-- 012: Fix RLS policies + notices table verification
-- Issues: listings/campaigns RLS error, notices schema cache
-- Date: 2026-03-05
-- ============================================================

-- STEP 0: Diagnostic — run this first to see current state
-- (comment out after checking)
/*
SELECT tablename, policyname, cmd, permissive, with_check
FROM pg_policies
WHERE tablename IN ('listings', 'campaigns', 'notices')
ORDER BY tablename, policyname;

SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass AND contype = 'c';

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'notices';
*/

-- ============================================================
-- STEP 1: users role constraint (safe — DROP IF EXISTS)
-- ============================================================
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('owner', 'admin', 'editor', 'viewer_plus', 'viewer'));

-- ============================================================
-- STEP 2: campaigns — DROP + recreate insert/update/delete with owner
-- ============================================================
DROP POLICY IF EXISTS "campaigns_insert" ON campaigns;
CREATE POLICY "campaigns_insert" ON campaigns
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin', 'editor'))
  );

DROP POLICY IF EXISTS "campaigns_update" ON campaigns;
CREATE POLICY "campaigns_update" ON campaigns
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin', 'editor'))
  );

DROP POLICY IF EXISTS "campaigns_delete" ON campaigns;
CREATE POLICY "campaigns_delete" ON campaigns
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- ============================================================
-- STEP 3: listings — DROP + recreate insert with owner
-- Also add UPDATE policy (missing in original)
-- ============================================================
DROP POLICY IF EXISTS "listings_insert" ON listings;
CREATE POLICY "listings_insert" ON listings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin', 'editor'))
  );

DROP POLICY IF EXISTS "listings_update" ON listings;
CREATE POLICY "listings_update" ON listings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin', 'editor'))
  );

-- ============================================================
-- STEP 4: reports — owner added
-- ============================================================
DROP POLICY IF EXISTS "reports_insert" ON reports;
CREATE POLICY "reports_insert" ON reports
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin', 'editor'))
  );

DROP POLICY IF EXISTS "reports_update_own" ON reports;
CREATE POLICY "reports_update_own" ON reports
  FOR UPDATE USING (
    (created_by = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'editor'))
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- ============================================================
-- STEP 5: notices table (safe — IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'notice'
    CHECK (category IN ('update', 'policy', 'notice', 'system')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notices_created ON notices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notices_pinned ON notices(is_pinned, created_at DESC);

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- notices RLS (safe — DROP IF EXISTS)
DROP POLICY IF EXISTS "notices_select" ON notices;
CREATE POLICY "notices_select" ON notices
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "notices_insert" ON notices;
CREATE POLICY "notices_insert" ON notices
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin', 'editor'))
  );

DROP POLICY IF EXISTS "notices_update" ON notices;
CREATE POLICY "notices_update" ON notices
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

DROP POLICY IF EXISTS "notices_delete" ON notices;
CREATE POLICY "notices_delete" ON notices
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- ============================================================
-- STEP 6: Other tables with owner role (safe — idempotent)
-- ============================================================

-- users
DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- audit_logs
DROP POLICY IF EXISTS "audit_admin_read" ON audit_logs;
CREATE POLICY "audit_admin_read" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- system_configs
DROP POLICY IF EXISTS "system_configs_update" ON system_configs;
CREATE POLICY "system_configs_update" ON system_configs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- report_templates
DROP POLICY IF EXISTS "templates_insert" ON report_templates;
CREATE POLICY "templates_insert" ON report_templates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );
DROP POLICY IF EXISTS "templates_update" ON report_templates;
CREATE POLICY "templates_update" ON report_templates
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );
DROP POLICY IF EXISTS "templates_delete" ON report_templates;
CREATE POLICY "templates_delete" ON report_templates
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- sc_credentials
DROP POLICY IF EXISTS "sc_credentials_admin_only" ON sc_credentials;
CREATE POLICY "sc_credentials_admin_only" ON sc_credentials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- campaign_listings
DROP POLICY IF EXISTS "campaign_listings_insert" ON campaign_listings;
CREATE POLICY "campaign_listings_insert" ON campaign_listings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin', 'editor'))
  );

-- changelog_entries
DROP POLICY IF EXISTS "changelog_insert" ON changelog_entries;
CREATE POLICY "changelog_insert" ON changelog_entries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );
DROP POLICY IF EXISTS "changelog_update" ON changelog_entries;
CREATE POLICY "changelog_update" ON changelog_entries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- notifications type constraint (add notice_new)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'report_approved', 'report_rejected', 'report_submitted',
    'followup_change_detected', 'followup_no_change',
    'campaign_completed', 'system_error',
    'patent_sync_completed', 'changelog_new',
    'notice_new'
  ));

-- ============================================================
-- STEP 7: Notify PostgREST to reload schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
