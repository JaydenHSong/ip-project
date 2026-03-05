-- Campaign result tracking columns
-- 014에서 이미 추가: last_crawled_at, total_listings, last_result

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_sent integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_violations integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS success_rate numeric DEFAULT 0;

NOTIFY pgrst, 'reload schema';
