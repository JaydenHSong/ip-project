// Design Ref: products-sync.design.md §6.1 (Pipeline Flow)
// Plan SC: D4 (single cron sequential), SC-05 (<1 실패/월), Slack on failure
//
// Orchestrates Stage 1 (ERP) → Stage 2 (Channel Match). On Stage 1 failure,
// Stage 2 is skipped. Slack notifications fire on any failure.

import { randomUUID } from 'node:crypto';
import { runErpStage, type Stage1Input } from './stage1-erp';
import { runChannelMatchStage, type Stage2Input } from './stage2-channel-match';
import { notifyFailure } from '../adapters/slack/notifier';
import type { PipelineResult, Stage1Result, Stage2Result, TriggerKind } from '../domain/types';

export type PipelineInput = {
  trigger: TriggerKind;
  triggeredBy: string | null;
  userId: string;
  orgUnitId: string;
  brandId: string;
  forceFull?: boolean;
  /**
   * Filter which stages to run. Default: both.
   * Useful for re-running Stage 2 alone after schema drift fix.
   */
  stages?: Array<'erp' | 'channel_match'>;
};

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const pipelineId = randomUUID();
  const startedAt = Date.now();
  const stages = input.stages ?? ['erp', 'channel_match'];
  const results: Array<Stage1Result | Stage2Result> = [];

  // ── Stage 1: ERP ────────────────────────────────────────────────────────
  let stage1: Stage1Result | null = null;
  if (stages.includes('erp')) {
    const s1Input: Stage1Input = {
      pipelineId,
      trigger: input.trigger,
      triggeredBy: input.triggeredBy,
      userId: input.userId,
      orgUnitId: input.orgUnitId,
      brandId: input.brandId,
      forceFull: input.forceFull,
    };
    stage1 = await runErpStage(s1Input);
    results.push(stage1);

    if (stage1.status === 'failed') {
      await notifyFailure({
        pipelineId,
        stage: 'erp',
        runId: stage1.runId,
        errorMessage: stage1.errorMessage ?? null,
        rowsAttempted: stage1.rowsFetched,
        durationMs: stage1.durationMs,
      });
      return {
        pipelineId,
        stages: results,
        totalDurationMs: Date.now() - startedAt,
        overallStatus: 'failed',
      };
    }
  }

  // ── Stage 2: Channel Match ──────────────────────────────────────────────
  let stage2: Stage2Result | null = null;
  if (stages.includes('channel_match')) {
    const s2Input: Stage2Input = {
      pipelineId,
      trigger: input.trigger,
      triggeredBy: input.triggeredBy,
      userId: input.userId,
      forceFull: input.forceFull,
    };
    stage2 = await runChannelMatchStage(s2Input);
    results.push(stage2);

    if (stage2.status === 'failed') {
      await notifyFailure({
        pipelineId,
        stage: 'channel_match',
        runId: stage2.runId,
        errorMessage: stage2.errorMessage ?? null,
        rowsAttempted: stage2.rowsFetched,
        durationMs: stage2.durationMs,
      });
    }
  }

  // ── Aggregate status ────────────────────────────────────────────────────
  const overallStatus = aggregateStatus(results);

  return {
    pipelineId,
    stages: results,
    totalDurationMs: Date.now() - startedAt,
    overallStatus,
  };
}

function aggregateStatus(
  results: Array<Stage1Result | Stage2Result>,
): PipelineResult['overallStatus'] {
  if (results.length === 0) return 'success';
  const anyFailed = results.some((r) => r.status === 'failed');
  if (anyFailed) {
    const allFailed = results.every((r) => r.status === 'failed');
    return allFailed ? 'failed' : 'partial';
  }
  return 'success';
}
