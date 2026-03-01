// Skill CRUD API
// GET /api/ai/skills/[type] — 특정 Skill 조회
// PUT /api/ai/skills/[type] — Skill 수동 수정 (Admin)

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { skillManager } from '@/lib/ai/skills/manager'
import { VIOLATION_TYPES, type ViolationCode } from '@/constants/violations'

type RouteContext = {
  params: Promise<{ type: string }>
}

export const GET = withAuth(async (_req: NextRequest, _ctx: unknown, routeCtx?: RouteContext) => {
  const params = routeCtx ? await routeCtx.params : null
  const violationType = params?.type as ViolationCode

  if (!violationType || !VIOLATION_TYPES[violationType]) {
    return NextResponse.json(
      { error: { code: 'INVALID_TYPE', message: `Invalid violation type: ${violationType}` } },
      { status: 400 },
    )
  }

  const skill = await skillManager.get(violationType)

  if (!skill) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Skill not found for ${violationType}` } },
      { status: 404 },
    )
  }

  return NextResponse.json(skill)
}, ['editor', 'admin'])

export const PUT = withAuth(async (req: NextRequest, _ctx: unknown, routeCtx?: RouteContext) => {
  const params = routeCtx ? await routeCtx.params : null
  const violationType = params?.type as ViolationCode

  if (!violationType || !VIOLATION_TYPES[violationType]) {
    return NextResponse.json(
      { error: { code: 'INVALID_TYPE', message: `Invalid violation type: ${violationType}` } },
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

  const updated = await skillManager.update(violationType, body.content, 'admin')

  return NextResponse.json({
    violationType: updated.violationType,
    version: updated.version,
    updatedAt: updated.lastUpdatedAt,
  })
}, ['admin'])
