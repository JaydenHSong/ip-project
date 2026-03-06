-- Fix RLS policies to include 'owner' role
-- owner는 admin 이상의 최고 권한이므로 admin이 있는 곳에 모두 추가

-- ============================================================
-- 먼저 users 테이블의 role CHECK 제약조건 업데이트
-- owner, viewer_plus 역할 추가
-- ============================================================
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('owner', 'admin', 'editor', 'viewer_plus', 'viewer'));

-- ============================================================
-- users: owner도 수정 가능
-- ============================================================
DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- ============================================================
-- campaigns: owner 추가
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
-- reports: owner 추가
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
-- audit_logs: owner도 읽기 가능
-- ============================================================
DROP POLICY IF EXISTS "audit_admin_read" ON audit_logs;
CREATE POLICY "audit_admin_read" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- ============================================================
-- system_configs: owner 추가
-- ============================================================
DROP POLICY IF EXISTS "system_configs_update" ON system_configs;
CREATE POLICY "system_configs_update" ON system_configs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- ============================================================
-- report_templates: owner 추가
-- ============================================================
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

-- ============================================================
-- trademarks: owner 추가
-- ============================================================
DROP POLICY IF EXISTS "trademarks_insert" ON trademarks;
CREATE POLICY "trademarks_insert" ON trademarks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

DROP POLICY IF EXISTS "trademarks_update" ON trademarks;
CREATE POLICY "trademarks_update" ON trademarks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

DROP POLICY IF EXISTS "trademarks_delete" ON trademarks;
CREATE POLICY "trademarks_delete" ON trademarks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- ============================================================
-- product_categories: owner 추가
-- ============================================================
DROP POLICY IF EXISTS "categories_insert" ON product_categories;
CREATE POLICY "categories_insert" ON product_categories
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

DROP POLICY IF EXISTS "categories_update" ON product_categories;
CREATE POLICY "categories_update" ON product_categories
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

DROP POLICY IF EXISTS "categories_delete" ON product_categories;
CREATE POLICY "categories_delete" ON product_categories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- ============================================================
-- changelog_entries: owner 추가
-- ============================================================
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

-- ============================================================
-- sc_credentials: owner 추가
-- ============================================================
DROP POLICY IF EXISTS "sc_credentials_admin_only" ON sc_credentials;
CREATE POLICY "sc_credentials_admin_only" ON sc_credentials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- ============================================================
-- listings: owner 추가
-- ============================================================
DROP POLICY IF EXISTS "listings_insert" ON listings;
CREATE POLICY "listings_insert" ON listings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin', 'editor'))
  );

-- ============================================================
-- campaign_listings: owner 추가
-- ============================================================
DROP POLICY IF EXISTS "campaign_listings_insert" ON campaign_listings;
CREATE POLICY "campaign_listings_insert" ON campaign_listings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin', 'editor'))
  );
