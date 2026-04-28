// Design Ref: products-sync.design.md §4.4 — POST /api/products/unmapped/[id]/undo
// Plan SC: SC-03 5-min undo window, R5 (운영자 오매핑 전파 방지)

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { undoResolveRow } from '@/modules/products/features/sync/adapters/ip-project/queue-writer';
import { ok, badRequest, handleError } from '@/modules/products/api/response';

const EDIT_ROLES = ['editor', 'admin', 'owner'] as const;

export const POST = withAuth(async (_req: NextRequest, { user, params }) => {
  try {
    const id = params.id;
    if (!id) return badRequest('invalid', { id: ['Unmapped id is required'] });
    const result = await undoResolveRow(id, user.id);
    return ok(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('expired')) {
      return badRequest('undo_window_expired', { id: ['5-minute undo window has passed'] });
    }
    return handleError(err);
  }
}, [...EDIT_ROLES]);
