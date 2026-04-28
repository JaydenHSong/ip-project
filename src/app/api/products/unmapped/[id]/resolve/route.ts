// Design Ref: products-sync.design.md §4.3 — POST /api/products/unmapped/[id]/resolve
// Plan SC: SC-03 resolve 중앙값 ≤48h

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';
import { resolveUnmappedRow } from '@/modules/products/features/sync/adapters/ip-project/queue-writer';
import { ok, badRequest, handleError, zodError } from '@/modules/products/api/response';

const EDIT_ROLES = ['editor', 'admin', 'owner'] as const;

const BodySchema = z.object({
  action: z.enum(['mapped', 'created_new', 'ignored']),
  sku: z.string().trim().max(64).optional().nullable(),
});

export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  try {
    const id = params.id;
    if (!id) return badRequest('invalid', { id: ['Unmapped id is required'] });

    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);

    if (parsed.data.action !== 'ignored' && !parsed.data.sku) {
      return badRequest('invalid', { sku: ['sku required for mapped/created_new'] });
    }

    const result = await resolveUnmappedRow({
      id,
      action: parsed.data.action,
      sku: parsed.data.sku ?? null,
      resolvedBy: user.id,
    });

    return ok({
      resolvedId: result.resolvedId,
      action: result.action,
      sku: result.sku,
      undoExpiresAt: result.undoExpiresAt,
      channelMappingId: result.channelMappingId,
    });
  } catch (err) {
    return handleError(err);
  }
}, [...EDIT_ROLES]);
