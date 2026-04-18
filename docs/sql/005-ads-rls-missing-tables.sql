-- =============================================================================
-- AD Optimizer — Enable RLS on ads tables that were missing policies
-- =============================================================================
-- Fixes Supabase linter: rls_disabled_in_public, sensitive_columns_exposed (api_tokens)
-- Prerequisite: public.get_accessible_org_units, get_accessible_brand_markets,
--               get_editable_brand_markets (org-permission-system)
-- Run in: Supabase SQL Editor after reviewing
-- Idempotent: DROP POLICY IF EXISTS + ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- Shared subexpressions (inline in policies; service_role bypasses RLS)

-- ─── marketplace_profiles (brand_market only) ───
ALTER TABLE ads.marketplace_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_marketplace_profiles_select" ON ads.marketplace_profiles;
DROP POLICY IF EXISTS "ads_marketplace_profiles_insert" ON ads.marketplace_profiles;
DROP POLICY IF EXISTS "ads_marketplace_profiles_update" ON ads.marketplace_profiles;
DROP POLICY IF EXISTS "ads_marketplace_profiles_delete" ON ads.marketplace_profiles;

CREATE POLICY "ads_marketplace_profiles_select" ON ads.marketplace_profiles FOR SELECT USING (
  brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_marketplace_profiles_insert" ON ads.marketplace_profiles FOR INSERT WITH CHECK (
  brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_marketplace_profiles_update" ON ads.marketplace_profiles FOR UPDATE USING (
  brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_marketplace_profiles_delete" ON ads.marketplace_profiles FOR DELETE USING (
  brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);

-- ─── api_tokens (via marketplace_profiles; protects access_token) ───
ALTER TABLE ads.api_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_api_tokens_select" ON ads.api_tokens;
DROP POLICY IF EXISTS "ads_api_tokens_insert" ON ads.api_tokens;
DROP POLICY IF EXISTS "ads_api_tokens_update" ON ads.api_tokens;
DROP POLICY IF EXISTS "ads_api_tokens_delete" ON ads.api_tokens;

CREATE POLICY "ads_api_tokens_select" ON ads.api_tokens FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM ads.marketplace_profiles mp
    WHERE mp.id = marketplace_profile_id
      AND mp.brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_api_tokens_insert" ON ads.api_tokens FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM ads.marketplace_profiles mp
    WHERE mp.id = marketplace_profile_id
      AND mp.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_api_tokens_update" ON ads.api_tokens FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM ads.marketplace_profiles mp
    WHERE mp.id = marketplace_profile_id
      AND mp.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_api_tokens_delete" ON ads.api_tokens FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM ads.marketplace_profiles mp
    WHERE mp.id = marketplace_profile_id
      AND mp.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);

-- ─── ad_groups (via campaign) ───
ALTER TABLE ads.ad_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_ad_groups_select" ON ads.ad_groups;
DROP POLICY IF EXISTS "ads_ad_groups_insert" ON ads.ad_groups;
DROP POLICY IF EXISTS "ads_ad_groups_update" ON ads.ad_groups;
DROP POLICY IF EXISTS "ads_ad_groups_delete" ON ads.ad_groups;

