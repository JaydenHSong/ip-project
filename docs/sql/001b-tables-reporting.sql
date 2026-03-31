-- Part 2/5: Reporting & analytics tables

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

CREATE TABLE ads.spend_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  diagnosis_type text NOT NULL CHECK (diagnosis_type IN ('underspend', 'overspend', 'waste', 'trend_decline')),
  root_causes jsonb NOT NULL,
  utilization_pct numeric(5,2),
  analyzed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_diagnostics_campaign ON ads.spend_diagnostics(campaign_id);

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
