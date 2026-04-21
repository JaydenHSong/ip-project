// Design Ref: products-sync.design.md §4.1 — POST /api/products/sync/all
// Plan SC: D4 (single cron sequential), FR-06 cron + FR-16 manual trigger
//
// Dual-trigger endpoint:
//   - Vercel Cron: Authorization: Bearer ${CRON_SECRET} (matches ads cron convention)
//   - Manual: requires withAuth(['admin','owner']) + body.trigger='manual'

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/middleware';
import { runPipeline } from '@/modules/products/features/sync/orchestrator/pipeline';
import { resolveProductsCtx } from '@/modules/products/api/context';

const BodySchema = z.object({
  trigger: z.enum(['cron', 'manual']).default('manual'),
  force_full: z.boolean().optional().default(false),
  stages: z.array(z.enum(['erp', 'channel_match'])).optional(),
});

const ADMIN_ROLES = ['admin', 'owner'] as const;

export const maxDuration = 60;

// Cron path — bypass withAuth when Vercel cron signature present.
async function runCron(req: NextRequest): Promise<NextResponse> {
  const raw = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse({ ...raw, trigger: 'cron' });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    // Cron execution runs as system user (legacy-import@sentinel.system per memory).
    const systemUserId = '00000000-0000-0000-0000-000000000001';
    const result = await runPipeline({
      trigger: 'cron',
      triggeredBy: systemUserId,
      userId: systemUserId,
      orgUnitId: '22784fd2-0f7b-4ded-848f-5e46c0cd54e1', // Spigen org_unit
      brandId: 'f964f081-3146-4b23-a384-eb95aff28e09',   // Spigen brand
      forceFull: parsed.data.force_full,
      stages: parsed.data.stages,
    });
    return NextResponse.json(result, {
      status: result.overallStatus === 'failed' ? 500 : 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return runCron(req);
  }

  // Manual invocation — delegate to withAuth wrapper
  return manualHandler(req);
}

const manualHandler = withAuth(async (req: NextRequest, { user }) => {
  const raw = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse({ ...raw, trigger: 'manual' });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const ctx = await resolveProductsCtx(user);
    const result = await runPipeline({
      trigger: 'manual',
      triggeredBy: user.id,
      userId: ctx.userId,
      orgUnitId: ctx.orgUnitId,
      brandId: 'f964f081-3146-4b23-a384-eb95aff28e09',
      forceFull: parsed.data.force_full,
      stages: parsed.data.stages,
    });
    return NextResponse.json(result, {
      status: result.overallStatus === 'failed' ? 500 : 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}, [...ADMIN_ROLES]);
