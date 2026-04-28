// Design Ref: products-sync.design.md §7.1 — Sync status badges polling source
// Plan SC: FR-15 — ERP + Channel match 배지 실시간 반영 (I4 fix)

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { readLatestStageSummaries } from '@/modules/products/features/sync/queries';
import { ok, handleError } from '@/modules/products/api/response';

const ALL_ROLES = ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'] as const;

export const GET = withAuth(async (_req: NextRequest) => {
  try {
    const summaries = await readLatestStageSummaries();
    return ok({
      erp: summaries.erp,
      channel_match: summaries.channel_match,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    return handleError(err);
  }
}, [...ALL_ROLES]);
