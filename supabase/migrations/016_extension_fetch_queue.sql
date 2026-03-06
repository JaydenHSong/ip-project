-- Extension Background Fetch Queue
-- Extension이 브라우저에서 ASIN 상품 정보를 가져오기 위한 큐 테이블

CREATE TABLE IF NOT EXISTS extension_fetch_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asin TEXT NOT NULL,
  marketplace TEXT NOT NULL DEFAULT 'US',
  requested_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  picked_up_by TEXT
);

CREATE INDEX idx_ext_fetch_pending ON extension_fetch_queue(status) WHERE status = 'pending';

-- RLS
ALTER TABLE extension_fetch_queue ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 읽기
CREATE POLICY "Authenticated users can read fetch queue"
  ON extension_fetch_queue FOR SELECT
  TO authenticated
  USING (true);

-- 인증된 사용자 삽입
CREATE POLICY "Authenticated users can insert fetch queue"
  ON extension_fetch_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 인증된 사용자 업데이트
CREATE POLICY "Authenticated users can update fetch queue"
  ON extension_fetch_queue FOR UPDATE
  TO authenticated
  USING (true);
