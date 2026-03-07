-- AI 프롬프트 버전 관리
CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_type TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  accuracy_score NUMERIC(5,2),
  sample_count INT DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE UNIQUE INDEX idx_ai_prompts_type_version ON ai_prompts(prompt_type, version);
CREATE INDEX idx_ai_prompts_active ON ai_prompts(prompt_type) WHERE is_active = true;

-- AI 정확도 로그 (주간 집계)
CREATE TABLE ai_accuracy_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  prompt_type TEXT NOT NULL,
  prompt_version INT NOT NULL,
  total_analyzed INT NOT NULL DEFAULT 0,
  total_confirmed INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  wrong_count INT NOT NULL DEFAULT 0,
  accuracy_pct NUMERIC(5,2),
  confusion_matrix JSONB DEFAULT '{}',
  top_errors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_accuracy_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_prompts_read" ON ai_prompts FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_prompts_write" ON ai_prompts FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "ai_accuracy_logs_read" ON ai_accuracy_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_accuracy_logs_write" ON ai_accuracy_logs FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );
