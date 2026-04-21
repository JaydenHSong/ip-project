// Design Ref: §3.1 GET /api/products/by-asin/[asin]
// Plan SC: SC-07 Provider Contract v1 — SHAPE LOCKED, 다른 모듈이 의존
// ⚠️ NEVER change response field names. Additions OK → v2 endpoint for removals.

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getByAsin } from '@/modules/products/features/mapping/queries';
import { byAsinQuerySchema } from '@/modules/products/features/mapping/validators';
import { ASIN_REGEX } from '@/modules/products/shared/constants';
import { ok, notFound, badRequest, handleError, zodError } from '@/modules/products/api/response';

const ALL_ROLES = ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'] as const;

// GET /api/products/by-asin/[asin]?marketplace=US  (Provider v1 LOCKED)
export const GET = withAuth(async (req: NextRequest, { params }) => {
  try {
    const asin = params.asin;
    if (!ASIN_REGEX.test(asin)) {
      return badRequest('invalid', {
        asin: ['ASIN은 B로 시작하는 10자리 영숫자여야 합니다'],
      });
    }

    const raw = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = byAsinQuerySchema.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);

    const result = await getByAsin(asin, parsed.data.marketplace);
    if (!result) {
      return notFound('ASIN not mapped', {
        asin,
        marketplace: parsed.data.marketplace,
      });
    }
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}, [...ALL_ROLES]);
