-- =============================================================================
-- AD Optimizer Module — ads Schema Migration
-- =============================================================================
-- Date: 2026-03-30
-- Design: docs/02-design/features/ad-optimizer.design.md §3
-- Run in: Supabase SQL Editor (njbhqrrdnmiarjjpgqwd)
-- Order: Run this BEFORE deploying any code
-- =============================================================================

-- 1. Create schema
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS ads;

-- =============================================================================
-- 2. Tables
-- =============================================================================

-- 2.1 marketplace_profiles — 계정별 API 인증 정보
-- =============================================================================
CREATE TABLE ads.marketplace_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  seller_id text,
  ads_profile_id text,
  refresh_token_key text NOT NULL,
  sp_api_refresh_token_key text,
  region text NOT NULL CHECK (region IN ('NA', 'EU', 'FE')),
  endpoint_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_market_id)
);

-- 2.2 api_tokens — OAuth 토큰 캐시
-- =============================================================================
CREATE TABLE ads.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_profile_id uuid NOT NULL REFERENCES ads.marketplace_profiles(id),
  token_type text NOT NULL CHECK (token_type IN ('ads', 'sp')),
  access_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marketplace_profile_id, token_type)
);

-- 2.3 campaigns — 캠페인 (핵심 엔티티)
-- =============================================================================
CREATE TABLE ads.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  marketplace_profile_id uuid NOT NULL REFERENCES ads.marketplace_profiles(id),

  -- Amazon 원본
  amazon_campaign_id text,
  amazon_state text CHECK (amazon_state IN ('enabled', 'paused', 'archived')),

  -- 내부 관리
  marketing_code text NOT NULL,
  name text NOT NULL,
  campaign_type text NOT NULL CHECK (campaign_type IN ('sp', 'sb', 'sd')),
  mode text NOT NULL CHECK (mode IN ('autopilot', 'manual')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'learning', 'archived')),

  -- 타겟/예산
  target_acos numeric(5,2),
  daily_budget numeric(12,2),
  weekly_budget numeric(12,2),
  max_bid_cap numeric(8,2),

  -- Auto Pilot 메타
  confidence_score numeric(5,2),
  learning_day integer DEFAULT 0,

  -- 담당자
  created_by uuid NOT NULL REFERENCES public.users(id),
  assigned_to uuid REFERENCES public.users(id),

  -- 타임스탬프
  launched_at timestamptz,
  paused_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_org ON ads.campaigns(org_unit_id);
CREATE INDEX idx_campaigns_bm ON ads.campaigns(brand_market_id);
CREATE INDEX idx_campaigns_mode ON ads.campaigns(mode);
CREATE INDEX idx_campaigns_status ON ads.campaigns(status);
CREATE INDEX idx_campaigns_code ON ads.campaigns(marketing_code);

-- 2.4 ad_groups — 광고 그룹
-- =============================================================================
CREATE TABLE ads.ad_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id) ON DELETE CASCADE,
  amazon_ad_group_id text,
  name text NOT NULL,
  default_bid numeric(8,2),
  state text CHECK (state IN ('enabled', 'paused', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_groups_campaign ON ads.ad_groups(campaign_id);

-- 2.5 keywords — 키워드
-- =============================================================================
CREATE TABLE ads.keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id) ON DELETE CASCADE,
  ad_group_id uuid NOT NULL REFERENCES ads.ad_groups(id) ON DELETE CASCADE,
  amazon_keyword_id text,
  keyword_text text NOT NULL,
  match_type text NOT NULL CHECK (match_type IN ('broad', 'phrase', 'exact', 'negative', 'negative_phrase')),
  bid numeric(8,2),
  state text CHECK (state IN ('enabled', 'paused', 'archived')),
  manual_override_until timestamptz,
  last_auto_adjusted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_keywords_campaign ON ads.keywords(campaign_id);
CREATE INDEX idx_keywords_ad_group ON ads.keywords(ad_group_id);
CREATE INDEX idx_keywords_text ON ads.keywords(keyword_text);

-- 2.6 report_snapshots — 일일 성과 스냅샷
-- =============================================================================
CREATE TABLE ads.report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id) ON DELETE CASCADE,
  ad_group_id uuid REFERENCES ads.ad_groups(id),
  keyword_id uuid REFERENCES ads.keywords(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  report_date date NOT NULL,
  report_level text NOT NULL CHECK (report_level IN ('campaign', 'ad_group', 'keyword', 'search_term')),

  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  spend numeric(12,2) DEFAULT 0,
  sales numeric(12,2) DEFAULT 0,
  orders integer DEFAULT 0,
  acos numeric(5,2),
  cpc numeric(8,2),
  ctr numeric(5,2),
  cvr numeric(5,2),
  roas numeric(8,2),

  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, ad_group_id, keyword_id, report_date, report_level)
);

