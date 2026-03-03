-- Sentinel: Initial Database Schema
-- Version: 1.0
-- Date: 2026-02-28
-- Based on: sentinel.design.md v0.3

-- ============================================================
-- 1. Core Tables
-- ============================================================

-- users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'editor', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  marketplace TEXT NOT NULL DEFAULT 'US'
    CHECK (marketplace IN ('US', 'UK', 'JP', 'DE', 'FR', 'IT', 'ES', 'CA', 'AU')),
  start_date DATE NOT NULL,
  end_date DATE,
  frequency TEXT NOT NULL DEFAULT 'daily'
    CHECK (frequency IN ('daily', 'every_12h', 'every_6h')),
  max_pages INTEGER NOT NULL DEFAULT 3
    CHECK (max_pages BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'scheduled')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- listings
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asin TEXT NOT NULL,
  marketplace TEXT NOT NULL,
  title TEXT,
  description TEXT,
  bullet_points JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  price_amount NUMERIC(10,2),
  price_currency TEXT DEFAULT 'USD',
  seller_name TEXT,
  seller_id TEXT,
  brand TEXT,
  category TEXT,
  rating NUMERIC(2,1),
  review_count INTEGER,
  is_suspect BOOLEAN NOT NULL DEFAULT false,
  suspect_reasons JSONB DEFAULT '[]',
  source TEXT NOT NULL
    CHECK (source IN ('crawler', 'extension')),
  source_campaign_id UUID REFERENCES campaigns(id),
  source_user_id UUID REFERENCES users(id),
  raw_data JSONB,
  crawled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_listings_unique_daily
  ON listings(asin, marketplace, ((crawled_at AT TIME ZONE 'UTC')::date));
CREATE INDEX idx_listings_asin ON listings(asin);
CREATE INDEX idx_listings_marketplace ON listings(marketplace);
CREATE INDEX idx_listings_is_suspect ON listings(is_suspect) WHERE is_suspect = true;
CREATE INDEX idx_listings_source_campaign ON listings(source_campaign_id);

-- campaign_listings (N:M)
CREATE TABLE campaign_listings (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  page_number INTEGER,
  position_in_page INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (campaign_id, listing_id)
);

-- ============================================================
-- 2. Reports Pipeline
-- ============================================================

-- reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id),

  -- 위반 유형 판단 (AI vs 사용자 불일치 처리 — D45)
  user_violation_type TEXT NOT NULL
    CHECK (user_violation_type ~ '^V[0-9]{2}$'),
  ai_violation_type TEXT
    CHECK (ai_violation_type ~ '^V[0-9]{2}$'),
  confirmed_violation_type TEXT
    CHECK (confirmed_violation_type ~ '^V[0-9]{2}$'),
  violation_type TEXT GENERATED ALWAYS AS (
    COALESCE(confirmed_violation_type, ai_violation_type, user_violation_type)
  ) STORED,
  violation_category TEXT NOT NULL
    CHECK (violation_category IN (
      'intellectual_property',
      'listing_content',
      'review_manipulation',
      'selling_practice',
      'regulatory_safety'
    )),
  disagreement_flag BOOLEAN GENERATED ALWAYS AS (
    ai_violation_type IS NOT NULL AND user_violation_type != ai_violation_type
  ) STORED,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'pending_review', 'approved', 'rejected', 'cancelled',
      'submitted', 'monitoring', 'resolved', 'unresolved',
      'resubmitted', 'escalated'
    )),

  -- AI 분석 결과
  ai_analysis JSONB,
  ai_severity TEXT
    CHECK (ai_severity IN ('high', 'medium', 'low')),
  ai_confidence_score INTEGER
    CHECK (ai_confidence_score BETWEEN 0 AND 100),

  -- 신고서 드래프트
  draft_title TEXT,
  draft_body TEXT,
  draft_evidence JSONB DEFAULT '[]',
  draft_policy_references JSONB DEFAULT '[]',

  -- 수정 이력
  original_draft_body TEXT,
  edited_by UUID REFERENCES users(id),
  edited_at TIMESTAMPTZ,

  -- 반려 정보
  rejected_by UUID REFERENCES users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  rejection_category TEXT
    CHECK (rejection_category IN (
      'insufficient_evidence', 'wrong_violation_type',
      'inaccurate_policy_reference', 'over_detection',
      'duplicate', 'other'
    )),

  -- 취소 정보
  cancelled_by UUID REFERENCES users(id),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- 승인 정보
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  -- SC 신고 정보
  sc_case_id TEXT,
  sc_submitted_at TIMESTAMPTZ,
  sc_submission_error TEXT,

  -- 팔로업
  monitoring_started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_type TEXT
    CHECK (resolution_type IN (
      'listing_removed', 'content_modified',
      'seller_removed', 'no_change'
    )),

  -- 재신고
  parent_report_id UUID REFERENCES reports(id),
  escalation_level INTEGER DEFAULT 0,

  -- 메타
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_listing ON reports(listing_id);
CREATE INDEX idx_reports_violation ON reports(violation_type);
CREATE INDEX idx_reports_created_by ON reports(created_by);
CREATE INDEX idx_reports_disagreement ON reports(disagreement_flag) WHERE disagreement_flag = true;

