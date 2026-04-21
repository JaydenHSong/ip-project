// Design Ref: products-sync.design.md §4.5 — POST /api/products/sync/reset-watermark
// Plan SC: FR-18 Admin RPC, 수동 재처리용 (schema drift 복구 후 등)

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';
import { resetWatermark } from '@/modules/products/features/sync/adapters/ip-project/sync-runs-writer';
import { ok, handleError, zodError } from '@/modules/products/api/response';

const ADMIN_ROLES = ['admin', 'owner'] as const;

const BodySchema = z.object({
  source_table: z.enum([
    'sq_datahub.spg_operation_sis_z1ppr0010_1000',
    'sq_datahub.spg_amazon_all_listings',
  ]),
  to: z.string().datetime().nullable(),
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);

    const result = await resetWatermark(parsed.data.source_table, parsed.data.to);
    return ok({
      source_table: parsed.data.source_table,
      previous_watermark: result.previousWatermark,
      new_watermark: result.newWatermark,
    });
  } catch (err) {
    return handleError(err);
  }
}, [...ADMIN_ROLES]);
