-- Part 5/5: RLS + triggers + grants

-- RLS: campaigns
ALTER TABLE ads.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_campaigns_select" ON ads.campaigns FOR SELECT USING (
  org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
  AND brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_campaigns_insert" ON ads.campaigns FOR INSERT WITH CHECK (
  org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
  AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_campaigns_update" ON ads.campaigns FOR UPDATE USING (
  org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
  AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);

-- RLS: rules
ALTER TABLE ads.rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_rules_select" ON ads.rules FOR SELECT USING (
  org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
  AND brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_rules_insert" ON ads.rules FOR INSERT WITH CHECK (
  org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
  AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_rules_update" ON ads.rules FOR UPDATE USING (
  org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
  AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);

-- RLS: budgets
ALTER TABLE ads.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_budgets_select" ON ads.budgets FOR SELECT USING (
  org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
  AND brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_budgets_insert" ON ads.budgets FOR INSERT WITH CHECK (
  org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
  AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_budgets_update" ON ads.budgets FOR UPDATE USING (
  org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
  AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);

-- RLS: keyword_recommendations
ALTER TABLE ads.keyword_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_recommendations_select" ON ads.keyword_recommendations FOR SELECT USING (
  brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_recommendations_update" ON ads.keyword_recommendations FOR UPDATE USING (
  brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);

-- RLS: alerts
ALTER TABLE ads.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_alerts_select" ON ads.alerts FOR SELECT USING (
  brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
);

-- RLS: dayparting_schedules
ALTER TABLE ads.dayparting_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_dayparting_select" ON ads.dayparting_schedules FOR SELECT USING (
  org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
  AND brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
);
CREATE POLICY "ads_dayparting_modify" ON ads.dayparting_schedules FOR ALL USING (
  org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
  AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
);

-- RLS: report_snapshots
ALTER TABLE ads.report_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_snapshots_select" ON ads.report_snapshots FOR SELECT USING (
  brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
);

-- RLS: automation_log
ALTER TABLE ads.automation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_automation_log_select" ON ads.automation_log FOR SELECT USING (
  campaign_id IN (
    SELECT id FROM ads.campaigns
    WHERE org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
      AND brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  )
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION ads.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Grants
GRANT USAGE ON SCHEMA ads TO authenticated;
GRANT USAGE ON SCHEMA ads TO service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA ads TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA ads TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA ads GRANT SELECT, INSERT, UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA ads GRANT ALL ON TABLES TO service_role;
