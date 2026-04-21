// Design Ref: §3.1 PATCH + DELETE /api/products/mapping/[id]
// Plan SC: SC-08 (audit via DB trigger — no app-level audit code)

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import {
  patchMapping,
  softDeleteMapping,
  getMappingById,
} from '@/modules/products/features/mapping/queries';
import { patchMappingBodySchema } from '@/modules/products/features/mapping/validators';
import {
  ok,
  noContent,
  notFound,
  handleError,
  zodError,
} from '@/modules/products/api/response';
import { resolveProductsCtx } from '@/modules/products/api/context';

const EDIT_ROLES = ['editor', 'admin', 'owner'] as const;

// PATCH /api/products/mapping/[id]
export const PATCH = withAuth(async (req: NextRequest, { user, params }) => {
  try {
    const id = params.id;
    const existing = await getMappingById(id);
    if (!existing) return notFound('Mapping not found', { id });

    const body = await req.json().catch(() => null);
    const parsed = patchMappingBodySchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const ctx = await resolveProductsCtx(user);
    const updated = await patchMapping(id, parsed.data, ctx.userId);
    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}, [...EDIT_ROLES]);

// DELETE /api/products/mapping/[id]  — soft delete (status='archived')
export const DELETE = withAuth(async (_req: NextRequest, { user, params }) => {
  try {
    const id = params.id;
    const existing = await getMappingById(id);
    if (!existing) return notFound('Mapping not found', { id });

    const ctx = await resolveProductsCtx(user);
    await softDeleteMapping(id, ctx.userId);
    return noContent();
  } catch (err) {
    return handleError(err);
  }
}, [...EDIT_ROLES]);
