-- ============================================================
-- 017: Legacy OMS Data Migration Schema Changes
-- Adds 'OMS' source to listings and reports tables
-- Creates system user for legacy data ownership
-- Date: 2026-03-05
-- ============================================================

-- 1. Add 'OMS' to listings source constraint
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_source_check;
ALTER TABLE listings ADD CONSTRAINT listings_source_check
  CHECK (source IN ('crawler', 'extension', 'extension_passive', 'manual', 'OMS'));

-- 2. Add source column to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'sentinel';
-- Values: 'sentinel' (default), 'OMS' (legacy migration), 'extension'

-- 3. Create system user for legacy data (if not exists)
INSERT INTO users (id, email, name, role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'legacy-import@sentinel.system',
  'OMS Import',
  'admin',
  now()
)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
