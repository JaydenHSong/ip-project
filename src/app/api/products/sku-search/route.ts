// Design Ref: products-sync.design.md §7.3 (Resolve modal sku autocomplete)
// Plan SC: SC-03 3-click resolve

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';
import { searchSkus } from '@/modules/products/features/sync/queries';
import { ok, badRequest, handleError, zodError } from '@/modules/products/api/response';

const EDIT_ROLES = ['editor', 'admin', 'owner'] as const;

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(64),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const raw = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = QuerySchema.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);
    if (parsed.data.q.length < 2) {
      return badRequest('query_too_short', { q: ['minimum 2 characters'] });
    }
    const results = await searchSkus(parsed.data.q, parsed.data.limit ?? 10);
    return ok({ data: results });
  } catch (err) {
    return handleError(err);
  }
}, [...EDIT_ROLES]);
