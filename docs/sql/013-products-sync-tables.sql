-- Migration 013: products-sync tables (sync_runs, sync_watermarks, unmapped_queue)
-- Design Ref: products-sync.design.md §3.1 — 3 tables + 2 enums
-- Plan SC: SC-08 감사 추적, SC-01 매칭률 측정, SC-03 Unmapped resolve 워크플로우

BEGIN;

-- ─── Enums ────────────────────────────────────────────────────────────────
CREATE TYPE products.unmapped_reason AS ENUM (
  'no_ean_no_prefix',    -- EAN 없음 + prefix-8 master에 없음
  'prefix_ambiguous',    -- prefix-8 match 2+개, EAN 재시도도 실패
  'invalid_sku_format',  -- seller_sku NULL / 패턴 불일치
  'schema_drift',        -- 소스 컬럼 변경 감지
  'manual_flag'          -- 운영자가 수동 이동
);

CREATE TYPE products.unmapped_status AS ENUM (
  'pending', 'resolved', 'ignored'
);

-- ─── 1. sync_runs ─────────────────────────────────────────────────────────
CREATE TABLE products.sync_runs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id      uuid NOT NULL,
  stage            text NOT NULL
    CHECK (stage IN ('erp','channel_match','queue_resolve','manual_csv','schema_drift')),
  trigger          text NOT NULL
    CHECK (trigger IN ('cron','manual','api','admin')),
  triggered_by     uuid REFERENCES public.users(id),
  started_at       timestamptz NOT NULL DEFAULT now(),
  finished_at      timestamptz,
  status           text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','success','failed','partial','schema_drift')),
  rows_fetched     int DEFAULT 0,
  rows_inserted    int DEFAULT 0,
  rows_updated     int DEFAULT 0,
  rows_skipped     int DEFAULT 0,
  rows_mapped      int DEFAULT 0,
  rows_unmapped    int DEFAULT 0,
  rows_queued      int DEFAULT 0,
  watermark_before timestamptz,
  watermark_after  timestamptz,
  source_table     text,
  error_message    text,
  duration_ms      int GENERATED ALWAYS AS
    (CASE WHEN finished_at IS NOT NULL
          THEN (EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000)::int
          ELSE NULL END) STORED
);

CREATE INDEX idx_sync_runs_pipeline ON products.sync_runs(pipeline_id);
CREATE INDEX idx_sync_runs_started  ON products.sync_runs(started_at DESC);
CREATE INDEX idx_sync_runs_status   ON products.sync_runs(status)
  WHERE status IN ('running','failed','partial','schema_drift');

-- ─── 2. sync_watermarks ────────────────────────────────────────────────────
CREATE TABLE products.sync_watermarks (
  source_table    text PRIMARY KEY,
  last_run_at     timestamptz,
  last_updated_at timestamptz,
  last_run_id     uuid REFERENCES products.sync_runs(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Pre-populate known source tables
INSERT INTO products.sync_watermarks (source_table) VALUES
  ('sq_datahub.spg_operation_sis_z1ppr0010_1000'),
  ('sq_datahub.spg_amazon_all_listings')
ON CONFLICT (source_table) DO NOTHING;

-- ─── 3. unmapped_queue ────────────────────────────────────────────────────
CREATE TABLE products.unmapped_queue (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table     text NOT NULL,
  source_row_id    bigint NOT NULL,
  channel          text NOT NULL
    CHECK (channel IN ('amazon','shopify','ebay','ml')),
  marketplace      text,
  external_id      text NOT NULL,
  source_sku       text,
  source_ean       text,
  product_name     text,
  brand            text,
  detected_at      timestamptz NOT NULL DEFAULT now(),
  detected_run_id  uuid REFERENCES products.sync_runs(id) ON DELETE SET NULL,
  reason           products.unmapped_reason NOT NULL,
  reason_detail    jsonb NOT NULL DEFAULT '{}'::jsonb,
  status           products.unmapped_status NOT NULL DEFAULT 'pending',
  resolved_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at      timestamptz,
  resolved_sku     text, -- no FK: products.products.sku is UNIQUE only together with version; app-level integrity check in orchestrator
  resolved_action  text
    CHECK (resolved_action IS NULL OR resolved_action IN ('mapped','created_new','ignored','reverted')),
  undo_expires_at  timestamptz,
  UNIQUE (source_table, source_row_id, channel, marketplace)
);

CREATE INDEX idx_unmapped_status_detected
  ON products.unmapped_queue(status, detected_at DESC);
CREATE INDEX idx_unmapped_channel_pending
  ON products.unmapped_queue(channel, marketplace)
  WHERE status = 'pending';
CREATE INDEX idx_unmapped_undo_active
  ON products.unmapped_queue(undo_expires_at)
  WHERE status = 'resolved' AND undo_expires_at IS NOT NULL;

-- ─── updated_at trigger for sync_watermarks ────────────────────────────────
CREATE OR REPLACE FUNCTION products.touch_updated_at_watermarks()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_sync_watermarks_updated_at
  BEFORE UPDATE ON products.sync_watermarks
  FOR EACH ROW EXECUTE FUNCTION products.touch_updated_at_watermarks();

-- ─── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE products.sync_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products.sync_watermarks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE products.unmapped_queue   ENABLE ROW LEVEL SECURITY;

-- sync_runs: authenticated read, service_role write
CREATE POLICY sync_runs_read  ON products.sync_runs  FOR SELECT TO authenticated USING (true);
CREATE POLICY sync_runs_admin ON products.sync_runs  FOR ALL    TO service_role   USING (true) WITH CHECK (true);

-- sync_watermarks: same pattern
CREATE POLICY sync_watermarks_read  ON products.sync_watermarks FOR SELECT TO authenticated USING (true);
CREATE POLICY sync_watermarks_admin ON products.sync_watermarks FOR ALL    TO service_role   USING (true) WITH CHECK (true);

-- unmapped_queue: authenticated read pending, editor+ resolve (via service_role)
CREATE POLICY unmapped_read  ON products.unmapped_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY unmapped_admin ON products.unmapped_queue FOR ALL    TO service_role   USING (true) WITH CHECK (true);

-- ─── Grants ───────────────────────────────────────────────────────────────
GRANT SELECT ON products.sync_runs, products.sync_watermarks, products.unmapped_queue
  TO anon, authenticated;
GRANT ALL ON products.sync_runs, products.sync_watermarks, products.unmapped_queue
  TO service_role;
GRANT USAGE ON TYPE products.unmapped_reason TO anon, authenticated, service_role;
GRANT USAGE ON TYPE products.unmapped_status TO anon, authenticated, service_role;

COMMIT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ─── Rollback (destructive — run on failure only) ─────────────────────────
-- BEGIN;
--   DROP TRIGGER IF EXISTS trg_sync_watermarks_updated_at ON products.sync_watermarks;
--   DROP FUNCTION IF EXISTS products.touch_updated_at_watermarks();
--   DROP TABLE IF EXISTS products.unmapped_queue CASCADE;
--   DROP TABLE IF EXISTS products.sync_watermarks CASCADE;
--   DROP TABLE IF EXISTS products.sync_runs CASCADE;
--   DROP TYPE IF EXISTS products.unmapped_status CASCADE;
--   DROP TYPE IF EXISTS products.unmapped_reason CASCADE;
--   NOTIFY pgrst, 'reload schema';
-- COMMIT;
