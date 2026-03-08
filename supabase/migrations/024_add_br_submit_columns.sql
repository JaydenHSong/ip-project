-- BR (Brand Registry) Submit 컬럼 추가
-- SC Track과 동일한 패턴으로 BR Track 지원

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS br_submit_data JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS br_case_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS br_submitted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS br_submission_error TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS br_submit_attempts INTEGER DEFAULT 0;

-- br_submitting 상태 인덱스 (스케줄러 폴링 성능)
CREATE INDEX IF NOT EXISTS idx_reports_br_submitting
  ON reports (created_at)
  WHERE status = 'br_submitting';

COMMENT ON COLUMN reports.br_submit_data IS 'BR Contact Support 폼 데이터 (제출 후 null)';
COMMENT ON COLUMN reports.br_case_id IS 'BR 제출 후 반환된 케이스 ID';
COMMENT ON COLUMN reports.br_submitted_at IS 'BR 제출 완료 시각';
COMMENT ON COLUMN reports.br_submission_error IS 'BR 제출 실패 시 에러 메시지';
COMMENT ON COLUMN reports.br_submit_attempts IS 'BR 제출 시도 횟수';
