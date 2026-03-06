-- ============================================================
-- 018: Add related_asins to reports for multi-ASIN support
-- Allows one report to reference multiple ASINs (TASK-10)
-- Date: 2026-03-05
-- ============================================================

ALTER TABLE reports ADD COLUMN IF NOT EXISTS related_asins JSONB NOT NULL DEFAULT '[]';
-- Format: [{"asin": "B08VW17BNK", "marketplace": "US", "url": "https://..."}, ...]

NOTIFY pgrst, 'reload schema';
