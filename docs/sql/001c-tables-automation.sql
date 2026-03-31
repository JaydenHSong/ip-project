-- Part 3/5: Automation & rules tables

CREATE TABLE ads.rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  name text NOT NULL,
  template text NOT NULL CHECK (template IN ('high_acos_pause', 'winner_promote', 'low_ctr_negate', 'budget_guard', 'custom')),
  condition_json jsonb NOT NULL,
  action text NOT NULL,
  action_params jsonb,
  scope text NOT NULL DEFAULT 'all',
  scope_campaign_ids uuid[],
  look_back_days integer NOT NULL DEFAULT 7,
  run_frequency text NOT NULL DEFAULT 'daily' CHECK (run_frequency IN ('hourly', 'daily', 'weekly')),
  is_active boolean NOT NULL DEFAULT false,
  last_run_at timestamptz,
  last_affected_count integer DEFAULT 0,
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rules_org ON ads.rules(org_unit_id);
CREATE INDEX idx_rules_active ON ads.rules(is_active) WHERE is_active = true;

CREATE TABLE ads.automation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id),
  keyword_id uuid REFERENCES ads.keywords(id),
  rule_id uuid REFERENCES ads.rules(id),
  batch_id uuid NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('bid_adjust', 'keyword_add', 'keyword_negate', 'keyword_promote', 'budget_adjust', 'campaign_pause', 'campaign_resume', 'dayparting_apply')),
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

CREATE TABLE ads.keyword_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id),
  keyword_id uuid REFERENCES ads.keywords(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  recommendation_type text NOT NULL CHECK (recommendation_type IN ('bid_adjust', 'promote', 'negate', 'new_keyword', 'trend_alert')),
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
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'skipped', 'expired')),
  approved_by uuid REFERENCES public.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_recommendations_campaign ON ads.keyword_recommendations(campaign_id, status);
CREATE INDEX idx_recommendations_bm ON ads.keyword_recommendations(brand_market_id, status);
CREATE INDEX idx_recommendations_status ON ads.keyword_recommendations(status) WHERE status = 'pending';

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
