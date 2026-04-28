// Design Ref: products-sync.design.md §6.3 (Stage 2 → Unmapped Queue) + §4.3 (resolve/undo API)
// Plan SC: SC-03 (Unmapped resolve ≤48h), SC-05 (5-enum reasons)

import { createAdminClient } from '@/lib/supabase/admin';
import type { ChannelRow, UnmappedReason } from '../../domain/types';

export type UnmappedInsert = {
  channelRow: ChannelRow;
  reason: UnmappedReason;
  reasonDetail: { candidates?: string[]; note?: string };
  detectedRunId: string;
};

export type QueueWriteResult = {
  inserted: number;
  alreadyPending: number; // UNIQUE conflict (row already in queue)
};

/**
 * Insert unmapped rows. UNIQUE(source_table, source_row_id, channel, marketplace)
 * prevents re-queueing the same listing if it's already pending.
 */
export async function insertUnmappedBatch(items: UnmappedInsert[]): Promise<QueueWriteResult> {
  if (items.length === 0) return { inserted: 0, alreadyPending: 0 };

  const db = createAdminClient();
  const payload = items.map((it) => ({
    source_table: it.channelRow.sourceTable,
    source_row_id: it.channelRow.sourceRowId,
    channel: it.channelRow.channel,
    marketplace: it.channelRow.marketplace,
    external_id: it.channelRow.externalId,
    source_sku: it.channelRow.sellerSku,
    source_ean: it.channelRow.ean,
    product_name: it.channelRow.productName,
    brand: it.channelRow.brand,
    reason: it.reason,
    reason_detail: it.reasonDetail,
    detected_run_id: it.detectedRunId,
    // status defaults to 'pending'
  }));

  // Use upsert ignoreDuplicates to skip already-queued rows silently.
  const { data, error } = await db
    .schema('products')
    .from('unmapped_queue')
    .upsert(payload, { onConflict: 'source_table,source_row_id,channel,marketplace', ignoreDuplicates: true })
    .select('id');

  if (error) throw new Error(`[queue-writer] insert batch: ${error.message}`);

  const insertedRows = (data as Array<{ id: string }> | null)?.length ?? 0;
  return { inserted: insertedRows, alreadyPending: items.length - insertedRows };
}

// ─── Resolve / Undo (used by Layer 1 API routes, but logic lives here) ─────

export type ResolvePayload = {
  id: string;
  action: 'mapped' | 'created_new' | 'ignored';
  sku: string | null;      // required for 'mapped' and 'created_new'
  resolvedBy: string;
  undoWindowSeconds?: number; // default 300 (5min)
};

export type ResolveResult = {
  resolvedId: string;
  action: ResolvePayload['action'];
  sku: string | null;
  undoExpiresAt: string | null;
  channelMappingId: string | null; // when action='mapped' or 'created_new'
};

/**
 * Resolve a pending unmapped row. Called by POST /api/products/unmapped/[id]/resolve.
 * Creates channel_mapping row when action='mapped'/'created_new', then marks queue row resolved.
 */
