-- =============================================================================
-- arc-products Module — products Schema Migration
-- =============================================================================
-- Design Ref: docs/02-design/features/arc-products.design.md §2
-- Plan SC:    SC-07 (Provider Contract v1), SC-08 (Audit log)
-- Date:       2026-04-20
-- Run in:     Supabase SQL Editor (njbhqrrdnmiarjjpgqwd)
-- Order:      Run this BEFORE deploying any application code
-- Idempotent: Re-running is safe (CREATE ... IF NOT EXISTS + DROP TRIGGER IF EXISTS)
-- =============================================================================

-- 1. Schema
CREATE SCHEMA IF NOT EXISTS products;

-- =============================================================================
-- 2. Tables
-- =============================================================================

-- 2.1 products.products — SKU Master (Spigen 자재 리스팅 포맷 반영)
CREATE TABLE IF NOT EXISTS products.products (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- === Identity ===
  sku                   text NOT NULL,
  parent_sku            text,

  -- === 자재 내역 (EN/KO) ===
  product_name          text NOT NULL,
  product_name_ko       text,
  product_name_en_short text,
  model_name            text,
  model_name_ko         text,

  -- === Device / Appearance ===
  device_model          text,
  color                 text,

  -- === Batch / Identifiers ===
  version               text NOT NULL DEFAULT 'V1',
  ean_barcode           text,

  -- === Commerce ===
  unit_price            numeric(10,2),
  origin_country        char(2),
  brand_id              uuid NOT NULL REFERENCES public.brands(id),
  category              text,
  lifecycle_status      text NOT NULL DEFAULT 'active'
    CHECK (lifecycle_status IN ('active', 'new', 'eol', 'discontinued')),

  -- === Change tracking (latest only; full history in audit) ===
  change_reason         text,
  change_detail         text,

  -- === Operations ===
  lead_time_days        integer,
  inbox_qty             integer,
  outbox_qty            integer,
  item_grade            text,
  inventory_grade       text,
  mrp_manager           text,

  -- === Dimensions (mm) ===
  raw_dim_width         numeric(8,2),
  raw_dim_height        numeric(8,2),
  raw_dim_depth         numeric(8,2),
  package_dim           text,

  -- === Organization ===
  batch_created_at      date,
  department            text,
  org_unit_id           uuid NOT NULL REFERENCES public.org_units(id),

  -- === Extensibility ===
  metadata              jsonb NOT NULL DEFAULT '{}',

  -- === Audit metadata ===
  created_by            uuid NOT NULL REFERENCES public.users(id),
  updated_by            uuid NOT NULL REFERENCES public.users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  UNIQUE (sku, version)
);

CREATE INDEX IF NOT EXISTS idx_products_sku        ON products.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_org_unit   ON products.products(org_unit_id);
CREATE INDEX IF NOT EXISTS idx_products_brand      ON products.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_parent     ON products.products(parent_sku);
CREATE INDEX IF NOT EXISTS idx_products_device     ON products.products(device_model);
CREATE INDEX IF NOT EXISTS idx_products_ean        ON products.products(ean_barcode);
CREATE INDEX IF NOT EXISTS idx_products_version    ON products.products(sku, version DESC);
CREATE INDEX IF NOT EXISTS idx_products_lifecycle  ON products.products(lifecycle_status);

-- 2.2 products.asin_mapping — ASIN × Marketplace
CREATE TABLE IF NOT EXISTS products.asin_mapping (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       uuid NOT NULL REFERENCES products.products(id) ON DELETE CASCADE,
  asin             text NOT NULL,
  marketplace      text NOT NULL
    CHECK (marketplace IN ('US','CA','MX','UK','DE','FR','IT','ES','JP','AU','SG')),
  is_primary       boolean NOT NULL DEFAULT false,
  status           text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'archived')),
  brand_market_id  uuid REFERENCES public.brand_markets(id),
  created_by       uuid NOT NULL REFERENCES public.users(id),
  updated_by       uuid NOT NULL REFERENCES public.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asin, marketplace)
);

CREATE INDEX IF NOT EXISTS idx_asin_mapping_asin    ON products.asin_mapping(asin);
CREATE INDEX IF NOT EXISTS idx_asin_mapping_product ON products.asin_mapping(product_id);
CREATE INDEX IF NOT EXISTS idx_asin_mapping_market  ON products.asin_mapping(marketplace);
CREATE INDEX IF NOT EXISTS idx_asin_mapping_status  ON products.asin_mapping(status);

-- Partial UNIQUE: per (product_id, marketplace), is_primary=true can exist for at most 1 row
CREATE UNIQUE INDEX IF NOT EXISTS idx_asin_mapping_primary_unique
  ON products.asin_mapping(product_id, marketplace)
  WHERE is_primary = true;