-- 중복 방지: 동일 리스팅 + 위반 유형 + 활성 상태
CREATE UNIQUE INDEX idx_reports_unique_active
  ON reports(listing_id, violation_type)
  WHERE status NOT IN ('cancelled', 'resolved');

-- report_snapshots
CREATE TABLE report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL
    CHECK (snapshot_type IN ('initial', 'followup')),
  listing_data JSONB NOT NULL,
  diff_from_initial JSONB,
  change_detected BOOLEAN DEFAULT false,
  change_type TEXT
    CHECK (change_type IN (
      'listing_removed', 'content_modified',
      'seller_changed', 'no_change'
    )),
  crawled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_snapshots_report ON report_snapshots(report_id);

-- ============================================================
-- 3. Patent Registry
-- ============================================================

CREATE TABLE patents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monday_item_id TEXT UNIQUE,
  patent_number TEXT NOT NULL,
  patent_name TEXT NOT NULL,
  keywords JSONB DEFAULT '[]',
  image_urls JSONB DEFAULT '[]',
  country TEXT NOT NULL DEFAULT 'US',
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'pending')),
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE report_patents (
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  patent_id UUID NOT NULL REFERENCES patents(id),
  similarity_score INTEGER CHECK (similarity_score BETWEEN 0 AND 100),
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (report_id, patent_id)
);

-- ============================================================
-- 4. Notifications & Audit
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN (
      'report_approved', 'report_rejected', 'report_submitted',
      'followup_change_detected', 'followup_no_change',
      'campaign_completed', 'system_error',
      'patent_sync_completed', 'changelog_new'
    )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, is_read) WHERE is_read = false;

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL
    CHECK (action IN (
      'login', 'logout', 'role_changed',
      'report_created', 'report_approved', 'report_rejected',
      'report_cancelled', 'report_submitted', 'report_edited',
      'sc_credential_accessed', 'sc_credential_updated',
      'campaign_created', 'campaign_updated', 'campaign_deleted',
      'patent_sync_triggered', 'patent_sync_completed',
      'settings_changed', 'system_error'
    )),
  resource_type TEXT,
  resource_id TEXT,
  before_data JSONB,
  after_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- append-only: DELETE/UPDATE 권한 제거
REVOKE DELETE, UPDATE ON audit_logs FROM authenticated;
REVOKE DELETE, UPDATE ON audit_logs FROM service_role;

-- ============================================================
-- 5. Settings & Templates
-- ============================================================

CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_type TEXT NOT NULL
    CHECK (violation_type ~ '^V[0-9]{2}$'),
  sub_type TEXT,
  template_title TEXT NOT NULL,
  template_body TEXT NOT NULL,
  policy_references JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (violation_type, sub_type)
);

CREATE INDEX idx_templates_violation ON report_templates(violation_type);

CREATE TABLE trademarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mark_type TEXT NOT NULL
    CHECK (mark_type IN ('design_mark', 'standard_character', 'character_logo')),
  registration_number TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  image_url TEXT,
  variations JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trademarks_name ON trademarks(name);

CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('new', 'fix', 'policy', 'ai')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_changelog_created ON changelog_entries(created_at DESC);

CREATE TABLE system_configs (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. SC Credentials (Vault)
-- ============================================================

CREATE TABLE sc_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  vault_secret_id UUID NOT NULL,
  mfa_vault_secret_id UUID,
  last_used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. updated_at 트리거 함수
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 주요 테이블에 updated_at 자동 갱신 트리거 적용
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON patents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON report_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON trademarks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON changelog_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON system_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON sc_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
