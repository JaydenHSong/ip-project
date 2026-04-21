// Design Ref: products-sync.design.md §6.3 (Stage 2 Flow)
// Plan SC: SC-01 ≥80% 매칭 (실측 97-100%), SC-08 audit
//
// Stage 2: Amazon listings (US/CA Phase 1) → channel_mapping auto-upsert +
// unmapped_queue for failures. Uses in-memory ERP index (~10MB / 20k rows).

import { createSqDataHubClient } from '../adapters/sq-datahub/client';
import {
  readErpActiveAll,
} from '../adapters/sq-datahub/erp-source';
import {
  readAmazonDelta,
  AMAZON_SOURCE_TABLE_KEY,
} from '../adapters/sq-datahub/channel-source';
import {
  upsertChannelMappingBatch,
  batchLookupProductIds,
  type ChannelMappingUpsert,
} from '../adapters/ip-project/channel-mapping-sink';
import {
  insertUnmappedBatch,
  type UnmappedInsert,
} from '../adapters/ip-project/queue-writer';
import {
  startRun,
  finishRun,
  readWatermark,
  updateWatermark,
} from '../adapters/ip-project/sync-runs-writer';
import { buildErpIndex, matchChannelRow } from '../domain/matcher';
import type { ChannelRow, Stage2Result, TriggerKind } from '../domain/types';

export type Stage2Input = {
  pipelineId: string;
  trigger: TriggerKind;
  triggeredBy: string | null;
  userId: string;
  forceFull?: boolean;
};

export async function runChannelMatchStage(input: Stage2Input): Promise<Stage2Result> {
  const startedAt = Date.now();
  const watermarkBefore = input.forceFull ? null : await readWatermark(AMAZON_SOURCE_TABLE_KEY);

  const runId = await startRun({
    pipelineId: input.pipelineId,
    stage: 'channel_match',
    trigger: input.trigger,
    triggeredBy: input.triggeredBy,
    sourceTable: AMAZON_SOURCE_TABLE_KEY,
    watermarkBefore,
  });

  let rowsFetched = 0;
  let rowsMapped = 0;
  let rowsUnmapped = 0;
  let rowsQueued = 0;
  let watermarkAfter: string | null = watermarkBefore;

  try {
    const sq = createSqDataHubClient();

    // Build ERP index once (in-memory map ~10MB)
    const erpRows = await readErpActiveAll(sq);
    const erpIndex = buildErpIndex(erpRows);

    const iter = readAmazonDelta(sq, watermarkBefore);
    while (true) {
      const next = await iter.next();
      if (next.done) {
        if (typeof next.value === 'string' && next.value) watermarkAfter = next.value;
        break;
      }
      const batch = next.value;
      rowsFetched += batch.length;

      await processBatch(batch, erpIndex, runId, input.userId, (m, u, q) => {
        rowsMapped += m;
        rowsUnmapped += u;
        rowsQueued += q;
      });

      for (const r of batch) {
        if (r.updatedAt > (watermarkAfter ?? '')) watermarkAfter = r.updatedAt;
      }
    }

    await finishRun({
      runId,
      status: 'success',
      rowsFetched,
      rowsMapped,
      rowsUnmapped,
      rowsQueued,
      watermarkAfter,
    });

    if (watermarkAfter && watermarkAfter !== watermarkBefore) {
      await updateWatermark(AMAZON_SOURCE_TABLE_KEY, watermarkAfter, runId);
    }

    return {
      runId,
      status: 'success',
      rowsFetched,
      rowsMapped,
      rowsUnmapped,
      rowsQueued,
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
      rowsMapped,
      rowsUnmapped,
      rowsQueued,
      errorMessage,
    });
    return {
      runId,
      status: 'failed',
      rowsFetched,
      rowsMapped,
      rowsUnmapped,
      rowsQueued,
      watermarkBefore,
      watermarkAfter,
      durationMs: Date.now() - startedAt,
      errorMessage,
    };
  }
}

async function processBatch(
  batch: ChannelRow[],
  erpIndex: ReturnType<typeof buildErpIndex>,
  runId: string,
  userId: string,
  onCounts: (mapped: number, unmapped: number, queued: number) => void,
): Promise<void> {
  const matched: Array<{ row: ChannelRow; sku: string; via: 'ean' | 'prefix8' }> = [];
  const unmapped: UnmappedInsert[] = [];

  for (const row of batch) {
    const result = matchChannelRow(row, erpIndex);
    if (result.kind === 'matched') {
      matched.push({ row, sku: result.sku, via: result.via });
    } else {
      unmapped.push({
        channelRow: row,
        reason: result.reason,
        reasonDetail: { candidates: result.kind === 'unmapped' ? result.candidates ?? [] : [] },
        detectedRunId: runId,
      });
    }
  }

  // Batch lookup product_id for matched SKUs in one query
  let mappedCount = 0;
  if (matched.length > 0) {
    const uniqueSkus = [...new Set(matched.map((m) => m.sku))];
    const productIdMap = await batchLookupProductIds(uniqueSkus);

    const upserts: ChannelMappingUpsert[] = [];
    for (const m of matched) {
      const productId = productIdMap.get(m.sku);
      if (!productId) {
        // Product not yet in products.products (Stage 1 lag) → queue it for retry
        unmapped.push({
          channelRow: m.row,
          reason: 'invalid_sku_format',
          reasonDetail: { note: `Matched SKU ${m.sku} not found in products.products (Stage 1 may not have synced yet)` },
          detectedRunId: runId,
        });
        continue;
      }
      upserts.push({ channelRow: m.row, productId, matchedVia: m.via });
    }

    if (upserts.length > 0) {
      const upsertResult = await upsertChannelMappingBatch(upserts, userId);
      mappedCount = upsertResult.inserted + upsertResult.updated;
    }
  }

  let queuedCount = 0;
  if (unmapped.length > 0) {
    const queueResult = await insertUnmappedBatch(unmapped);
    queuedCount = queueResult.inserted;
  }

  onCounts(mappedCount, unmapped.length, queuedCount);
}
