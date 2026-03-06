-- 018: listings 테이블에 screenshot_url + crawler_violation_result 추가
-- TASK-08: 크롤러 파이프라인 V2 기반 인프라

-- 1) 스크린샷 URL (Supabase Storage 업로드 후 저장)
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- 2) 크롤러 AI 분석 결과 (Haiku 2차 판정 결과)
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS crawler_ai_result JSONB;

-- 3) Supabase Storage 버킷 (이미 있으면 무시)
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- 4) Storage RLS: 서비스 역할은 업로드 가능, 누구나 읽기 가능
CREATE POLICY IF NOT EXISTS "screenshots_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'screenshots');

CREATE POLICY IF NOT EXISTS "screenshots_service_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'screenshots');
