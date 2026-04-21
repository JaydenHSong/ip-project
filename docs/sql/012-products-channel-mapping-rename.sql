-- Migration 012: Rename products.asin_mapping -> products.channel_mapping
-- Design Ref: products-sync.design.md §3.2 (zero-downtime via VIEW alias + UPDATABLE RULE)
-- Plan SC: SC-08 Provider v1 shape 보존, R8 migration 리스크 완화
--
-- Why: arc-products 원래 asin_mapping은 Amazon 전용 네이밍이었음. products-sync가
--      4채널(Amazon/Shopify/eBay/ML)을 지원하려면 다채널 컬럼 필요.
--      기존 arc-products 코드가 products.asin_mapping 참조하므로 VIEW로 하위호환.

BEGIN;

-- Step 1: rename table
ALTER TABLE products.asin_mapping RENAME TO channel_mapping;

-- Step 2: add channel/matched_via/last_synced_at columns
ALTER TABLE products.channel_mapping
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'amazon'
    CHECK (channel IN ('amazon','shopify','ebay','ml')),
  ADD COLUMN IF NOT EXISTS matched_via text
    CHECK (matched_via IS NULL OR matched_via IN ('ean','prefix8','manual','enrich')),
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Step 3: rename asin -> external_id, keep asin as generated column (Amazon only)
ALTER TABLE products.channel_mapping RENAME COLUMN asin TO external_id;

-- Drop and recreate UNIQUE indexes bound to old column name
DROP INDEX IF EXISTS products.idx_asin_mapping_asin_marketplace;
DROP INDEX IF EXISTS products.idx_asin_mapping_primary_unique;
DROP INDEX IF EXISTS products.idx_asin_mapping_product;
DROP INDEX IF EXISTS products.idx_asin_mapping_search;

CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_mapping_ext_marketplace_channel
  ON products.channel_mapping(external_id, marketplace, channel);
CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_mapping_primary_unique
  ON products.channel_mapping(product_id, marketplace, channel)
  WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_channel_mapping_product
  ON products.channel_mapping(product_id);
CREATE INDEX IF NOT EXISTS idx_channel_mapping_channel_marketplace
  ON products.channel_mapping(channel, marketplace) WHERE status = 'active';

-- Step 4: Backward-compat VIEW (Amazon-only slice)
CREATE OR REPLACE VIEW products.asin_mapping AS
  SELECT
    id, product_id,
    external_id AS asin,
    marketplace, is_primary, status,
    created_by, updated_by, created_at, updated_at,
    matched_via, last_synced_at
  FROM products.channel_mapping
  WHERE channel = 'amazon';

-- Step 5: Updatable view rules (INSERT / UPDATE / DELETE forward to channel_mapping)
CREATE OR REPLACE RULE asin_mapping_insert AS
  ON INSERT TO products.asin_mapping
  DO INSTEAD
  INSERT INTO products.channel_mapping
    (product_id, external_id, marketplace, is_primary, status,
     created_by, updated_by, channel)
  VALUES
    (NEW.product_id, NEW.asin, NEW.marketplace, NEW.is_primary, NEW.status,
     NEW.created_by, NEW.updated_by, 'amazon')
  RETURNING
    id, product_id, external_id AS asin,
    marketplace, is_primary, status,
    created_by, updated_by, created_at, updated_at,
    matched_via, last_synced_at;

CREATE OR REPLACE RULE asin_mapping_update AS
  ON UPDATE TO products.asin_mapping
  DO INSTEAD
  UPDATE products.channel_mapping
     SET product_id   = NEW.product_id,
         external_id  = NEW.asin,
         marketplace  = NEW.marketplace,
         is_primary   = NEW.is_primary,
         status       = NEW.status,
         updated_by   = NEW.updated_by,
         updated_at   = now()
   WHERE id = OLD.id AND channel = 'amazon'
   RETURNING
     id, product_id, external_id AS asin,
     marketplace, is_primary, status,
     created_by, updated_by, created_at, updated_at,
     matched_via, last_synced_at;

CREATE OR REPLACE RULE asin_mapping_delete AS
  ON DELETE TO products.asin_mapping
  DO INSTEAD
  DELETE FROM products.channel_mapping
   WHERE id = OLD.id AND channel = 'amazon';

-- Step 6: Grants (VIEW inherits, but be explicit for anon/authenticated)
GRANT SELECT ON products.asin_mapping TO anon, authenticated;
GRANT ALL    ON products.asin_mapping TO service_role;
GRANT SELECT ON products.channel_mapping TO anon, authenticated;
GRANT ALL    ON products.channel_mapping TO service_role;

-- Step 7: RLS (inherited from table, but VIEW needs explicit policy reference)
-- products.channel_mapping already has RLS from original asin_mapping migration (010).
-- VIEW asin_mapping reads through channel_mapping, RLS applies via underlying table.

COMMIT;

-- Step 8: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ─── Rollback script (store separately, run on failure) ───
-- BEGIN;
--   DROP RULE IF EXISTS asin_mapping_insert ON products.asin_mapping;
--   DROP RULE IF EXISTS asin_mapping_update ON products.asin_mapping;
--   DROP RULE IF EXISTS asin_mapping_delete ON products.asin_mapping;
--   DROP VIEW IF EXISTS products.asin_mapping;
--   ALTER TABLE products.channel_mapping
--     DROP COLUMN IF EXISTS channel,
--     DROP COLUMN IF EXISTS matched_via,
--     DROP COLUMN IF EXISTS last_synced_at;
--   ALTER TABLE products.channel_mapping RENAME COLUMN external_id TO asin;
--   ALTER TABLE products.channel_mapping RENAME TO asin_mapping;
--   NOTIFY pgrst, 'reload schema';
-- COMMIT;
