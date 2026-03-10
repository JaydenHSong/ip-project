-- SC → PD 컬럼 리네이밍 마이그레이션
-- Supabase SQL Editor에서 실행

-- reports 테이블
ALTER TABLE reports RENAME COLUMN sc_submit_data TO pd_submit_data;
ALTER TABLE reports RENAME COLUMN sc_case_id TO pd_case_id;
ALTER TABLE reports RENAME COLUMN sc_submission_error TO pd_submission_error;
ALTER TABLE reports RENAME COLUMN sc_submit_attempts TO pd_submit_attempts;
ALTER TABLE reports RENAME COLUMN sc_submitted_at TO pd_submitted_at;
ALTER TABLE reports RENAME COLUMN sc_last_attempt_at TO pd_last_attempt_at;

-- reports status enum 변경: sc_submitting → pd_submitting
-- PostgreSQL에서는 CHECK constraint로 관리되므로 데이터 먼저 업데이트
UPDATE reports SET status = 'pd_submitting' WHERE status = 'sc_submitting';

-- system_configs 키 변경
UPDATE system_configs SET key = 'pd_automation_settings' WHERE key = 'sc_automation_settings';

-- audit_logs 액션명 변경
UPDATE audit_logs SET action = 'pd_credential_accessed' WHERE action = 'sc_credential_accessed';
UPDATE audit_logs SET action = 'pd_credential_updated' WHERE action = 'sc_credential_updated';
UPDATE audit_logs SET action = 'pd_submit_success' WHERE action = 'sc_submit_success';
UPDATE audit_logs SET action = 'pd_submit_failed' WHERE action = 'sc_submit_failed';

-- timeline events 변경 (reports.timeline JSONB 내부)
-- 기존 submitted_sc → submitted_pd (JSONB 배열 내부라 직접 SQL로 변환은 복잡)
-- 새 이벤트만 submitted_pd로 기록되므로, 기존 데이터는 그대로 둬도 무방

-- D2: PD 팔로업 개별 간격 오버라이드 컬럼
ALTER TABLE reports ADD COLUMN IF NOT EXISTS pd_followup_interval_days INTEGER DEFAULT NULL;
