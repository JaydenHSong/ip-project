-- Notice System: notices table + RLS + notifications type update

-- ============================================================
-- 1. notices 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'notice'
    CHECK (category IN ('update', 'policy', 'notice', 'system')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notices_created ON notices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notices_pinned ON notices(is_pinned, created_at DESC);

-- ============================================================
-- 2. RLS Policies
-- ============================================================
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자 읽기
CREATE POLICY "notices_select" ON notices
  FOR SELECT USING (true);

-- Owner/Admin/Editor 생성
CREATE POLICY "notices_insert" ON notices
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin', 'editor'))
  );

-- Owner/Admin만 수정
CREATE POLICY "notices_update" ON notices
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Owner/Admin만 삭제
CREATE POLICY "notices_delete" ON notices
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- ============================================================
-- 3. notifications type CHECK에 'notice_new' 추가
-- ============================================================
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'report_approved', 'report_rejected', 'report_submitted',
    'followup_change_detected', 'followup_no_change',
    'campaign_completed', 'system_error',
    'patent_sync_completed', 'changelog_new',
    'notice_new'
  ));
