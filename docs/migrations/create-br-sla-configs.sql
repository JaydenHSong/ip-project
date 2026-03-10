-- BR SLA Configs 테이블 생성 (없으면)
-- 이미 테이블이 있으면 RLS 정책만 확인

CREATE TABLE IF NOT EXISTS br_sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_category TEXT NOT NULL UNIQUE,
  expected_response_hours INTEGER NOT NULL DEFAULT 120,
  warning_threshold_hours INTEGER NOT NULL DEFAULT 96,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE br_sla_configs ENABLE ROW LEVEL SECURITY;

-- 읽기: 인증된 사용자 전체
CREATE POLICY IF NOT EXISTS "br_sla_configs_select"
  ON br_sla_configs FOR SELECT
  TO authenticated
  USING (true);

-- 쓰기: service_role 또는 인증된 사용자 (앱에서 Admin 체크)
CREATE POLICY IF NOT EXISTS "br_sla_configs_insert"
  ON br_sla_configs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "br_sla_configs_update"
  ON br_sla_configs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 기본 데이터 삽입 (이미 있으면 스킵)
INSERT INTO br_sla_configs (violation_category, expected_response_hours, warning_threshold_hours)
VALUES
  ('intellectual_property', 72, 48),
  ('listing_content', 120, 96),
  ('review_manipulation', 120, 96),
  ('selling_practice', 120, 96),
  ('regulatory_safety', 72, 48)
ON CONFLICT (violation_category) DO NOTHING;
