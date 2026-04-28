// Design Ref: products-sync.design.md §6.2 (Stage 1) + FR-11 (source='manual' protection)
// Plan SC: SC-04 (Manual overwrite 0건/월), SC-02 (Freshness ≤24h)
//
// Writes ErpRow batches to products.products in IP Project.
// CRITICAL: rows with metadata.source='manual' are NEVER overwritten (Plan FR-13).

import { createAdminClient } from '@/lib/supabase/admin';
import type { ErpRow } from '../../domain/types';
import { isActiveStatus } from '../../domain/normalize';

export type UpsertContext = {
  userId: string;
  orgUnitId: string;
  brandId: string;
};

export type UpsertResult = {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number; // rows where source='manual' protected
};

/**
 * Upsert batch of ErpRow into products.products.
 * - INSERT when sku not present
 * - UPDATE when sku present AND metadata.source != 'manual'
 * - SKIP when sku present AND metadata.source = 'manual'  (Plan FR-13)
 */
export async function upsertErpProductsBatch(
  rows: ErpRow[],
  ctx: UpsertContext,
): Promise<UpsertResult> {
  if (rows.length === 0) return { fetched: 0, inserted: 0, updated: 0, skipped: 0 };

  const db = createAdminClient();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  // 1. Look up existing rows by sku (version 'V1' default for ERP-sourced)
  const skus = rows.map((r) => r.material);
  const { data: existing, error: readErr } = await db
    .schema('products')
    .from('products')
    .select('id,sku,version,metadata')
    .in('sku', skus);
  if (readErr) throw new Error(`[products-sink] lookup failed: ${readErr.message}`);

  const existingMap = new Map<string, { id: string; version: string; metadata: Record<string, unknown> | null }>();
  for (const e of existing ?? []) {
    existingMap.set(`${e.sku}::${e.version ?? 'V1'}`, e as { id: string; version: string; metadata: Record<string, unknown> | null });
  }

  // 2. Categorize rows
  const toInsert: Array<Record<string, unknown>> = [];
  const toUpdate: Array<{ id: string; patch: Record<string, unknown> }> = [];

  for (const r of rows) {
    const key = `${r.material}::V1`;
    const existingRow = existingMap.get(key);
    const lifecycleStatus = isActiveStatus(r.materialStatus) ? 'active' : 'eol';

    const basePayload = {
      sku: r.material,
      version: 'V1',
      product_name: r.materialDescriptionEn ?? r.materialDescriptionKo ?? r.material,
      product_name_ko: r.materialDescriptionKo,
      model_name_ko: r.modelDescriptionEn, // placeholder mapping
      device_model: r.model,
      color: r.color,
      ean_barcode: r.eanBarcode,
      brand_id: ctx.brandId,
      org_unit_id: ctx.orgUnitId,
      lifecycle_status: lifecycleStatus,
    };

    if (!existingRow) {
      toInsert.push({
        ...basePayload,
        created_by: ctx.userId,
        updated_by: ctx.userId,
        metadata: { source: 'erp', synced_at: new Date().toISOString() },
      });
    } else {
      const src = (existingRow.metadata as { source?: string } | null)?.source;
      if (src === 'manual') {
        skipped += 1;
        continue;
      }
      toUpdate.push({
        id: existingRow.id,
        patch: {
          product_name: basePayload.product_name,
          product_name_ko: basePayload.product_name_ko,
          model_name_ko: basePayload.model_name_ko,
          device_model: basePayload.device_model,
          color: basePayload.color,
          ean_barcode: basePayload.ean_barcode,
          lifecycle_status: basePayload.lifecycle_status,
          updated_by: ctx.userId,
          metadata: { source: 'erp', synced_at: new Date().toISOString() },
        },
      });
    }
  }

  // 3. Batch insert
  if (toInsert.length > 0) {
    const { error: insErr } = await db.schema('products').from('products').insert(toInsert);
    if (insErr) throw new Error(`[products-sink] insert failed: ${insErr.message}`);
    inserted = toInsert.length;
  }

  // 4. Updates — one per row (Supabase doesn't support bulk UPDATE with different patches)
  for (const u of toUpdate) {
    const { error: updErr } = await db
      .schema('products')
      .from('products')
      .update(u.patch)
      .eq('id', u.id);
    if (updErr) throw new Error(`[products-sink] update ${u.id} failed: ${updErr.message}`);
    updated += 1;
  }

  return { fetched: rows.length, inserted, updated, skipped };
}
