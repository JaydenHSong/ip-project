// Design Ref: products-sync.design.md §6.2 (Stage 1 Flow)
// Plan SC: SC-02 Freshness ≤24h, SC-04 Manual overwrite 0건/월, SC-08 audit
//
// Stage 1: SAP ERP → products.products delta upsert.
// Honors metadata.source='manual' protection (FR-13).

import { createSqDataHubClient } from '../adapters/sq-datahub/client';
import { readErpDelta, ERP_SOURCE_TABLE_KEY } from '../adapters/sq-datahub/erp-source';
import { upsertErpProductsBatch, type UpsertContext } from '../adapters/ip-project/products-sink';
import {
  startRun,
  finishRun,
  readWatermark,
  updateWatermark,
} from '../adapters/ip-project/sync-runs-writer';
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

export async function runErpStage(input: Stage1Input): Promise<Stage1Result> {
  const startedAt = Date.now();

  const watermarkBefore = input.forceFull ? null : await readWatermark(ERP_SOURCE_TABLE_KEY);

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

  try {
    const sq = createSqDataHubClient();
    const ctx: UpsertContext = {
      userId: input.userId,
      orgUnitId: input.orgUnitId,
      brandId: input.brandId,
    };

    const iter = readErpDelta(sq, watermarkBefore);
    while (true) {
      const next = await iter.next();
      if (next.done) {
        if (typeof next.value === 'string' && next.value) watermarkAfter = next.value;
        break;
      }
      const batch = next.value;
      rowsFetched += batch.length;

      const result = await upsertErpProductsBatch(batch, ctx);
      rowsInserted += result.inserted;
      rowsUpdated += result.updated;
      rowsSkipped += result.skipped;

      for (const r of batch) {
        if (r.sourceUpdatedAt > (watermarkAfter ?? '')) watermarkAfter = r.sourceUpdatedAt;
      }
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

    if (watermarkAfter && watermarkAfter !== watermarkBefore) {
      await updateWatermark(ERP_SOURCE_TABLE_KEY, watermarkAfter, runId);
    }

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
