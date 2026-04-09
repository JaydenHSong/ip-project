-- Design Ref: §2.1 — ads.ai_reviews table for AI Weekly Review feature
-- Plan SC: SC1 — ai_reviews 테이블 존재 + RLS 적용

CREATE TABLE IF NOT EXISTS ads.ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_profile_id uuid NOT NULL
    REFERENCES ads.marketplace_profiles(id) ON DELETE CASCADE,
  review_type text NOT NULL DEFAULT 'weekly',
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  portfolio_summary text,
  input_summary jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_used text NOT NULL,
  tokens_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_reviews_profile
  ON ads.ai_reviews(marketplace_profile_id);
CREATE INDEX IF NOT EXISTS idx_ai_reviews_created
  ON ads.ai_reviews(created_at DESC);

-- RLS (기존 marketplace_profiles 패턴 복제)
ALTER TABLE ads.ai_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_reviews_select"
  ON ads.ai_reviews FOR SELECT
  USING (marketplace_profile_id IN (
    SELECT id FROM ads.marketplace_profiles
    WHERE org_unit_id IN (
      SELECT org_unit_id FROM public.user_org_units
      WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "ai_reviews_insert"
  ON ads.ai_reviews FOR INSERT
  WITH CHECK (marketplace_profile_id IN (
    SELECT id FROM ads.marketplace_profiles
    WHERE org_unit_id IN (
      SELECT org_unit_id FROM public.user_org_units
      WHERE user_id = auth.uid()
    )
  ));

-- Audit trigger
CREATE TRIGGER set_ai_reviews_updated_at
  BEFORE UPDATE ON ads.ai_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
