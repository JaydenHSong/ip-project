// Design Ref: products-sync.design.md §6.2 (Stage 1 ERP delta fetch)
// Plan SC: SC-02 (Freshness ≤24h), NFR-01 (≤5k rows / 5min / batch 500)
//
// Reads SAP SIS master `public.spg_operation_sis_z1ppr0010_1000` from SQ DataHub
// and yields normalized ErpRow batches filtered by Spigen SKU pattern.
// Uses watermark-based delta (source_updated_at > watermark).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ErpRow } from '../../domain/types';

const TABLE = 'spg_operation_sis_z1ppr0010_1000';
// 1000 (up from 500): regex filter does seq-scan against 1.8M rows per query;
// larger batch amortizes that scan over more useful rows without proportionally
// increasing time. Supabase upsert tolerates 1000-row payloads cleanly.
// readErpActiveAll uses BATCH_SIZE * 2 = 2000 for full-scan efficiency.
const BATCH_SIZE = 1000;

// Spigen SKU regex: ACS/AMP/AMM + 5 digits OR legacy '000' + 2 letters + 5 digits
// Sampling showed these patterns cover 98.8% of channel listings.
const SPIGEN_SKU_PATTERN = '^([A-Z]{3}[0-9]{5}|000[A-Z]{2}[0-9]{5})';

type RawSisRow = {
  id: number;
  material: string;
  material_description_en: string | null;
  material_description_ko: string | null;
  brand: string | null;
  brand_description: string | null;
  color: string | null;
  color_description: string | null;
  model: string | null;
  model_description_en: string | null;
  ean_barcode: string | null;
  upc_barcode: string | null;
  material_status: string | null;
  source_created_at: string | null;
  updated_at: string;
};

function toErpRow(raw: RawSisRow): ErpRow {
  return {
    material: raw.material,
    materialDescriptionEn: raw.material_description_en,
    materialDescriptionKo: raw.material_description_ko,
    brand: raw.brand,
    brandDescription: raw.brand_description,
    color: raw.color,
    colorDescription: raw.color_description,
    model: raw.model,
    modelDescriptionEn: raw.model_description_en,
    eanBarcode: raw.ean_barcode,
    upcBarcode: raw.upc_barcode,
    materialStatus: raw.material_status,
    sourceUpdatedAt: raw.updated_at,
  };
}

/**
 * Delta reader — yields batches of ErpRow since `watermark`.
 * Batch size 500 matches NFR-01 throughput target.
 *
 * Example:
 *   for await (const batch of readErpDelta(client, '2026-04-20T00:00:00Z')) {
 *     await productsSink.upsertBatch(batch, { source: 'erp', userId });
 *   }
 */
export async function* readErpDelta(
  client: SupabaseClient,
  watermark: string | null,
): AsyncGenerator<ErpRow[], string | null> {
  let lastId = 0;
  let maxUpdatedAt = watermark;

  while (true) {
    let query = client
      .from(TABLE)
      .select('id,material,material_description_en,material_description_ko,brand,brand_description,color,color_description,model,model_description_en,ean_barcode,upc_barcode,material_status,source_created_at,updated_at')
      .not('material', 'is', null)
      .filter('material', 'match', SPIGEN_SKU_PATTERN)
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .gt('id', lastId)
      .limit(BATCH_SIZE);

    if (watermark) {
      query = query.gte('updated_at', watermark);
    }

    const { data, error } = await query;
    if (error) throw new Error(`[erp-source] Supabase read failed: ${error.message}`);

    const rows = (data ?? []) as RawSisRow[];
    if (rows.length === 0) break;

    for (const r of rows) {
      if (r.updated_at > (maxUpdatedAt ?? '')) maxUpdatedAt = r.updated_at;
      if (r.id > lastId) lastId = r.id;
    }

    yield rows.map(toErpRow);
    if (rows.length < BATCH_SIZE) break;
  }

  return maxUpdatedAt;
}

/**
 * Full-scan reader for building ERP index in memory (Stage 2 prerequisite).
 * Returns ALL active Spigen SKUs (not delta-filtered). Used by matcher to build
 * in-memory lookup map (byEan, byPrefix8). ~20k rows ≈ 10MB memory.
 */
export async function readErpActiveAll(client: SupabaseClient): Promise<ErpRow[]> {
  const all: ErpRow[] = [];
  let lastId = 0;
  while (true) {
    const { data, error } = await client
      .from(TABLE)
      .select('id,material,material_description_en,material_description_ko,brand,brand_description,color,color_description,model,model_description_en,ean_barcode,upc_barcode,material_status,source_created_at,updated_at')
      .not('material', 'is', null)
      .filter('material', 'match', SPIGEN_SKU_PATTERN)
      .or('material_status.is.null,material_status.not.in.(Z3,Z5,Z6)')
      .order('id', { ascending: true })
      .gt('id', lastId)
      .limit(BATCH_SIZE * 2); // 2,000 per page for full scan efficiency

    if (error) throw new Error(`[erp-source] full-scan failed: ${error.message}`);

    const rows = (data ?? []) as RawSisRow[];
    if (rows.length === 0) break;

    for (const r of rows) {
      all.push(toErpRow(r));
      if (r.id > lastId) lastId = r.id;
    }
    if (rows.length < BATCH_SIZE * 2) break;
  }
  return all;
}

/**
 * Schema hash — used for drift detection in Stage 1 (Design §6.2 FR-19).
 * Returns deterministic string of (column_name, data_type) pairs.
 */
export async function fetchErpColumnHash(client: SupabaseClient): Promise<string> {
  const { data, error } = await client
    .rpc('pg_get_columns_signature', { p_schema: 'public', p_table: TABLE })
    .maybeSingle();
  if (error || !data) {
    // RPC not yet installed — return empty hash (drift detection is P1, non-blocking)
    return '';
  }
  return String((data as { signature?: string }).signature ?? '');
}

export const ERP_SOURCE_TABLE_KEY = `sq_datahub.${TABLE}` as const;
