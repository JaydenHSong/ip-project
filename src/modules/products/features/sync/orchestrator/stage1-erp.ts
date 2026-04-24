// Design Ref: products-sync.design.md §6.2 (Stage 1 Flow)
// Plan SC: SC-02 Freshness ≤24h, SC-04 Manual overwrite 0건/월, SC-08 audit
//
// Stage 1: SAP ERP → products.products delta upsert.
// Honors metadata.source='manual' protection (FR-13).

import { createSqDataHubClient } from '../adapters/sq-datahub/client';
import {
  readErpDelta,
  ERP_SOURCE_TABLE_KEY,
  fetchErpColumnHash,
} from '../adapters/sq-datahub/erp-source';
import { upsertErpProductsBatch, type UpsertContext } from '../adapters/ip-project/products-sink';
import {
  startRun,
  finishRun,
  readWatermark,
  updateWatermark,
} from '../adapters/ip-project/sync-runs-writer';
import { notifySchemaDrift } from '../adapters/slack/notifier';
import type { Stage1Result, TriggerKind } from '../domain/types';

export type Stage1Input = {
  pipelineId: string;
  trigger: TriggerKind;
  triggeredBy: string | null;
  userId: string;
  orgUnitId: string;
  brandId: string;
  forceFull?: boolean;
};

// Soft deadline (ms) — stage aborts gracefully before Vercel kills the lambda.
// Route maxDuration=300s. Observation from 2026-04-24 run:
// Stage 1 with 220s soft deadline overshot to 273s actual (+53s) because each
// BATCH_SIZE=1000 batch costs ~30-40s and the deadline check was POST-batch,
// not PRE-batch. That left Stage 2 <30s which Vercel killed before finishRun().
// Fix: tighter budget 180s + pre-batch deadline check in the loop below.
// Worst-case overshoot ≤ 1 batch (~40s) → hard cap ~220s, leaves 80s for S2.
const STAGE1_SOFT_DEADLINE_MS = 180_000;
// Estimated ceiling per batch (fetch + upsert + watermark). If less than this
// remains before soft deadline, skip starting a new batch.
const STAGE1_BATCH_BUDGET_MS = 45_000;

