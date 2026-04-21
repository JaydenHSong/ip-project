// Design Ref: §3.1 POST /api/products/mapping/dry-run
// Plan SC: SC-01 (CSV <60s) — dry-run validates + detects conflicts without writes

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { dryRunCsv } from '@/modules/products/features/mapping/csv-parser';
import { dryRunBodySchema } from '@/modules/products/features/mapping/validators';
import { ok, handleError, zodError } from '@/modules/products/api/response';

const EDIT_ROLES = ['editor', 'admin', 'owner'] as const;

// POST /api/products/mapping/dry-run
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => null);
    const parsed = dryRunBodySchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const result = await dryRunCsv({ csvText: parsed.data.csvText });
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}, [...EDIT_ROLES]);