CREATE INDEX idx_snapshots_campaign_date ON ads.report_snapshots(campaign_id, report_date);
CREATE INDEX idx_snapshots_bm_date ON ads.report_snapshots(brand_market_id, report_date);
CREATE INDEX idx_snapshots_date ON ads.report_snapshots(report_date);

-- 2.7 rules — 자동화 규칙 (Tier 1)
-- =============================================================================
CREATE TABLE ads.rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  name text NOT NULL,
  template text NOT NULL CHECK (template IN (
    'high_acos_pause', 'winner_promote', 'low_ctr_negate', 'budget_guard', 'custom'
  )),
  condition_json jsonb NOT NULL,
  action text NOT NULL,
  action_params jsonb,
  scope text NOT NULL DEFAULT 'all',
  scope_campaign_ids uuid[],
  look_back_days integer NOT NULL DEFAULT 7,
  run_frequency text NOT NULL DEFAULT 'daily'
    CHECK (run_frequency IN ('hourly', 'daily', 'weekly')),
  is_active boolean NOT NULL DEFAULT false,
  last_run_at timestamptz,
  last_affected_count integer DEFAULT 0,
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rules_org ON ads.rules(org_unit_id);
CREATE INDEX idx_rules_active ON ads.rules(is_active) WHERE is_active = true;

-- 2.8 automation_log — AI 활동 이력
-- =============================================================================
CREATE TABLE ads.automation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id),
  keyword_id uuid REFERENCES ads.keywords(id),
  rule_id uuid REFERENCES ads.rules(id),
  batch_id uuid NOT NULL,

  action_type text NOT NULL CHECK (action_type IN (
    'bid_adjust', 'keyword_add', 'keyword_negate', 'keyword_promote',
    'budget_adjust', 'campaign_pause', 'campaign_resume', 'dayparting_apply'
  )),
  action_detail jsonb NOT NULL,
  reason text NOT NULL,
  source text NOT NULL CHECK (source IN ('rule_engine', 'algorithm', 'ml', 'manual')),

  guardrail_blocked boolean NOT NULL DEFAULT false,
  guardrail_id text,
  guardrail_reason text,

  is_rolled_back boolean NOT NULL DEFAULT false,
  rolled_back_at timestamptz,
  rolled_back_by uuid REFERENCES public.users(id),

  api_request jsonb,
  api_response jsonb,
  api_success boolean,

  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_campaign ON ads.automation_log(campaign_id, executed_at DESC);
CREATE INDEX idx_automation_batch ON ads.automation_log(batch_id);
CREATE INDEX idx_automation_type ON ads.automation_log(action_type);
CREATE INDEX idx_automation_blocked ON ads.automation_log(guardrail_blocked) WHERE guardrail_blocked = true;

-- 2.9 keyword_recommendations — AI 키워드 추천
-- =============================================================================
CREATE TABLE ads.keyword_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id),
  keyword_id uuid REFERENCES ads.keywords(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),

  recommendation_type text NOT NULL CHECK (recommendation_type IN (
    'bid_adjust', 'promote', 'negate', 'new_keyword', 'trend_alert'
  )),
  keyword_text text NOT NULL,
  match_type text,
  suggested_bid numeric(8,2),
  current_bid numeric(8,2),
  estimated_impact numeric(12,2),
  impact_level text CHECK (impact_level IN ('high', 'medium', 'low')),
  reason text NOT NULL,

  source text NOT NULL,
  look_back_days integer NOT NULL DEFAULT 14,
  metrics jsonb,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'skipped', 'expired')),
  approved_by uuid REFERENCES public.users(id),
  approved_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_recommendations_campaign ON ads.keyword_recommendations(campaign_id, status);
CREATE INDEX idx_recommendations_bm ON ads.keyword_recommendations(brand_market_id, status);
CREATE INDEX idx_recommendations_status ON ads.keyword_recommendations(status) WHERE status = 'pending';

-- 2.10 keyword_rankings — Brand Analytics 주간 데이터
-- =============================================================================
CREATE TABLE ads.keyword_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  keyword_text text NOT NULL,
  week_start date NOT NULL,
  search_frequency_rank integer,
  click_share numeric(5,2),
  conversion_share numeric(5,2),
  top_clicked_asins text[],
  trend_signal text CHECK (trend_signal IN ('rising', 'emerging', 'stable', 'declining')),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_market_id, keyword_text, week_start)
);

CREATE INDEX idx_rankings_bm_week ON ads.keyword_rankings(brand_market_id, week_start);
CREATE INDEX idx_rankings_keyword ON ads.keyword_rankings(keyword_text);

