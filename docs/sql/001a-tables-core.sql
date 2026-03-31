-- Part 1/5: Core tables
-- marketplace_profiles → campaigns → ad_groups → keywords

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

CREATE TABLE ads.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_profile_id uuid NOT NULL REFERENCES ads.marketplace_profiles(id),
  token_type text NOT NULL CHECK (token_type IN ('ads', 'sp')),
  access_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marketplace_profile_id, token_type)
);

CREATE TABLE ads.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  marketplace_profile_id uuid NOT NULL REFERENCES ads.marketplace_profiles(id),
  amazon_campaign_id text,
  amazon_state text CHECK (amazon_state IN ('enabled', 'paused', 'archived')),
  marketing_code text NOT NULL,
  name text NOT NULL,
  campaign_type text NOT NULL CHECK (campaign_type IN ('sp', 'sb', 'sd')),
  mode text NOT NULL CHECK (mode IN ('autopilot', 'manual')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'learning', 'archived')),
  target_acos numeric(5,2),
  daily_budget numeric(12,2),
  weekly_budget numeric(12,2),
  max_bid_cap numeric(8,2),
  confidence_score numeric(5,2),
  learning_day integer DEFAULT 0,
  created_by uuid NOT NULL REFERENCES public.users(id),
  assigned_to uuid REFERENCES public.users(id),
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
