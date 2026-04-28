// Design Ref: §3.1 GET /api/products/audit + §6.1 admin-only RBAC
// Plan SC: SC-08 (Audit log readable via API even before Phase 2 UI)

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { createAdminClient } from '@/lib/supabase/admin';
import { auditQuerySchema } from '@/modules/products/features/mapping/validators';
import { rowToAudit, type AuditDbRow } from '@/modules/products/shared/row-mappers';
import { ok, handleError, zodError } from '@/modules/products/api/response';

const ADMIN_ROLES = ['admin', 'owner'] as const;

// GET /api/products/audit?mappingId=&userId=&action=&limit=
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const raw = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = auditQuerySchema.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);

    const { mappingId, userId, action, limit } = parsed.data;
    const db = createAdminClient();

    let query = db
      .schema('products')
      .from('asin_mapping_audit')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (mappingId) query = query.eq('mapping_id', mappingId);
    if (userId) query = query.eq('user_id', userId);
    if (action) query = query.eq('action', action);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as AuditDbRow[];
    return ok({
      data: rows.map(rowToAudit),
      meta: { limit, returned: rows.length },
    });
  } catch (err) {
    return handleError(err);
  }
}, [...ADMIN_ROLES]);