export async function resolveUnmappedRow(payload: ResolvePayload): Promise<ResolveResult> {
  const db = createAdminClient();
  const undoWindow = payload.undoWindowSeconds ?? 300;
  const undoExpiresAt = payload.action === 'ignored'
    ? null
    : new Date(Date.now() + undoWindow * 1000).toISOString();

  // 1. Load queue row
  const { data: row, error: readErr } = await db
    .schema('products')
    .from('unmapped_queue')
    .select('id,status,source_table,source_row_id,channel,marketplace,external_id,source_sku')
    .eq('id', payload.id)
    .maybeSingle();
  if (readErr) throw new Error(`[queue-writer] resolve read: ${readErr.message}`);
  if (!row) throw new Error(`[queue-writer] unmapped_queue row not found: ${payload.id}`);
  if (row.status !== 'pending') {
    throw new Error(`[queue-writer] row already ${row.status}`);
  }

  // 2. (Optional) create channel_mapping row
  let channelMappingId: string | null = null;
  if (payload.action !== 'ignored') {
    if (!payload.sku) throw new Error('[queue-writer] sku required for mapped/created_new');

    const { data: product, error: prodErr } = await db
      .schema('products')
      .from('products')
      .select('id')
      .eq('sku', payload.sku)
      .eq('version', 'V1')
      .maybeSingle();
    if (prodErr) throw new Error(`[queue-writer] product lookup: ${prodErr.message}`);
    if (!product) throw new Error(`[queue-writer] product not found: ${payload.sku}`);

    const { data: cm, error: insErr } = await db
      .schema('products')
      .from('channel_mapping')
      .upsert({
        product_id: (product as { id: string }).id,
        external_id: row.external_id,
        marketplace: row.marketplace,
        channel: row.channel,
        is_primary: false,
        status: 'active',
        matched_via: 'manual',
        last_synced_at: new Date().toISOString(),
        created_by: payload.resolvedBy,
        updated_by: payload.resolvedBy,
      }, { onConflict: 'external_id,marketplace,channel' })
      .select('id')
      .maybeSingle();
    if (insErr) throw new Error(`[queue-writer] channel_mapping upsert: ${insErr.message}`);
    channelMappingId = (cm as { id: string } | null)?.id ?? null;
  }

  // 3. Mark queue row resolved
  const { error: updErr } = await db
    .schema('products')
    .from('unmapped_queue')
    .update({
      status: 'resolved',
      resolved_by: payload.resolvedBy,
      resolved_at: new Date().toISOString(),
      resolved_sku: payload.action === 'ignored' ? null : payload.sku,
      resolved_action: payload.action,
      undo_expires_at: undoExpiresAt,
    })
    .eq('id', payload.id);
  if (updErr) throw new Error(`[queue-writer] update queue: ${updErr.message}`);

  return {
    resolvedId: payload.id,
    action: payload.action,
    sku: payload.action === 'ignored' ? null : payload.sku,
    undoExpiresAt,
    channelMappingId,
  };
}

/**
 * Undo a recent resolve. Requires undo_expires_at in future.
 */
export async function undoResolveRow(id: string, userId: string): Promise<{ undone: boolean; channelMappingIdDeleted: string | null }> {
  const db = createAdminClient();

  const { data: row, error } = await db
    .schema('products')
    .from('unmapped_queue')
    .select('id,status,resolved_sku,resolved_action,external_id,marketplace,channel,undo_expires_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`[queue-writer] undo read: ${error.message}`);
  if (!row) throw new Error(`[queue-writer] row not found: ${id}`);
  if (row.status !== 'resolved') throw new Error(`[queue-writer] row status ${row.status} — cannot undo`);
  if (!row.undo_expires_at || new Date(row.undo_expires_at) < new Date()) {
    throw new Error('[queue-writer] undo window expired');
  }

  // Delete channel_mapping row created on resolve (if any)
  let channelMappingIdDeleted: string | null = null;
  if (row.resolved_action !== 'ignored') {
    const { data: cm } = await db
      .schema('products')
      .from('channel_mapping')
      .select('id')
      .eq('external_id', row.external_id)
      .eq('marketplace', row.marketplace)
      .eq('channel', row.channel)
      .eq('matched_via', 'manual')
      .maybeSingle();
    if (cm) {
      await db.schema('products').from('channel_mapping').delete().eq('id', (cm as { id: string }).id);
      channelMappingIdDeleted = (cm as { id: string }).id;
    }
  }

  // Revert queue row to pending
  const { error: updErr } = await db
    .schema('products')
    .from('unmapped_queue')
    .update({
      status: 'pending',
      resolved_by: null,
      resolved_at: null,
      resolved_sku: null,
      resolved_action: 'reverted',
      undo_expires_at: null,
    })
    .eq('id', id);
  if (updErr) throw new Error(`[queue-writer] revert: ${updErr.message}`);

  return { undone: true, channelMappingIdDeleted };
}
