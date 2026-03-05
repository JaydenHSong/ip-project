-- AI 학습 기록 테이블
-- 크롤러 로그, 신고서 결과 등을 분석한 AI 인사이트 저장

CREATE TABLE IF NOT EXISTS ai_learning_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,          -- 'crawler', 'report_draft', 'violation_detection' 등
  source text NOT NULL,            -- 'crawler_logs', 'report_feedback', 'manual'
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,

  -- AI 분석 결과
  summary text NOT NULL,           -- 핵심 요약 (1~2문장)
  insights jsonb NOT NULL DEFAULT '[]',  -- 상세 인사이트 배열
  recommendations jsonb NOT NULL DEFAULT '[]',  -- 개선 권고 사항
  metrics jsonb NOT NULL DEFAULT '{}',   -- 수치 데이터 (성공률, 에러율 등)

  -- 적용 여부
  applied boolean DEFAULT false,
  applied_at timestamptz,
  applied_details text,

  -- 메타
  model text NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
  tokens_used integer,
  created_at timestamptz DEFAULT now()
);

-- 카테고리 + 기간으로 조회
CREATE INDEX idx_ai_learning_category ON ai_learning_records (category, period_end DESC);

NOTIFY pgrst, 'reload schema';