-- 2.11 search_term_reports — 검색어 리포트 캐시
-- =============================================================================
CREATE TABLE ads.search_term_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id),
  ad_group_id uuid NOT NULL REFERENCES ads.ad_groups(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  search_term text NOT NULL,
  report_date date NOT NULL,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  spend numeric(12,2) DEFAULT 0,
  sales numeric(12,2) DEFAULT 0,
  orders integer DEFAULT 0,
  acos numeric(5,2),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, ad_group_id, search_term, report_date)
);

CREATE INDEX idx_search_terms_campaign ON ads.search_term_reports(campaign_id, report_date);

-- 2.12 dayparting_schedules — 그룹별 스케줄
-- =============================================================================
CREATE TABLE ads.dayparting_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  group_name text NOT NULL,
  campaign_ids uuid[] NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  schedule jsonb NOT NULL DEFAULT '{}',
  ai_recommended_schedule jsonb,
  last_applied_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dayparting_org ON ads.dayparting_schedules(org_unit_id);

-- 2.13 dayparting_hourly_weights — 시간대별 매출 패턴
-- =============================================================================
CREATE TABLE ads.dayparting_hourly_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  asin text,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  hour integer NOT NULL CHECK (hour BETWEEN 0 AND 23),
  order_count integer NOT NULL DEFAULT 0,
  revenue numeric(12,2) NOT NULL DEFAULT 0,
  weight numeric(5,3) NOT NULL DEFAULT 1.0,
  source text NOT NULL DEFAULT 'orders_db',
  period_start date NOT NULL,
  period_end date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_market_id, asin, day_of_week, hour, source)
);

CREATE INDEX idx_weights_bm ON ads.dayparting_hourly_weights(brand_market_id);

-- 2.14 budgets — 연간 예산
-- =============================================================================
CREATE TABLE ads.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  channel text NOT NULL CHECK (channel IN ('sp', 'sb', 'sd')),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  is_actual boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_unit_id, brand_market_id, year, month, channel, is_actual)
);

CREATE INDEX idx_budgets_org_year ON ads.budgets(org_unit_id, year);
CREATE INDEX idx_budgets_bm ON ads.budgets(brand_market_id, year);

-- 2.15 budget_change_log — 예산 변경 이력
-- =============================================================================
CREATE TABLE ads.budget_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES ads.budgets(id),
  user_id uuid NOT NULL REFERENCES public.users(id),
  field text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_budget_log_budget ON ads.budget_change_log(budget_id);

-- 2.16 alerts — 예산/성과 알림
-- =============================================================================
CREATE TABLE ads.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  alert_type text NOT NULL CHECK (alert_type IN (
    'budget_runout', 'spend_spike', 'acos_spike', 'zero_sales',
    'buybox_lost', 'stock_low', 'cpc_surge', 'cvr_drop'
  )),
  severity text NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean NOT NULL DEFAULT false,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_campaign ON ads.alerts(campaign_id, created_at DESC);
CREATE INDEX idx_alerts_unread ON ads.alerts(is_read) WHERE is_read = false;

-- 2.17 spend_diagnostics — AI 누수 분석
-- =============================================================================
CREATE TABLE ads.spend_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  diagnosis_type text NOT NULL CHECK (diagnosis_type IN (
    'underspend', 'overspend', 'waste', 'trend_decline'
  )),
  root_causes jsonb NOT NULL,
  utilization_pct numeric(5,2),
  analyzed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_diagnostics_campaign ON ads.spend_diagnostics(campaign_id);

-- 2.18 spend_trends — 주간 트렌드 분석
-- =============================================================================
CREATE TABLE ads.spend_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES ads.campaigns(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  metric text NOT NULL,
  week_start date NOT NULL,
  value numeric(12,2) NOT NULL,
  prev_week_value numeric(12,2),
  trend_direction text CHECK (trend_direction IN ('improving', 'stable', 'worsening')),
  consecutive_weeks_worsening integer DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trends_bm ON ads.spend_trends(brand_market_id, week_start);

-- 2.19 change_log — 범용 변경 이력
-- =============================================================================
CREATE TABLE ads.change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  changes jsonb NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  user_id uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_changelog_entity ON ads.change_log(entity_type, entity_id, created_at DESC);

-- 2.20 orders_daily_cache — Orders DB 일별 캐시
-- =============================================================================
CREATE TABLE ads.orders_daily_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  order_date date NOT NULL,
  total_orders integer NOT NULL DEFAULT 0,
  total_revenue numeric(12,2) NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_market_id, order_date)
);

CREATE INDEX idx_orders_cache_bm ON ads.orders_daily_cache(brand_market_id, order_date);

