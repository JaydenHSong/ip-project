// Design Ref: products-sync.design.md §6.3 (Stage 2 channel delta)
// Plan SC: SC-01 (Stage 2 매칭률 ≥80%), D2 (Phase 1 Amazon US/CA only)
//
// Reads Amazon channel listings from `public.spg_amazon_all_listings` (SQ DataHub).
// Phase 1 filters channel_id to Amazon US/CA (D0 Blocker #7 pending Seller Central check).
//
// ⚠️ CHANNEL_ID → MARKETPLACE mapping is a best-guess from sampling analysis:
//   - 1001 → EU (German + English mix) — Phase 2
//   - 1002 → US (English-heavy) — Phase 1 ACTIVE
//   - 1003 → MX (Spanish-heavy, but could also cover CA) — Phase 1 ACTIVE (verify)
// W1 D1 TODO: confirm with Seller Central, update map below.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChannelRow } from '../../domain/types';
import { validateEan13 } from '../../domain/normalize';

const TABLE = 'spg_amazon_all_listings';
const BATCH_SIZE = 500;

// Default Phase 1 mapping (Amazon US/CA). Override at runtime via env var
//   ARC_PRODUCTS_CHANNEL_MAP="1002:US,1003:CA,1004:MX,1005:UK,..."
// to onboard new marketplaces without a code change. Each entry is `id:code`,
// where `code` is the products.channel_mapping.marketplace enum value.
const DEFAULT_AMAZON_CHANNEL_MARKETPLACE_MAP: Record<number, string> = {
  1002: 'US',
  1003: 'CA', // tentative — Seller Central verification pending
};

function parseChannelMapEnv(raw: string | undefined): Record<number, string> | null {
  if (!raw || !raw.trim()) return null;
  const map: Record<number, string> = {};
  for (const entry of raw.split(',')) {
    const [idStr, code] = entry.split(':').map((s) => s.trim());
    const id = Number(idStr);
    if (!Number.isFinite(id) || !code) continue;
    map[id] = code;
  }
  return Object.keys(map).length > 0 ? map : null;
}

export const AMAZON_CHANNEL_MARKETPLACE_MAP: Record<number, string> =
  parseChannelMapEnv(process.env.ARC_PRODUCTS_CHANNEL_MAP) ??
  DEFAULT_AMAZON_CHANNEL_MARKETPLACE_MAP;

export const AMAZON_PHASE1_CHANNEL_IDS: number[] = Object.keys(AMAZON_CHANNEL_MARKETPLACE_MAP)
  .map(Number);

type RawAmazonListing = {
  id: number;
  channel_id: number;
  item_name: string | null;
  listing_id: string | null;
  seller_sku: string | null;
  asin1: string | null;
  product_id: string | null;
  product_id_type: string | null;
  status: string | null;
  updated_at: string;
};

function toChannelRow(raw: RawAmazonListing): ChannelRow | null {
  const marketplace = AMAZON_CHANNEL_MARKETPLACE_MAP[raw.channel_id];
  if (!marketplace) return null; // Out-of-scope channel

  const externalId = raw.asin1 ?? raw.listing_id;
  if (!externalId) return null; // no identifier → skip (can't link)

  const ean = raw.product_id_type === '4' ? validateEan13(raw.product_id) : null;

  return {
    channel: 'amazon',
    marketplace,
    sourceTable: `sq_datahub.${TABLE}`,
    sourceRowId: raw.id,
    sellerSku: raw.seller_sku,
    externalId,
    ean,
    productName: raw.item_name,
    brand: null, // not present in this table; resolved via ERP match
    status: raw.status,
    updatedAt: raw.updated_at,
  };
}

/**
 * Delta reader for Amazon listings in Phase 1 scope (US/CA).
 * Yields batches of normalized ChannelRow sorted by updated_at for watermark progression.
 */
export async function* readAmazonDelta(
  client: SupabaseClient,
  watermark: string | null,
): AsyncGenerator<ChannelRow[], string | null> {
  let lastId = 0;
  let maxUpdatedAt = watermark;

  while (true) {
    let query = client
      .from(TABLE)
      .select('id,channel_id,item_name,listing_id,seller_sku,asin1,product_id,product_id_type,status,updated_at')
      .in('channel_id', AMAZON_PHASE1_CHANNEL_IDS)
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .gt('id', lastId)
      .limit(BATCH_SIZE);

    if (watermark) {
      query = query.gte('updated_at', watermark);
    }

    const { data, error } = await query;
    if (error) throw new Error(`[channel-source] read failed: ${error.message}`);

    const rawRows = (data ?? []) as RawAmazonListing[];
    if (rawRows.length === 0) break;

    const normalized: ChannelRow[] = [];
    for (const r of rawRows) {
      const row = toChannelRow(r);
      if (row) normalized.push(row);
      if (r.updated_at > (maxUpdatedAt ?? '')) maxUpdatedAt = r.updated_at;
      if (r.id > lastId) lastId = r.id;
    }

    if (normalized.length > 0) yield normalized;
    if (rawRows.length < BATCH_SIZE) break;
  }

  return maxUpdatedAt;
}

/**
 * Schema hash for drift detection (see Plan FR-19).
 */
export async function fetchAmazonColumnHash(client: SupabaseClient): Promise<string> {
  const { data, error } = await client
    .rpc('pg_get_columns_signature', { p_schema: 'public', p_table: TABLE })
    .maybeSingle();
  if (error || !data) return '';
  return String((data as { signature?: string }).signature ?? '');
}

export const AMAZON_SOURCE_TABLE_KEY = `sq_datahub.${TABLE}` as const;