-- 2.3 products.asin_mapping_audit — append-only (DB trigger fills)
CREATE TABLE IF NOT EXISTS products.asin_mapping_audit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id  uuid,
  user_id     uuid NOT NULL REFERENCES public.users(id),
  action      text NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE')),
  before      jsonb,
  after       jsonb,
  source      text NOT NULL DEFAULT 'api'
    CHECK (source IN ('api','csv','trigger')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asin_mapping_audit_mapping
  ON products.asin_mapping_audit(mapping_id);
CREATE INDEX IF NOT EXISTS idx_asin_mapping_audit_created
  ON products.asin_mapping_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asin_mapping_audit_user
  ON products.asin_mapping_audit(user_id);

-- =============================================================================
-- 3. Trigger function — auto-populate audit log on mutation
-- =============================================================================

CREATE OR REPLACE FUNCTION products.log_asin_mapping_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''   -- Security: pin search_path (Supabase advisor 0011)
AS $fn$
DECLARE
  v_user uuid;
BEGIN
  -- Resolve user: session-setting (set by app) → row's updated_by → fallback NULL-guard
  BEGIN
    v_user := current_setting('app.current_user_id', true)::uuid;
  EXCEPTION WHEN others THEN
    v_user := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    IF v_user IS NULL THEN
      v_user := NEW.updated_by;
    END IF;

    INSERT INTO products.asin_mapping_audit
      (mapping_id, user_id, action, before, after, source)
    VALUES
      (NEW.id, v_user, 'CREATE', NULL, to_jsonb(NEW), 'trigger');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF v_user IS NULL THEN
      v_user := coalesce(NEW.updated_by, OLD.updated_by);
    END IF;

    INSERT INTO products.asin_mapping_audit
      (mapping_id, user_id, action, before, after, source)
    VALUES
      (NEW.id, v_user, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), 'trigger');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF v_user IS NULL THEN
      v_user := OLD.updated_by;
    END IF;

    INSERT INTO products.asin_mapping_audit
      (mapping_id, user_id, action, before, after, source)
    VALUES
      (OLD.id, v_user, 'DELETE', to_jsonb(OLD), NULL, 'trigger');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_asin_mapping_audit ON products.asin_mapping;
CREATE TRIGGER trg_asin_mapping_audit
  AFTER INSERT OR UPDATE OR DELETE ON products.asin_mapping
  FOR EACH ROW EXECUTE FUNCTION products.log_asin_mapping_audit();

-- Auto-update products.updated_at on UPDATE
CREATE OR REPLACE FUNCTION products.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''   -- Security: pin search_path (Supabase advisor 0011)
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_products_updated_at ON products.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products.products
  FOR EACH ROW EXECUTE FUNCTION products.touch_updated_at();

DROP TRIGGER IF EXISTS trg_asin_mapping_updated_at ON products.asin_mapping;
CREATE TRIGGER trg_asin_mapping_updated_at
  BEFORE UPDATE ON products.asin_mapping
  FOR EACH ROW EXECUTE FUNCTION products.touch_updated_at();

-- =============================================================================
-- 4. RLS (Row Level Security)
-- =============================================================================

ALTER TABLE products.products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE products.asin_mapping       ENABLE ROW LEVEL SECURITY;
ALTER TABLE products.asin_mapping_audit ENABLE ROW LEVEL SECURITY;

-- products / asin_mapping: authenticated read (withAuth handles role check server-side)
DROP POLICY IF EXISTS products_read_authenticated ON products.products;
CREATE POLICY products_read_authenticated
  ON products.products FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS asin_mapping_read_authenticated ON products.asin_mapping;
CREATE POLICY asin_mapping_read_authenticated
  ON products.asin_mapping FOR SELECT
  TO authenticated
  USING (true);

-- audit: admin/owner only
DROP POLICY IF EXISTS audit_read_admin_only ON products.asin_mapping_audit;
CREATE POLICY audit_read_admin_only
  ON products.asin_mapping_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('owner','admin')
    )
  );

-- =============================================================================
-- 5. Grants
-- =============================================================================

GRANT USAGE  ON SCHEMA products                TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA products  TO authenticated;
GRANT ALL    ON ALL TABLES IN SCHEMA products  TO service_role;

-- service_role가 향후 새 테이블 추가 시 자동 grant (future tables)
ALTER DEFAULT PRIVILEGES IN SCHEMA products GRANT SELECT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA products GRANT ALL    ON TABLES TO service_role;

-- =============================================================================
-- 6. Verification queries (run after migration)
-- =============================================================================

-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'products';
--   expected: products, asin_mapping, asin_mapping_audit
--
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'products.asin_mapping'::regclass;
--   expected: trg_asin_mapping_audit, trg_asin_mapping_updated_at
--
-- SELECT policyname FROM pg_policies WHERE schemaname = 'products';
--   expected: 3 policies