-- 2.21 notifications_log — SP-API 알림 수신 로그
-- =============================================================================
CREATE TABLE ads.notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  notification_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  received_at timestamptz NOT NULL DEFAULT now()
);

-- 2.22 cache_autopilot_summary — Auto Pilot KPI 캐시
-- =============================================================================
CREATE TABLE ads.cache_autopilot_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  active_count integer DEFAULT 0,
  learning_count integer DEFAULT 0,
  paused_count integer DEFAULT 0,
  total_weekly_budget numeric(12,2) DEFAULT 0,
  total_spend_7d numeric(12,2) DEFAULT 0,
  avg_acos numeric(5,2),
  ai_actions_7d integer DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_unit_id, brand_market_id)
);

-- =============================================================================
-- 3. RLS Policies
-- =============================================================================

-- Helper: check if get_accessible_org_units and get_accessible_brand_markets exist
-- These should already be in public schema from org-permission-system
-- If not, they need to be created as a prerequisite (P5 in Plan)

-- 3.1 campaigns RLS
ALTER TABLE ads.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_campaigns_select" ON ads.campaigns
  FOR SELECT USING (
    org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
    AND brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  );

CREATE POLICY "ads_campaigns_insert" ON ads.campaigns
  FOR INSERT WITH CHECK (
    org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
    AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  );

CREATE POLICY "ads_campaigns_update" ON ads.campaigns
  FOR UPDATE USING (
    org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
    AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  );

-- 3.2 rules RLS
ALTER TABLE ads.rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_rules_select" ON ads.rules
  FOR SELECT USING (
    org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
    AND brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  );

CREATE POLICY "ads_rules_insert" ON ads.rules
  FOR INSERT WITH CHECK (
    org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
    AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  );

CREATE POLICY "ads_rules_update" ON ads.rules
  FOR UPDATE USING (
    org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
    AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  );

-- 3.3 budgets RLS
ALTER TABLE ads.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_budgets_select" ON ads.budgets
  FOR SELECT USING (
    org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
    AND brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  );

CREATE POLICY "ads_budgets_insert" ON ads.budgets
  FOR INSERT WITH CHECK (
    org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
    AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  );

CREATE POLICY "ads_budgets_update" ON ads.budgets
  FOR UPDATE USING (
    org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
    AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  );

-- 3.4 keyword_recommendations RLS
ALTER TABLE ads.keyword_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_recommendations_select" ON ads.keyword_recommendations
  FOR SELECT USING (
    brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  );

CREATE POLICY "ads_recommendations_update" ON ads.keyword_recommendations
  FOR UPDATE USING (
    brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  );

-- 3.5 alerts RLS
ALTER TABLE ads.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_alerts_select" ON ads.alerts
  FOR SELECT USING (
    brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  );

-- 3.6 dayparting_schedules RLS
ALTER TABLE ads.dayparting_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_dayparting_select" ON ads.dayparting_schedules
  FOR SELECT USING (
    org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
    AND brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  );

CREATE POLICY "ads_dayparting_modify" ON ads.dayparting_schedules
  FOR ALL USING (
    org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
    AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  );

-- 3.7 report_snapshots — campaign FK를 통해 간접 보안
-- 대량 데이터라 direct RLS 대신 view 또는 function으로 제어 권장
ALTER TABLE ads.report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_snapshots_select" ON ads.report_snapshots
  FOR SELECT USING (
    brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  );

-- 3.8 automation_log — 캠페인 기반 간접 접근
ALTER TABLE ads.automation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_automation_log_select" ON ads.automation_log
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM ads.campaigns
      WHERE org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
    )
  );

-- 3.9 Service role bypass (cron jobs, API routes)
-- Cron jobs use service_role key which bypasses RLS automatically

-- =============================================================================
-- 4. Updated_at Trigger (자동 갱신)
-- =============================================================================

CREATE OR REPLACE FUNCTION ads.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'ads' AND column_name = 'updated_at'
    GROUP BY table_name
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON ads.%I FOR EACH ROW EXECUTE FUNCTION ads.update_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;

-- =============================================================================
-- 5. Grant Access (Supabase roles)
-- =============================================================================

GRANT USAGE ON SCHEMA ads TO authenticated;
GRANT USAGE ON SCHEMA ads TO service_role;

-- authenticated: SELECT/INSERT/UPDATE on all tables (RLS enforces row-level)
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA ads TO authenticated;

-- service_role: full access (cron jobs, admin operations)
GRANT ALL ON ALL TABLES IN SCHEMA ads TO service_role;

-- Future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA ads GRANT SELECT, INSERT, UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA ads GRANT ALL ON TABLES TO service_role;

-- =============================================================================
-- Done. 22 tables + indexes + RLS + triggers created.
-- Next: Run seed data (002-ads-seed.sql)
-- =============================================================================
