-- 014: Report Workflow Overhaul — SC 자동 제출 + 재제출 지원
-- 새 중간 상태 추가 및 재제출/SC 추적 컬럼

-- 새 중간 상태 추가
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE reports ADD CONSTRAINT reports_status_check
  CHECK (status IN (
    'draft','pending_review','approved','rejected','cancelled',
    'sc_submitting','submitted','monitoring','resolved','unresolved',
    'resubmitted','escalated','archived'
  ));

-- 재제출 추적
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resubmit_count INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resubmit_interval_days INTEGER;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS max_resubmit_count INTEGER;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS next_resubmit_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS last_resubmit_at TIMESTAMPTZ;

-- SC 제출 추적
ALTER TABLE reports ADD COLUMN IF NOT EXISTS sc_submit_attempts INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS sc_last_attempt_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS sc_submit_data JSONB;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_reports_sc_submitting ON reports(status) WHERE status = 'sc_submitting';
CREATE INDEX IF NOT EXISTS idx_reports_resubmit ON reports(status, next_resubmit_at) WHERE status = 'unresolved';

-- 시스템 설정 기본값
CREATE TABLE IF NOT EXISTS system_configs (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO system_configs (key, value) VALUES
  ('sc_automation', '{"auto_submit_enabled":true,"rate_limit_per_hour":10}'),
  ('resubmit_defaults', '{"interval_days":7,"max_count":3,"auto_strengthen":true}')
ON CONFLICT (key) DO NOTHING;

-- AI 학습 기록 (AI Skill Library)
CREATE TABLE IF NOT EXISTS ai_learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id),
  trigger TEXT NOT NULL, -- 'approved_edited', 'rewritten', 'sc_submitted', 'resolved', 'resubmitted'
  violation_type TEXT,
  original_draft TEXT,
  final_draft TEXT,
  feedback TEXT, -- editor feedback for rewrite cases
  outcome TEXT, -- 'success', 'no_change', etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_learning_trigger ON ai_learning_records(trigger);
CREATE INDEX IF NOT EXISTS idx_ai_learning_violation ON ai_learning_records(violation_type);
