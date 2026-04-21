// Design Ref: products-sync.design.md §6 (orchestrator hooks) + §3.1 (sync_runs schema)
// Plan SC: SC-08 (모든 run 감사), FR-01, FR-02, FR-13 (admin reset watermark)

import { createAdminClient } from '@/lib/supabase/admin';
import type { StageKind, StageStatus, TriggerKind } from '../../domain/types';

export type StartRunInput = {
  pipelineId: string;
  stage: StageKind;
  trigger: TriggerKind;
  triggeredBy: string | null;
  sourceTable?: string;
  watermarkBefore?: string | null;
};

export type FinishRunInput = {
  runId: string;
  status: StageStatus;
  rowsFetched?: number;
  rowsInserted?: number;
  rowsUpdated?: number;
  rowsSkipped?: number;
  rowsMapped?: number;
  rowsUnmapped?: number;
  rowsQueued?: number;
  watermarkAfter?: string | null;
  errorMessage?: string | null;
};

/**
 * Start a new sync_runs row. Returns run_id.
 */
export async function startRun(input: StartRunInput): Promise<string> {
  const db = createAdminClient();
  const { data, error } = await db
    .schema('products')
    .from('sync_runs')
    .insert({
      pipeline_id: input.pipelineId,
      stage: input.stage,
      trigger: input.trigger,
      triggered_by: input.triggeredBy,
      source_table: input.sourceTable,
      watermark_before: input.watermarkBefore,
      status: 'running',
    })
    .select('id')
    .single();
  if (error) throw new Error(`[sync-runs-writer] start: ${error.message}`);
  return (data as { id: string }).id;
}

/**
 * Finalize a run with final status + counts + optional watermark_after.
 */
export async function finishRun(input: FinishRunInput): Promise<void> {
  const db = createAdminClient();
  const { error } = await db
    .schema('products')
    .from('sync_runs')
    .update({
      finished_at: new Date().toISOString(),
      status: input.status,
      rows_fetched: input.rowsFetched ?? 0,
      rows_inserted: input.rowsInserted ?? 0,
      rows_updated: input.rowsUpdated ?? 0,
      rows_skipped: input.rowsSkipped ?? 0,
      rows_mapped: input.rowsMapped ?? 0,
      rows_unmapped: input.rowsUnmapped ?? 0,
      rows_queued: input.rowsQueued ?? 0,
      watermark_after: input.watermarkAfter,
      error_message: input.errorMessage,
    })
    .eq('id', input.runId);
  if (error) throw new Error(`[sync-runs-writer] finish: ${error.message}`);
}

/**
 * Read current watermark for a source_table. Returns null if never synced.
 */
export async function readWatermark(sourceTable: string): Promise<string | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .schema('products')
    .from('sync_watermarks')
    .select('last_updated_at')
    .eq('source_table', sourceTable)
    .maybeSingle();
  if (error) throw new Error(`[sync-runs-writer] readWatermark: ${error.message}`);
  return (data as { last_updated_at: string | null } | null)?.last_updated_at ?? null;
}

/**
 * Update watermark after a successful stage. Only call on status='success' or 'partial'.
 */
export async function updateWatermark(
  sourceTable: string,
  lastUpdatedAt: string,
  lastRunId: string,
): Promise<void> {
  const db = createAdminClient();
  const { error } = await db
    .schema('products')
    .from('sync_watermarks')
    .update({
      last_run_at: new Date().toISOString(),
      last_updated_at: lastUpdatedAt,
      last_run_id: lastRunId,
    })
    .eq('source_table', sourceTable);
  if (error) throw new Error(`[sync-runs-writer] updateWatermark: ${error.message}`);
}

/**
 * Admin-only: reset watermark to a specific timestamp (FR-13).
 * Used when a source table needs re-scanning (e.g., after schema drift fix).
 */
export async function resetWatermark(sourceTable: string, toTimestamp: string | null): Promise<{ previousWatermark: string | null; newWatermark: string | null }> {
  const db = createAdminClient();

  const { data: existing } = await db
    .schema('products')
    .from('sync_watermarks')
    .select('last_updated_at')
    .eq('source_table', sourceTable)
    .maybeSingle();
  const previousWatermark = (existing as { last_updated_at: string | null } | null)?.last_updated_at ?? null;

  const { error } = await db
    .schema('products')
    .from('sync_watermarks')
    .update({
      last_updated_at: toTimestamp,
      last_run_at: new Date().toISOString(),
    })
    .eq('source_table', sourceTable);
  if (error) throw new Error(`[sync-runs-writer] resetWatermark: ${error.message}`);

  return { previousWatermark, newWatermark: toTimestamp };
}

/**
 * Read most recent sync_runs for dashboard badges (latest success per stage).
 */
export async function readLatestRunByStage(stage: StageKind): Promise<{ id: string; status: StageStatus; finished_at: string | null; rows_inserted: number; rows_updated: number; rows_mapped: number; rows_unmapped: number } | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .schema('products')
    .from('sync_runs')
    .select('id,status,finished_at,rows_inserted,rows_updated,rows_mapped,rows_unmapped')
    .eq('stage', stage)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`[sync-runs-writer] readLatest: ${error.message}`);
  return data as { id: string; status: StageStatus; finished_at: string | null; rows_inserted: number; rows_updated: number; rows_mapped: number; rows_unmapped: number } | null;
}
