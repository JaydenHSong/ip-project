-- Add screenshot_url column to listings table
-- Evidence screenshot captured during crawling, stored in Supabase Storage

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

COMMENT ON COLUMN listings.screenshot_url IS
  'Supabase Storage URL for evidence screenshot captured during crawling';
