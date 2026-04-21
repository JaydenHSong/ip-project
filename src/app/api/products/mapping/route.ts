// Design Ref: §3.1 GET /api/products/mapping + POST bulk upsert
// Plan SC: SC-01 (CSV <60s), SC-07 (Provider v1), SC-08 (audit via trigger)

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { listMapping } from '@/modules/products/features/mapping/queries';
import { orchestrateBulkUpsert } from '@/modules/products/features/mapping/orchestrator';
import {
  listMappingQuerySchema,
  bulkUpsertBodySchema,
} from '@/modules/products/features/mapping/validators';
import { ok, created, handleError, zodError } from '@/modules/products/api/response';
import { resolveProductsCtx } from '@/modules/products/api/context';

const ALL_ROLES = ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'] as const;
const EDIT_ROLES = ['editor', 'admin', 'owner'] as const;

// GET /api/products/mapping
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const raw = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = listMappingQuerySchema.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);

    const result = await listMapping(parsed.data);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}, [...ALL_ROLES]);

// POST /api/products/mapping
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json().catch(() => null);
    const parsed = bulkUpsertBodySchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const ctx = await resolveProductsCtx(user);
    const result = await orchestrateBulkUpsert({
      rows: parsed.data.rows,
      onConflict: parsed.data.onConflict,
      userId: ctx.userId,
      orgUnitId: ctx.orgUnitId,
    });
    return created(result);
  } catch (err) {
    return handleError(err);
  }
}, [...EDIT_ROLES]);
