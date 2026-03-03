-- Migration 010: 캠페인 빈도 옵션 추가 (every_3d, weekly)
-- 기존: daily, every_12h, every_6h
-- 추가: every_3d (3일마다), weekly (주 1회)

ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_frequency_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_frequency_check
  CHECK (frequency IN ('daily', 'every_12h', 'every_6h', 'every_3d', 'weekly'));
