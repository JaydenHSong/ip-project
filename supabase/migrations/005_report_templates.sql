-- Drop old report_templates from 001_initial_schema (different schema)
-- 005 uses: title, body, category, violation_types[], marketplace[], tags[], is_default, usage_count, created_by
-- 001 used: violation_type, sub_type, template_title, template_body, policy_references, is_active, sort_order, updated_by
DROP TABLE IF EXISTS report_templates CASCADE;

CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  violation_types TEXT[] DEFAULT '{}',
  marketplace TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_templates_category ON report_templates(category);
CREATE INDEX idx_templates_violation ON report_templates USING GIN(violation_types);

-- RLS
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_read" ON report_templates FOR SELECT USING (true);
CREATE POLICY "templates_write" ON report_templates FOR ALL
  USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'editor')));
