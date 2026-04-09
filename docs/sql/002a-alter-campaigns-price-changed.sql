-- Design Ref: §2.2 — price_changed column for autopilot retail-signal
-- Plan SC: SC2 — campaigns.price_changed 컬럼 존재

ALTER TABLE ads.campaigns
  ADD COLUMN IF NOT EXISTS price_changed boolean DEFAULT false;

COMMENT ON COLUMN ads.campaigns.price_changed
  IS 'Retail signal: 최근 가격 변동 감지 여부 (autopilot retail-signal.ts 참조)';
