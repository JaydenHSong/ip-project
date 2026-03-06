-- Extension 릴리즈 관리 테이블
-- 익스텐션 업데이트 시 웹 배포 없이 DB + Storage만 업데이트

CREATE TABLE extension_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  download_url TEXT NOT NULL,
  changes TEXT[] NOT NULL DEFAULT '{}',
  released_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 최신 버전 빠르게 조회
CREATE INDEX idx_extension_releases_released_at ON extension_releases(released_at DESC);

-- RLS: 누구나 읽기 가능, 쓰기는 service role만
ALTER TABLE extension_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read extension releases"
  ON extension_releases FOR SELECT
  USING (true);

-- 기존 릴리즈 히스토리 시드
INSERT INTO extension_releases (version, download_url, changes, released_at) VALUES
  ('1.0.0', '/downloads/sentinel-extension-v1.0.0.zip', ARRAY['Initial release', 'Manual violation reporting from Amazon product pages', 'Screenshot capture and upload'], '2026-02-15T00:00:00Z'),
  ('1.2.0', '/downloads/sentinel-extension-v1.2.0.zip', ARRAY['Floating report button on Amazon product pages', 'Violation selector with category grouping', 'Google OAuth authentication'], '2026-02-28T00:00:00Z'),
  ('1.3.0', '/downloads/sentinel-extension-v1.3.0.zip', ARRAY['Background ASIN Fetch: Auto-fetch product data from server queue', 'Preview & countdown: 5-second preview before sending reports', 'Sending view: Visual feedback during report submission', 'Passive collection: Auto-collect page data while browsing Amazon', 'Settings view: Toggle background fetch, change marketplace'], '2026-03-05T00:00:00Z'),
  ('1.3.1', '/downloads/sentinel-extension-v1.3.1.zip', ARRAY['Bot window: Background Fetch now opens a dedicated window instead of using your browser tabs', 'Natural navigation: Search → Product two-step browsing pattern for better anti-detection', 'Screenshot fix: Fixed capture failure that caused all reports to have no screenshots', 'Bot status page: Real-time status display (searching → browsing → capturing → done)'], '2026-03-06T00:00:00Z'),
  ('1.4.0', '/downloads/sentinel-extension-v1.4.0.zip', ARRAY['i18n: Korean / English language switching in extension settings', 'Design renewal: Light theme aligned with Sentinel web UI', 'Rounded corners, soft shadows, and smooth animations', 'Toggle switch redesign with modern slider style', 'Violation type names displayed in selected language'], '2026-03-05T12:00:00Z');

-- Supabase Storage에 extension-releases 버킷 생성은 대시보드에서 수동으로 할 것
-- (SQL로는 storage.buckets INSERT 가능하지만 정책 설정이 복잡하므로 UI 추천)