CREATE POLICY "ads_ad_groups_select" ON ads.ad_groups FOR SELECT USING (
  campaign_id IN (
    SELECT c.id FROM ads.campaigns c
    WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND c.brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_ad_groups_insert" ON ads.ad_groups FOR INSERT WITH CHECK (
  campaign_id IN (
    SELECT c.id FROM ads.campaigns c
    WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_ad_groups_update" ON ads.ad_groups FOR UPDATE USING (
  campaign_id IN (
    SELECT c.id FROM ads.campaigns c
    WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_ad_groups_delete" ON ads.ad_groups FOR DELETE USING (
  campaign_id IN (
    SELECT c.id FROM ads.campaigns c
    WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);

-- ─── keywords (via campaign) ───
ALTER TABLE ads.keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_keywords_select" ON ads.keywords;
DROP POLICY IF EXISTS "ads_keywords_insert" ON ads.keywords;
DROP POLICY IF EXISTS "ads_keywords_update" ON ads.keywords;
DROP POLICY IF EXISTS "ads_keywords_delete" ON ads.keywords;

CREATE POLICY "ads_keywords_select" ON ads.keywords FOR SELECT USING (
  campaign_id IN (
    SELECT c.id FROM ads.campaigns c
    WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND c.brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_keywords_insert" ON ads.keywords FOR INSERT WITH CHECK (
  campaign_id IN (
    SELECT c.id FROM ads.campaigns c
    WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_keywords_update" ON ads.keywords FOR UPDATE USING (
  campaign_id IN (
    SELECT c.id FROM ads.campaigns c
    WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_keywords_delete" ON ads.keywords FOR DELETE USING (
  campaign_id IN (
    SELECT c.id FROM ads.campaigns c
    WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);

-- ─── search_term_reports (via campaign) ───
ALTER TABLE ads.search_term_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_search_term_reports_select" ON ads.search_term_reports;
DROP POLICY IF EXISTS "ads_search_term_reports_insert" ON ads.search_term_reports;
DROP POLICY IF EXISTS "ads_search_term_reports_update" ON ads.search_term_reports;
DROP POLICY IF EXISTS "ads_search_term_reports_delete" ON ads.search_term_reports;

CREATE POLICY "ads_search_term_reports_select" ON ads.search_term_reports FOR SELECT USING (
  campaign_id IN (
    SELECT c.id FROM ads.campaigns c
    WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND c.brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_search_term_reports_insert" ON ads.search_term_reports FOR INSERT WITH CHECK (
  campaign_id IN (
    SELECT c.id FROM ads.campaigns c
    WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_search_term_reports_update" ON ads.search_term_reports FOR UPDATE USING (
  campaign_id IN (
    SELECT c.id FROM ads.campaigns c
    WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_search_term_reports_delete" ON ads.search_term_reports FOR DELETE USING (
  campaign_id IN (
    SELECT c.id FROM ads.campaigns c
    WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);

-- ─── keyword_rankings (brand_market only) ───
ALTER TABLE ads.keyword_rankings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_keyword_rankings_select" ON ads.keyword_rankings;
DROP POLICY IF EXISTS "ads_keyword_rankings_insert" ON ads.keyword_rankings;
DROP POLICY IF EXISTS "ads_keyword_rankings_update" ON ads.keyword_rankings;
DROP POLICY IF EXISTS "ads_keyword_rankings_delete" ON ads.keyword_rankings;

CREATE POLICY "ads_keyword_rankings_select" ON ads.keyword_rankings FOR SELECT USING (
  brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_keyword_rankings_insert" ON ads.keyword_rankings FOR INSERT WITH CHECK (
  brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_keyword_rankings_update" ON ads.keyword_rankings FOR UPDATE USING (
  brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_keyword_rankings_delete" ON ads.keyword_rankings FOR DELETE USING (
  brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);

-- ─── dayparting_hourly_weights (brand_market only) ───
ALTER TABLE ads.dayparting_hourly_weights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_dayparting_hourly_weights_select" ON ads.dayparting_hourly_weights;
DROP POLICY IF EXISTS "ads_dayparting_hourly_weights_insert" ON ads.dayparting_hourly_weights;
DROP POLICY IF EXISTS "ads_dayparting_hourly_weights_update" ON ads.dayparting_hourly_weights;
DROP POLICY IF EXISTS "ads_dayparting_hourly_weights_delete" ON ads.dayparting_hourly_weights;

CREATE POLICY "ads_dayparting_hourly_weights_select" ON ads.dayparting_hourly_weights FOR SELECT USING (
  brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_dayparting_hourly_weights_insert" ON ads.dayparting_hourly_weights FOR INSERT WITH CHECK (
  brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_dayparting_hourly_weights_update" ON ads.dayparting_hourly_weights FOR UPDATE USING (
  brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_dayparting_hourly_weights_delete" ON ads.dayparting_hourly_weights FOR DELETE USING (
  brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);

-- ─── budget_change_log (via budgets) ───
ALTER TABLE ads.budget_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_budget_change_log_select" ON ads.budget_change_log;
DROP POLICY IF EXISTS "ads_budget_change_log_insert" ON ads.budget_change_log;
DROP POLICY IF EXISTS "ads_budget_change_log_update" ON ads.budget_change_log;
DROP POLICY IF EXISTS "ads_budget_change_log_delete" ON ads.budget_change_log;

CREATE POLICY "ads_budget_change_log_select" ON ads.budget_change_log FOR SELECT USING (
  budget_id IN (
    SELECT b.id FROM ads.budgets b
    WHERE b.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND b.brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_budget_change_log_insert" ON ads.budget_change_log FOR INSERT WITH CHECK (
  budget_id IN (
    SELECT b.id FROM ads.budgets b
    WHERE b.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND b.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_budget_change_log_update" ON ads.budget_change_log FOR UPDATE USING (
  budget_id IN (
    SELECT b.id FROM ads.budgets b
    WHERE b.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND b.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_budget_change_log_delete" ON ads.budget_change_log FOR DELETE USING (
  budget_id IN (
    SELECT b.id FROM ads.budgets b
    WHERE b.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND b.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);

-- ─── spend_diagnostics (via campaign) ───
ALTER TABLE ads.spend_diagnostics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_spend_diagnostics_select" ON ads.spend_diagnostics;
DROP POLICY IF EXISTS "ads_spend_diagnostics_insert" ON ads.spend_diagnostics;
DROP POLICY IF EXISTS "ads_spend_diagnostics_update" ON ads.spend_diagnostics;
DROP POLICY IF EXISTS "ads_spend_diagnostics_delete" ON ads.spend_diagnostics;

CREATE POLICY "ads_spend_diagnostics_select" ON ads.spend_diagnostics FOR SELECT USING (
  campaign_id IN (
    SELECT c.id FROM ads.campaigns c
    WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND c.brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_spend_diagnostics_insert" ON ads.spend_diagnostics FOR INSERT WITH CHECK (
  campaign_id IN (
    SELECT c.id FROM ads.campaigns c
    WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_spend_diagnostics_update" ON ads.spend_diagnostics FOR UPDATE USING (
  campaign_id IN (
    SELECT c.id FROM ads.campaigns c
    WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_spend_diagnostics_delete" ON ads.spend_diagnostics FOR DELETE USING (
  campaign_id IN (
    SELECT c.id FROM ads.campaigns c
    WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);

-- ─── spend_trends (campaign nullable; fall back to brand_market) ───
ALTER TABLE ads.spend_trends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_spend_trends_select" ON ads.spend_trends;
DROP POLICY IF EXISTS "ads_spend_trends_insert" ON ads.spend_trends;
DROP POLICY IF EXISTS "ads_spend_trends_update" ON ads.spend_trends;
DROP POLICY IF EXISTS "ads_spend_trends_delete" ON ads.spend_trends;

CREATE POLICY "ads_spend_trends_select" ON ads.spend_trends FOR SELECT USING (
  (
    campaign_id IS NOT NULL
    AND campaign_id IN (
      SELECT c.id FROM ads.campaigns c
      WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND c.brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    campaign_id IS NULL
    AND brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_spend_trends_insert" ON ads.spend_trends FOR INSERT WITH CHECK (
  (
    campaign_id IS NOT NULL
    AND campaign_id IN (
      SELECT c.id FROM ads.campaigns c
      WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    campaign_id IS NULL
    AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_spend_trends_update" ON ads.spend_trends FOR UPDATE USING (
  (
    campaign_id IS NOT NULL
    AND campaign_id IN (
      SELECT c.id FROM ads.campaigns c
      WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    campaign_id IS NULL
    AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);
CREATE POLICY "ads_spend_trends_delete" ON ads.spend_trends FOR DELETE USING (
  (
    campaign_id IS NOT NULL
    AND campaign_id IN (
      SELECT c.id FROM ads.campaigns c
      WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    campaign_id IS NULL
    AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  )
);

-- ─── change_log (generic entity; scope by known entity types) ───
ALTER TABLE ads.change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_change_log_select" ON ads.change_log;
DROP POLICY IF EXISTS "ads_change_log_insert" ON ads.change_log;
DROP POLICY IF EXISTS "ads_change_log_update" ON ads.change_log;
DROP POLICY IF EXISTS "ads_change_log_delete" ON ads.change_log;

CREATE POLICY "ads_change_log_select" ON ads.change_log FOR SELECT USING (
  (
    entity_type = 'campaign'
    AND entity_id IN (
      SELECT c.id FROM ads.campaigns c
      WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND c.brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    entity_type = 'ad_group'
    AND entity_id IN (
      SELECT ag.id FROM ads.ad_groups ag
      INNER JOIN ads.campaigns c ON c.id = ag.campaign_id
      WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND c.brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    entity_type = 'keyword'
    AND entity_id IN (
      SELECT k.id FROM ads.keywords k
      INNER JOIN ads.campaigns c ON c.id = k.campaign_id
      WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND c.brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    entity_type = 'rule'
    AND entity_id IN (
      SELECT r.id FROM ads.rules r
      WHERE r.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND r.brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    entity_type = 'budget'
    AND entity_id IN (
      SELECT b.id FROM ads.budgets b
      WHERE b.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND b.brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
    )
  )
);

CREATE POLICY "ads_change_log_insert" ON ads.change_log FOR INSERT WITH CHECK (
  (
    entity_type = 'campaign'
    AND entity_id IN (
      SELECT c.id FROM ads.campaigns c
      WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    entity_type = 'ad_group'
    AND entity_id IN (
      SELECT ag.id FROM ads.ad_groups ag
      INNER JOIN ads.campaigns c ON c.id = ag.campaign_id
      WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    entity_type = 'keyword'
    AND entity_id IN (
      SELECT k.id FROM ads.keywords k
      INNER JOIN ads.campaigns c ON c.id = k.campaign_id
      WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    entity_type = 'rule'
    AND entity_id IN (
      SELECT r.id FROM ads.rules r
      WHERE r.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND r.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    entity_type = 'budget'
    AND entity_id IN (
      SELECT b.id FROM ads.budgets b
      WHERE b.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND b.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
);

CREATE POLICY "ads_change_log_update" ON ads.change_log FOR UPDATE USING (
  (
    entity_type = 'campaign'
    AND entity_id IN (
      SELECT c.id FROM ads.campaigns c
      WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    entity_type = 'ad_group'
    AND entity_id IN (
      SELECT ag.id FROM ads.ad_groups ag
      INNER JOIN ads.campaigns c ON c.id = ag.campaign_id
      WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    entity_type = 'keyword'
    AND entity_id IN (
      SELECT k.id FROM ads.keywords k
      INNER JOIN ads.campaigns c ON c.id = k.campaign_id
      WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    entity_type = 'rule'
    AND entity_id IN (
      SELECT r.id FROM ads.rules r
      WHERE r.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND r.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    entity_type = 'budget'
    AND entity_id IN (
      SELECT b.id FROM ads.budgets b
      WHERE b.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND b.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
);

CREATE POLICY "ads_change_log_delete" ON ads.change_log FOR DELETE USING (
  (
    entity_type = 'campaign'
    AND entity_id IN (
      SELECT c.id FROM ads.campaigns c
      WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    entity_type = 'ad_group'
    AND entity_id IN (
      SELECT ag.id FROM ads.ad_groups ag
      INNER JOIN ads.campaigns c ON c.id = ag.campaign_id
      WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    entity_type = 'keyword'
    AND entity_id IN (
      SELECT k.id FROM ads.keywords k
      INNER JOIN ads.campaigns c ON c.id = k.campaign_id
      WHERE c.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND c.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    entity_type = 'rule'
    AND entity_id IN (
      SELECT r.id FROM ads.rules r
      WHERE r.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND r.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
  OR (
    entity_type = 'budget'
    AND entity_id IN (
      SELECT b.id FROM ads.budgets b
      WHERE b.org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
        AND b.brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
    )
  )
);

-- ─── orders_daily_cache (brand_market only) ───
ALTER TABLE ads.orders_daily_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_orders_daily_cache_select" ON ads.orders_daily_cache;
DROP POLICY IF EXISTS "ads_orders_daily_cache_insert" ON ads.orders_daily_cache;
DROP POLICY IF EXISTS "ads_orders_daily_cache_update" ON ads.orders_daily_cache;
DROP POLICY IF EXISTS "ads_orders_daily_cache_delete" ON ads.orders_daily_cache;

CREATE POLICY "ads_orders_daily_cache_select" ON ads.orders_daily_cache FOR SELECT USING (
  brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_orders_daily_cache_insert" ON ads.orders_daily_cache FOR INSERT WITH CHECK (
  brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_orders_daily_cache_update" ON ads.orders_daily_cache FOR UPDATE USING (
  brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_orders_daily_cache_delete" ON ads.orders_daily_cache FOR DELETE USING (
  brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);

-- ─── notifications_log (brand_market only) ───
ALTER TABLE ads.notifications_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_notifications_log_select" ON ads.notifications_log;
DROP POLICY IF EXISTS "ads_notifications_log_insert" ON ads.notifications_log;
DROP POLICY IF EXISTS "ads_notifications_log_update" ON ads.notifications_log;
DROP POLICY IF EXISTS "ads_notifications_log_delete" ON ads.notifications_log;

CREATE POLICY "ads_notifications_log_select" ON ads.notifications_log FOR SELECT USING (
  brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_notifications_log_insert" ON ads.notifications_log FOR INSERT WITH CHECK (
  brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_notifications_log_update" ON ads.notifications_log FOR UPDATE USING (
  brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_notifications_log_delete" ON ads.notifications_log FOR DELETE USING (
  brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);

-- ─── cache_autopilot_summary (org + brand, same as budgets) ───
ALTER TABLE ads.cache_autopilot_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_cache_autopilot_summary_select" ON ads.cache_autopilot_summary;
DROP POLICY IF EXISTS "ads_cache_autopilot_summary_insert" ON ads.cache_autopilot_summary;
DROP POLICY IF EXISTS "ads_cache_autopilot_summary_update" ON ads.cache_autopilot_summary;
DROP POLICY IF EXISTS "ads_cache_autopilot_summary_delete" ON ads.cache_autopilot_summary;

CREATE POLICY "ads_cache_autopilot_summary_select" ON ads.cache_autopilot_summary FOR SELECT USING (
  org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
  AND brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_cache_autopilot_summary_insert" ON ads.cache_autopilot_summary FOR INSERT WITH CHECK (
  org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
  AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_cache_autopilot_summary_update" ON ads.cache_autopilot_summary FOR UPDATE USING (
  org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
  AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_cache_autopilot_summary_delete" ON ads.cache_autopilot_summary FOR DELETE USING (
  org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
  AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);
