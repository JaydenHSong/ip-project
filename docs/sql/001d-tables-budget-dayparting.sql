-- Part 4/5: Budget, dayparting, alerts, notifications, cache

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

CREATE TABLE ads.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  alert_type text NOT NULL CHECK (alert_type IN ('budget_runout', 'spend_spike', 'acos_spike', 'zero_sales', 'buybox_lost', 'stock_low', 'cpc_surge', 'cvr_drop')),
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

CREATE TABLE ads.notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  notification_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  received_at timestamptz NOT NULL DEFAULT now()
);

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
