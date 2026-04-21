// Design Ref: products-sync.design.md §6.3 (Stage 2 channel_mapping upsert)
// Plan SC: SC-01 (자동 매칭률), SC-08 (Provider contract — matched_via 추가)

import { createAdminClient } from '@/lib/supabase/admin';
import type { ChannelRow, MatchMethod } from '../../domain/types';

export type ChannelMappingUpsert = {
  channelRow: ChannelRow;
  productId: string;        // uuid from products.products.id
  matchedVia: MatchMethod;
};

export type UpsertResult = {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
};

/**
 * Upsert channel_mapping rows (one per ChannelRow that auto-matched).
 * Conflict key: (external_id, marketplace, channel).
 * Preserves is_primary if row already exists (operator-set flag).
 */
export async function upsertChannelMappingBatch(
  items: ChannelMappingUpsert[],
  userId: string,
): Promise<UpsertResult> {
  if (items.length === 0) return { fetched: 0, inserted: 0, updated: 0, skipped: 0 };

  const db = createAdminClient();
  const syncedAt = new Date().toISOString();

  // 1. Look up existing rows by (external_id, marketplace, channel)
  const extIds = items.map((i) => i.channelRow.externalId);
  const { data: existing, error: readErr } = await db
    .schema('products')
    .from('channel_mapping')
    .select('id,external_id,marketplace,channel,is_primary,product_id')
    .in('external_id', extIds);
  if (readErr) throw new Error(`[channel-mapping-sink] lookup: ${readErr.message}`);

  const key = (extId: string, mp: string, ch: string) => `${extId}|${mp}|${ch}`;
  const existingMap = new Map<string, { id: string; is_primary: boolean; product_id: string }>();
  for (const e of existing ?? []) {
    existingMap.set(key(e.external_id, e.marketplace, e.channel), {
      id: e.id,
      is_primary: e.is_primary,
      product_id: e.product_id,
    });
  }

  const toInsert: Array<Record<string, unknown>> = [];
  const toUpdate: Array<{ id: string; patch: Record<string, unknown> }> = [];

  for (const item of items) {
    const { channelRow, productId, matchedVia } = item;
    const k = key(channelRow.externalId, channelRow.marketplace, channelRow.channel);
    const existingRow = existingMap.get(k);

    if (!existingRow) {
      toInsert.push({
        product_id: productId,
        external_id: channelRow.externalId,
        marketplace: channelRow.marketplace,
        channel: channelRow.channel,
        is_primary: false,
        status: 'active',
        matched_via: matchedVia,
        last_synced_at: syncedAt,
        created_by: userId,
        updated_by: userId,
      });
    } else {
      // Update product_id if match shifted (e.g., legacy SKU reassigned), but preserve is_primary
      toUpdate.push({
        id: existingRow.id,
        patch: {
          product_id: productId,
          matched_via: matchedVia,
          last_synced_at: syncedAt,
          updated_by: userId,
        },
      });
    }
  }

  let inserted = 0;
  let updated = 0;

  if (toInsert.length > 0) {
    const { error: insErr } = await db
      .schema('products')
      .from('channel_mapping')
      .insert(toInsert);
    if (insErr) throw new Error(`[channel-mapping-sink] insert: ${insErr.message}`);
    inserted = toInsert.length;
  }

  for (const u of toUpdate) {
    const { error: updErr } = await db
      .schema('products')
      .from('channel_mapping')
      .update(u.patch)
      .eq('id', u.id);
    if (updErr) throw new Error(`[channel-mapping-sink] update ${u.id}: ${updErr.message}`);
    updated += 1;
  }

  return { fetched: items.length, inserted, updated, skipped: 0 };
}

/**
 * Find product_id by sku (version='V1' default). Used by Stage 2 to link channel row to product.
 * Returns null if sku not in products.products (will become unmapped_queue with reason='invalid_sku_format').
 */
export async function lookupProductIdBySku(sku: string): Promise<string | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .schema('products')
    .from('products')
    .select('id')
    .eq('sku', sku)
    .eq('version', 'V1')
    .maybeSingle();
  if (error) throw new Error(`[channel-mapping-sink] product lookup: ${error.message}`);
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Batch variant — single query for many SKUs. Returns Map<sku, productId>.
 * Missing SKUs are absent from the map (caller must handle as unmapped).
 */
export async function batchLookupProductIds(skus: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (skus.length === 0) return map;
  const db = createAdminClient();
  const { data, error } = await db
    .schema('products')
    .from('products')
    .select('id,sku')
    .in('sku', skus)
    .eq('version', 'V1');
  if (error) throw new Error(`[channel-mapping-sink] batch lookup: ${error.message}`);
  for (const r of (data ?? []) as Array<{ id: string; sku: string }>) {
    map.set(r.sku, r.id);
  }
  return map;
}
