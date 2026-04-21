// Design Ref: products-sync.design.md §2 (Layer 1/2 queries) + §4.2 (list endpoint)
// Plan SC: SC-03 (Unmapped resolve UI), SC-01 (자동 매칭률 대시보드)

import { createAdminClient } from '@/lib/supabase/admin';
import type { UnmappedQueueRow, StageKind } from './domain/types';

type UnmappedRow = {
  id: string;
  source_table: string;
  source_row_id: number;
  channel: 'amazon' | 'shopify' | 'ebay' | 'ml';
  marketplace: string | null;
  external_id: string;
  source_sku: string | null;
  source_ean: string | null;
  product_name: string | null;
  brand: string | null;
  detected_at: string;
  detected_run_id: string | null;
  reason: string;
  reason_detail: Record<string, unknown>;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolved_sku: string | null;
  resolved_action: string | null;
  undo_expires_at: string | null;
};

export type ListUnmappedInput = {
  channel?: 'amazon' | 'shopify' | 'ebay' | 'ml';
  marketplace?: string;
  reason?: string;
  status?: 'pending' | 'resolved' | 'ignored';
  page?: number;
  limit?: number;
};

export type ListUnmappedResult = {
  data: UnmappedQueueRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  lastSyncedAt: string | null;
};

function rowToUnmapped(r: UnmappedRow): UnmappedQueueRow {
  return {
    id: r.id,
    sourceTable: r.source_table,
    sourceRowId: r.source_row_id,
    channel: r.channel,
    marketplace: r.marketplace,
    externalId: r.external_id,
    sourceSku: r.source_sku,
    sourceEan: r.source_ean,
    productName: r.product_name,
    brand: r.brand,
    detectedAt: r.detected_at,
    detectedRunId: r.detected_run_id,
    reason: r.reason as UnmappedQueueRow['reason'],
    reasonDetail: r.reason_detail as UnmappedQueueRow['reasonDetail'],
    status: r.status as UnmappedQueueRow['status'],
    resolvedBy: r.resolved_by,
    resolvedAt: r.resolved_at,
    resolvedSku: r.resolved_sku,
    resolvedAction: r.resolved_action as UnmappedQueueRow['resolvedAction'],
    undoExpiresAt: r.undo_expires_at,
  };
}

export async function listUnmapped(input: ListUnmappedInput = {}): Promise<ListUnmappedResult> {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(200, Math.max(1, input.limit ?? 50));
  const offset = (page - 1) * limit;
  const status = input.status ?? 'pending';

  const db = createAdminClient();
  let q = db.schema('products').from('unmapped_queue').select('*', { count: 'exact' });
  q = q.eq('status', status);
  if (input.channel) q = q.eq('channel', input.channel);
  if (input.marketplace) q = q.eq('marketplace', input.marketplace);
  if (input.reason) q = q.eq('reason', input.reason);
  q = q.order('detected_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(`[sync-queries] listUnmapped: ${error.message}`);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // latest_synced_at = max finished_at of stage channel_match
  const { data: latestRun } = await db
    .schema('products')
    .from('sync_runs')
    .select('finished_at')
    .eq('stage', 'channel_match')
    .eq('status', 'success')
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    data: ((data ?? []) as UnmappedRow[]).map(rowToUnmapped),
    pagination: { page, limit, total, totalPages },
    lastSyncedAt: (latestRun as { finished_at: string | null } | null)?.finished_at ?? null,
  };
}

export type StageSummary = {
  stage: StageKind;
  status: string | null;
  finishedAt: string | null;
  rowsInserted: number;
  rowsUpdated: number;
  rowsMapped: number;
  rowsUnmapped: number;
};

export async function readLatestStageSummaries(): Promise<Record<'erp' | 'channel_match', StageSummary | null>> {
  const db = createAdminClient();
  const stages: Array<'erp' | 'channel_match'> = ['erp', 'channel_match'];
  const out: Record<'erp' | 'channel_match', StageSummary | null> = { erp: null, channel_match: null };

  for (const stage of stages) {
    const { data } = await db
      .schema('products')
      .from('sync_runs')
      .select('status,finished_at,rows_inserted,rows_updated,rows_mapped,rows_unmapped')
      .eq('stage', stage)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const row = data as { status: string; finished_at: string | null; rows_inserted: number; rows_updated: number; rows_mapped: number; rows_unmapped: number };
      out[stage] = {
        stage,
        status: row.status,
        finishedAt: row.finished_at,
        rowsInserted: row.rows_inserted,
        rowsUpdated: row.rows_updated,
        rowsMapped: row.rows_mapped,
        rowsUnmapped: row.rows_unmapped,
      };
    }
  }
  return out;
}

export async function searchSkus(q: string, limit = 20): Promise<Array<{ sku: string; productName: string }>> {
  if (!q || q.trim().length === 0) return [];
  const db = createAdminClient();
  const { data, error } = await db
    .schema('products')
    .from('products')
    .select('sku,product_name')
    .ilike('sku', `${q.trim()}%`)
    .eq('version', 'V1')
    .limit(limit);
  if (error) throw new Error(`[sync-queries] searchSkus: ${error.message}`);
  return ((data ?? []) as Array<{ sku: string; product_name: string }>).map((r) => ({
    sku: r.sku,
    productName: r.product_name,
  }));
}
