-- 026: Screenshot history + fetch queue metadata
-- Report 스크린샷 히스토리 + Extension fetch queue 메타데이터 지원

-- 1) reports 테이블에 screenshots JSONB 배열 추가 (히스토리)
-- 형식: [{url: string, captured_at: string, source: 'extension'|'bgfetch'|'crawler'}]
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS screenshots JSONB DEFAULT '[]';

-- 2) extension_fetch_queue에 metadata JSONB 추가
-- screenshot 캡처 요청 시 {report_id, purpose: 'screenshot'} 등 전달
ALTER TABLE extension_fetch_queue
  ADD COLUMN IF NOT EXISTS metadata JSONB;
