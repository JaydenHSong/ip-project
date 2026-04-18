// Resolve which org_unit_id (team) budget rows apply to for GET/PUT /api/ads/budgets
// Non–platform-admin users are scoped to org subtree: team leads see one team; directors
// (user linked to a parent org_unit) see all descendant teams that are in this market’s budget scope.

import type { Role } from '@/types/users'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAdsAdminClient } from '@/lib/supabase/admin'

type ResolveResult =
  | { ok: true; orgUnitId: string; assignableOrgIds: string[] }
  | { ok: false; message: string }

/** Orgs that may own budget rows for this market: permissions + orgs that already have campaigns. */
const getBudgetEligibleOrgIds = async (brandMarketId: string): Promise<Set<string>> => {
  const publicDb = createAdminClient()
  const adsDb = createAdsAdminClient()
  const ids = new Set<string>()

  const { data: perms } = await publicDb
    .from('brand_market_permissions')
    .select('org_unit_id')
    .eq('brand_market_id', brandMarketId)

  for (const p of perms ?? []) {
    if (p.org_unit_id) ids.add(p.org_unit_id as string)
  }

  const { data: campOrgs } = await adsDb
    .from('campaigns')
    .select('org_unit_id')
    .eq('brand_market_id', brandMarketId)

  for (const c of campOrgs ?? []) {
    if (c.org_unit_id) ids.add(c.org_unit_id as string)
  }

  return ids
}

/** Ensure the caller's org can always manage its own budget for this market (no campaigns/permissions yet). */
const ensureUserOrgEligible = (eligible: Set<string>, userOrg: string) => {
  eligible.add(userOrg)
}

/** All org_unit ids under `rootId` (including itself), using active rows only. */
const getSubtreeOrgIds = async (rootId: string): Promise<Set<string>> => {
  const publicDb = createAdminClient()
  const { data: rows } = await publicDb.from('org_units').select('id, parent_id').eq('is_active', true)

  const children = new Map<string, string[]>()
  for (const r of rows ?? []) {
    const pid = r.parent_id as string | null
    if (!pid) continue
    if (!children.has(pid)) children.set(pid, [])
    children.get(pid)!.push(r.id as string)
  }

  const out = new Set<string>()
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    if (out.has(id)) continue
    out.add(id)
    for (const c of children.get(id) ?? []) stack.push(c)
  }
  return out
}

const sortOrgIdsByName = async (ids: string[]): Promise<string[]> => {
  if (ids.length <= 1) return ids
  const publicDb = createAdminClient()
  const { data: rows } = await publicDb.from('org_units').select('id, name').in('id', ids)
  const map = new Map((rows ?? []).map((r) => [r.id as string, (r.name as string) ?? '']))
  return [...ids].sort((a, b) => (map.get(a) ?? '').localeCompare(map.get(b) ?? ''))
}

type TeamOption = { id: string; name: string }

/** Build labels in the same order as `sortedIds` (e.g. name-sorted id list). */
const teamOptionsFromSortedIds = async (sortedIds: string[]): Promise<TeamOption[]> => {
  if (sortedIds.length === 0) return []
  const publicDb = createAdminClient()
  const { data: rows } = await publicDb.from('org_units').select('id, name').in('id', sortedIds)
  const map = new Map((rows ?? []).map((r) => [r.id as string, (r.name as string) ?? 'Team']))
  return sortedIds.map((id) => ({ id, name: map.get(id) ?? 'Team' }))
}

const resolveBudgetOrgUnitId = async (
  userId: string,
  role: Role,
  brandMarketId: string,
  requestedOrgUnitId: string | null,
): Promise<ResolveResult> => {
  const publicDb = createAdminClient()

  const { data: link } = await publicDb
    .from('user_org_units')
    .select('org_unit_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  const userOrg = link?.org_unit_id
  if (!userOrg) {
    return { ok: false, message: '조직이 연결된 사용자만 예산을 볼 수 있습니다.' }
  }

  const eligible = await getBudgetEligibleOrgIds(brandMarketId)
  ensureUserOrgEligible(eligible, userOrg)

  if (role === 'admin' || role === 'owner') {
    const target = requestedOrgUnitId && requestedOrgUnitId.length > 0 ? requestedOrgUnitId : userOrg
    if (!eligible.has(target)) {
      return { ok: false, message: '선택한 팀은 이 마켓 예산 범위에 없습니다.' }
    }
    const assignableOrgIds = await sortOrgIdsByName([...eligible])
    return { ok: true, orgUnitId: target, assignableOrgIds }
  }

  const subtree = await getSubtreeOrgIds(userOrg)
  const assignableOrgIds = await sortOrgIdsByName([...eligible].filter((id) => subtree.has(id)))

  if (assignableOrgIds.length === 0) {
    return { ok: false, message: '이 마켓에 대한 예산 범위에 조직이 없습니다.' }
  }

  let orgUnitId: string
  if (requestedOrgUnitId && assignableOrgIds.includes(requestedOrgUnitId)) {
    orgUnitId = requestedOrgUnitId
  } else if (assignableOrgIds.includes(userOrg)) {
    orgUnitId = userOrg
  } else {
    orgUnitId = assignableOrgIds[0]
  }

  return { ok: true, orgUnitId, assignableOrgIds }
}

export { resolveBudgetOrgUnitId, teamOptionsFromSortedIds }
export type { TeamOption, ResolveResult }
