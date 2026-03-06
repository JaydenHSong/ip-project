-- ============================================================
-- 013: Add 'manual' to listings source_check constraint
-- Allows ASIN auto-listing to create listings with source='manual'
-- Date: 2026-03-05
-- ============================================================

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_source_check;
ALTER TABLE listings ADD CONSTRAINT listings_source_check
  CHECK (source IN ('crawler', 'extension', 'extension_passive', 'manual'));

NOTIFY pgrst, 'reload schema';
