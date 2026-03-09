-- ============================================================
-- 025: BR Case Management — DB Schema
-- Date: 2026-03-08
-- Description: reports 확장 + 4개 신규 테이블 + notification 테이블
-- ============================================================

-- 1) reports 테이블 확장
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_case_status TEXT;
-- 값: 'open', 'work_in_progress', 'answered', 'needs_attention', 'closed'
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_last_amazon_reply_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_last_our_reply_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_sla_deadline_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_reply_pending_text TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_reply_pending_attachments JSONB;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_last_scraped_at TIMESTAMPTZ;

-- 2) BR 케이스 메시지 (대화 이력)
CREATE TABLE IF NOT EXISTS br_case_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  br_case_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  sent_at TIMESTAMPTZ NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_br_messages_report ON br_case_messages(report_id);
CREATE INDEX IF NOT EXISTS idx_br_messages_case ON br_case_messages(br_case_id);

-- 3) 내부 메모 (팀 전용)
CREATE TABLE IF NOT EXISTS br_case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_br_notes_report ON br_case_notes(report_id);

-- 4) 케이스 활동 로그
CREATE TABLE IF NOT EXISTS br_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  actor_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_br_events_report ON br_case_events(report_id);

-- 5) SLA 설정
CREATE TABLE IF NOT EXISTS br_sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_category TEXT NOT NULL,
  expected_response_hours INT NOT NULL DEFAULT 120,
  warning_threshold_hours INT NOT NULL DEFAULT 96,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6) 알림 규칙
CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL,
  condition JSONB DEFAULT '{}',
  target_role TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7) 알림
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  report_id UUID REFERENCES reports(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

-- 8) RLS 정책
ALTER TABLE br_case_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE br_case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE br_case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE br_sla_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 읽기 허용 (공통)
CREATE POLICY "authenticated_read_br_messages" ON br_case_messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_br_notes" ON br_case_notes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_br_events" ON br_case_events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_sla_configs" ON br_sla_configs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_notification_rules" ON notification_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_notifications" ON notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 쓰기: service_role 또는 인증된 사용자
CREATE POLICY "authenticated_insert_br_messages" ON br_case_messages
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_insert_br_notes" ON br_case_notes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_insert_br_events" ON br_case_events
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_br_notes" ON br_case_notes
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "authenticated_delete_br_notes" ON br_case_notes
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "authenticated_update_notifications" ON notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- SLA/Notification Rules: admin만 수정 (service_role로 관리)
CREATE POLICY "service_role_manage_sla" ON br_sla_configs
  FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_manage_notification_rules" ON notification_rules
  FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_manage_notifications" ON notifications
  FOR ALL TO service_role USING (true);

-- 9) SLA 기본값 시드
INSERT INTO br_sla_configs (violation_category, expected_response_hours, warning_threshold_hours) VALUES
  ('intellectual_property', 72, 48),
  ('listing_content', 120, 96),
  ('review_manipulation', 120, 96),
  ('selling_practice', 120, 96),
  ('regulatory_safety', 72, 48)
ON CONFLICT DO NOTHING;