export async function runErpStage(input: Stage1Input): Promise<Stage1Result> {
  const startedAt = Date.now();
  const deadlineAt = startedAt + STAGE1_SOFT_DEADLINE_MS;
  const tag = `[stage1 ${input.pipelineId.slice(0, 8)}]`;

  const watermarkBefore = input.forceFull ? null : await readWatermark(ERP_SOURCE_TABLE_KEY);
  console.log(`${tag} start watermarkBefore=${watermarkBefore ?? 'null'} forceFull=${Boolean(input.forceFull)}`);

  const runId = await startRun({
    pipelineId: input.pipelineId,
    stage: 'erp',
    trigger: input.trigger,
    triggeredBy: input.triggeredBy,
    sourceTable: ERP_SOURCE_TABLE_KEY,
    watermarkBefore,
  });

  let rowsFetched = 0;
  let rowsInserted = 0;
  let rowsUpdated = 0;
  let rowsSkipped = 0;
  let watermarkAfter: string | null = watermarkBefore;
  let softTimedOut = false;

  try {
    const sq = createSqDataHubClient();
    const ctx: UpsertContext = {
      userId: input.userId,
      orgUnitId: input.orgUnitId,
      brandId: input.brandId,
    };

    // Drift detection (FR-19): compare column signature before/after processing.
    // If empty (RPC not installed) both sides equal '' → no-op; when installed
    // and signatures differ, abort with schema_drift status.
    const schemaHashBefore = await fetchErpColumnHash(sq);
    console.log(`${tag} schemaHashBefore captured (${Date.now() - startedAt}ms)`);

    const iter = readErpDelta(sq, watermarkBefore);
    let batchN = 0;
    while (true) {
      // Pre-batch deadline check: don't start a new batch if we can't finish it.
      if (Date.now() + STAGE1_BATCH_BUDGET_MS > deadlineAt) {
        softTimedOut = true;
        console.warn(
          `${tag} pre-batch deadline guard — ${deadlineAt - Date.now()}ms remaining, need ~${STAGE1_BATCH_BUDGET_MS}ms for next batch — exiting`,
        );
        break;
      }

      const batchStart = Date.now();
      const next = await iter.next();
      if (next.done) {
        if (typeof next.value === 'string' && next.value) watermarkAfter = next.value;
        break;
      }
      const batch = next.value;
      batchN += 1;
      rowsFetched += batch.length;

      const result = await upsertErpProductsBatch(batch, ctx);
      rowsInserted += result.inserted;
      rowsUpdated += result.updated;
      rowsSkipped += result.skipped;

      for (const r of batch) {
        if (r.sourceUpdatedAt > (watermarkAfter ?? '')) watermarkAfter = r.sourceUpdatedAt;
      }

      // Persist watermark per-batch so partial progress survives timeouts.
      if (watermarkAfter && watermarkAfter !== watermarkBefore) {
        await updateWatermark(ERP_SOURCE_TABLE_KEY, watermarkAfter, runId);
      }

      console.log(
        `${tag} batch ${batchN} rows=${batch.length} (+${result.inserted}/~${result.updated}/skip=${result.skipped}) batchMs=${Date.now() - batchStart} elapsed=${Date.now() - startedAt}`,
      );

      if (Date.now() > deadlineAt) {
        softTimedOut = true;
        console.warn(`${tag} soft deadline hit after batch ${batchN} — exiting gracefully`);
        break;
      }
    }

    // Drift detection after processing — if schema changed mid-run, abort WITHOUT
    // advancing watermark so the next run can retry cleanly on fixed schema.
    // Skip drift check on soft timeout (we didn't scan the full window).
    const schemaHashAfter = softTimedOut ? schemaHashBefore : await fetchErpColumnHash(sq);
    if (schemaHashBefore && schemaHashAfter && schemaHashBefore !== schemaHashAfter) {
      const errorMessage = `Schema drift detected on ${ERP_SOURCE_TABLE_KEY}: column signature changed mid-run.`;
      await finishRun({
        runId,
        status: 'schema_drift',
        rowsFetched,
        rowsInserted,
        rowsUpdated,
        rowsSkipped,
        errorMessage,
      });
      await notifySchemaDrift({
        pipelineId: input.pipelineId,
        stage: 'erp',
        runId,
        sourceTable: ERP_SOURCE_TABLE_KEY,
        detectedAt: new Date().toISOString(),
      });
      return {
        runId,
        status: 'schema_drift',
        rowsFetched,
        rowsInserted,
        rowsUpdated,
        rowsSkipped,
        watermarkBefore,
        watermarkAfter: watermarkBefore, // do NOT advance
        durationMs: Date.now() - startedAt,
        errorMessage,
      };
    }

    await finishRun({
      runId,
      status: 'success',
      rowsFetched,
      rowsInserted,
      rowsUpdated,
      rowsSkipped,
      watermarkAfter,
    });

    console.log(
      `${tag} done status=success rowsFetched=${rowsFetched} +${rowsInserted}/~${rowsUpdated}/skip=${rowsSkipped} totalMs=${Date.now() - startedAt}${softTimedOut ? ' (partial, soft deadline)' : ''}`,
    );

    return {
      runId,
      status: 'success',
      rowsFetched,
      rowsInserted,
      rowsUpdated,
      rowsSkipped,
      watermarkBefore,
      watermarkAfter,
      durationMs: Date.now() - startedAt,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`${tag} failed after ${Date.now() - startedAt}ms: ${errorMessage}`);
    await finishRun({
      runId,
      status: 'failed',
      rowsFetched,
      rowsInserted,
      rowsUpdated,
      rowsSkipped,
      errorMessage,
    });
    return {
      runId,
      status: 'failed',
      rowsFetched,
      rowsInserted,
      rowsUpdated,
      rowsSkipped,
      watermarkBefore,
      watermarkAfter,
      durationMs: Date.now() - startedAt,
      errorMessage,
    };
  }
}
