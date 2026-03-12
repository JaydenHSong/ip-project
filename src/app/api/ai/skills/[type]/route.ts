// Skill CRUD API
// GET /api/ai/skills/[type] — 특정 Skill 조회
// PUT /api/ai/skills/[type] — Skill 수동 수정 (Admin)

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { skillManager } from '@/lib/ai/skills/manager'

type RouteContext = {
  params: Promise<{ type: string }>
}

export const GET = withAuth(async (_req: NextRequest, _ctx: unknown, routeCtx?: RouteContext) => {
  const params = routeCtx ? await routeCtx.params : null
  const skillType = params?.type

  if (!skillType) {
    return NextResponse.json(
      { error: { code: 'INVALID_TYPE', message: 'Missing skill type parameter' } },
      { status: 400 },
    )
  }

  const skill = await skillManager.get(skillType)

  if (!skill) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Skill not found for ${skillType}` } },
      { status: 404 },
    )
  }

  return NextResponse.json(skill)
}, ['owner', 'admin', 'editor'])

export const PUT = withAuth(async (req: NextRequest, _ctx: unknown, routeCtx?: RouteContext) => {
  const params = routeCtx ? await routeCtx.params : null
  const skillType = params?.type

  if (!skillType) {
    return NextResponse.json(
      { error: { code: 'INVALID_TYPE', message: 'Missing skill type parameter' } },
      { status: 400 },
    )
  }

  const body = await req.json() as { content: string }

  if (!body.content) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'content is required' } },
      { status: 400 },
    )
  }

  const updated = await skillManager.update(skillType, body.content, 'admin')

  return NextResponse.json({
    violationType: updated.violationType,
    version: updated.version,
    updatedAt: updated.lastUpdatedAt,
  })
}, ['owner', 'admin'])
