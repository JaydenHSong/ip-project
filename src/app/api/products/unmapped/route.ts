// Design Ref: products-sync.design.md §4.2 — GET /api/products/unmapped
// Plan SC: SC-03 Unmapped queue UI

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';
import { listUnmapped } from '@/modules/products/features/sync/queries';
import { ok, zodError, handleError } from '@/modules/products/api/response';

const ALL_ROLES = ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'] as const;

const QuerySchema = z.object({
  channel: z.enum(['amazon', 'shopify', 'ebay', 'ml']).optional(),
  marketplace: z.string().trim().max(16).optional(),
  reason: z.enum(['no_ean_no_prefix', 'prefix_ambiguous', 'invalid_sku_format', 'schema_drift', 'manual_flag']).optional(),
  status: z.enum(['pending', 'resolved', 'ignored']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const raw = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = QuerySchema.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);

    const result = await listUnmapped(parsed.data);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}, [...ALL_ROLES]);
