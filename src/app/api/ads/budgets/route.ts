// GET /api/ads/budgets — Team annual budget (unified channel `total`)
// PUT /api/ads/budgets — Save team budget entries

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { parseBody } from '@/lib/api/validate-body'
import { getBudgets, saveBudgets } from '@/modules/ads/features/budget-planning/queries'
import { buildTeamBudgetRollups } from '@/modules/ads/features/budget-planning/budget-team-rollups'
import { saveBudgetSchema } from '@/modules/ads/features/budget-planning/schemas'
import type { Role } from '@/types/users'
import { resolveBudgetOrgUnitId, teamOptionsFromSortedIds } from '@/modules/ads/features/budget-planning/resolve-budget-org'

export const GET = withAuth(async (req, { user }) => {
  const url = new URL(req.url)
  const brandMarketId = url.searchParams.get('brand_market_id')
  const year = url.searchParams.get('year')
  const requestedOrg = url.searchParams.get('org_unit_id')
  const rollupTeams = url.searchParams.get('rollup') === 'teams'

  if (!brandMarketId || !year) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'brand_market_id and year are required' } },
      { status: 400 },
    )
  }

  const resolved = await resolveBudgetOrgUnitId(
    user.id,
    user.role as Role,
    brandMarketId,
    requestedOrg,
  )

  if (!resolved.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: resolved.message } }, { status: 403 })
  }

  try {
    const data = await getBudgets({
      brand_market_id: brandMarketId,
      year: Number(year),
      org_unit_id: resolved.orgUnitId,
    })

    const teamOptions =
      resolved.assignableOrgIds.length > 1
        ? await teamOptionsFromSortedIds(resolved.assignableOrgIds)
        : undefined

    let team_rollups: Awaited<ReturnType<typeof buildTeamBudgetRollups>> | undefined
    if (rollupTeams && resolved.assignableOrgIds.length > 1 && teamOptions && teamOptions.length > 1) {
      team_rollups = await buildTeamBudgetRollups(
        brandMarketId,
        Number(year),
        resolved.assignableOrgIds,
        teamOptions,
      )
    }

    return NextResponse.json({
      data: {
        ...data,
        org_unit_id: resolved.orgUnitId,
        ...(teamOptions && teamOptions.length > 0 ? { team_options: teamOptions } : {}),
        ...(team_rollups && team_rollups.length > 0 ? { team_rollups } : {}),
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'])

export const PUT = withAuth(async (req, { user }) => {
  // Plan SC-3: Zod validation — covers required fields + entries.length >= 1.
  const parsed = await parseBody(req, saveBudgetSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  const resolved = await resolveBudgetOrgUnitId(
    user.id,
    user.role as Role,
    body.brand_market_id,
    body.org_unit_id ?? null,
  )

  if (!resolved.ok) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: resolved.message } }, { status: 403 })
  }

  try {
    const result = await saveBudgets(body.brand_market_id, body.year, resolved.orgUnitId, body.entries, user.id)
    return NextResponse.json({ data: result })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['admin', 'owner', 'editor', 'viewer_plus'])
