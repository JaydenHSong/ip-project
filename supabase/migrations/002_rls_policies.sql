-- Sentinel: Row Level Security Policies
-- Based on: sentinel.design.md v0.3 Section 3.4

-- ============================================================
-- users: 모두 읽기, Admin만 수정
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select" ON users
  FOR SELECT USING (true);

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- campaigns: 모두 읽기, Editor 이상 CUD, Admin만 삭제
-- ============================================================
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select" ON campaigns
  FOR SELECT USING (true);

CREATE POLICY "campaigns_insert" ON campaigns
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "campaigns_update" ON campaigns
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "campaigns_delete" ON campaigns
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- reports: 모두 읽기, Editor 자기 것 CRU, Admin 전체
-- ============================================================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select" ON reports
  FOR SELECT USING (true);

CREATE POLICY "reports_insert" ON reports
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "reports_update_own" ON reports
  FOR UPDATE USING (
    (created_by = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'editor'))
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- notifications: 본인만
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- audit_logs: Admin만 읽기, INSERT는 서비스 롤
-- ============================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_admin_read" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- system_configs: 모두 읽기, Admin만 수정 (G-03)
-- ============================================================
ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_configs_select" ON system_configs
  FOR SELECT USING (true);

CREATE POLICY "system_configs_update" ON system_configs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- report_templates: 모두 읽기, Admin만 CUD (G-03)
-- ============================================================
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select" ON report_templates
  FOR SELECT USING (true);

CREATE POLICY "templates_insert" ON report_templates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "templates_update" ON report_templates
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "templates_delete" ON report_templates
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- trademarks: 모두 읽기, Admin만 CUD (G-03)
-- ============================================================
ALTER TABLE trademarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trademarks_select" ON trademarks
  FOR SELECT USING (true);

CREATE POLICY "trademarks_insert" ON trademarks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "trademarks_update" ON trademarks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "trademarks_delete" ON trademarks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- product_categories: 모두 읽기, Admin만 CUD (G-03)
-- ============================================================
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON product_categories
  FOR SELECT USING (true);

CREATE POLICY "categories_insert" ON product_categories
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "categories_update" ON product_categories
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "categories_delete" ON product_categories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- changelog_entries: 모두 읽기, Admin만 작성 (G-03)
-- ============================================================
ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "changelog_select" ON changelog_entries
  FOR SELECT USING (true);

CREATE POLICY "changelog_insert" ON changelog_entries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "changelog_update" ON changelog_entries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- sc_credentials: Admin만 접근
-- ============================================================
ALTER TABLE sc_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sc_credentials_admin_only" ON sc_credentials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- listings, campaign_listings, report_snapshots, patents,
-- report_patents: 인증 사용자 읽기, Editor+ 쓰기
-- ============================================================
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listings_select" ON listings
  FOR SELECT USING (true);

CREATE POLICY "listings_insert" ON listings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

ALTER TABLE campaign_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_listings_select" ON campaign_listings
  FOR SELECT USING (true);

CREATE POLICY "campaign_listings_insert" ON campaign_listings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snapshots_select" ON report_snapshots
  FOR SELECT USING (true);

ALTER TABLE patents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patents_select" ON patents
  FOR SELECT USING (true);

ALTER TABLE report_patents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_patents_select" ON report_patents
  FOR SELECT USING (true);
