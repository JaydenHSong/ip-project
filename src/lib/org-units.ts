import { createAdminClient } from '@/lib/supabase/admin'

export type OrgUnit = {
  id: string
  name: string
  level: string
  parent_id: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type OrgLevel = 'company' | 'division' | 'business_unit' | 'department' | 'team' | 'unit'

export const ORG_LEVEL_LABELS: Record<OrgLevel, string> = {
  company: '회사',
  division: '부문',
  business_unit: '사업부',
  department: '부서',
  team: '팀',
  unit: '유닛/파트',
}

export const ORG_LEVEL_ORDER: OrgLevel[] = [
  'company', 'division', 'business_unit', 'department', 'team', 'unit',
]

// 사용자가 특정 모듈에서 접근 가능한 org_unit ID 목록 (서버 사이드)
export async function getAccessibleOrgUnits(userId: string, moduleKey: string): Promise<string[]> {
  const db = createAdminClient()

  const { data, error } = await db.rpc('get_accessible_org_units', {
    p_user_id: userId,
    p_module_key: moduleKey,
  })

  if (error) {
    return []
  }

  return (data as string[]) ?? []
}

// 조직 트리를 flat → nested 구조로 변환
export function buildOrgTree(units: OrgUnit[]): OrgUnit & { children: (OrgUnit & { children: unknown[] })[] } {
  const map = new Map<string, OrgUnit & { children: (OrgUnit & { children: unknown[] })[] }>()

  for (const unit of units) {
    map.set(unit.id, { ...unit, children: [] })
  }

  let root: (OrgUnit & { children: (OrgUnit & { children: unknown[] })[] }) | null = null

  for (const unit of units) {
    const node = map.get(unit.id)!
    if (unit.parent_id && map.has(unit.parent_id)) {
      map.get(unit.parent_id)!.children.push(node)
    } else if (!unit.parent_id) {
      root = node
    }
  }

  return root ?? { id: '', name: 'Root', level: 'company', parent_id: null, sort_order: 0, is_active: true, created_at: '', updated_at: '', children: [] }
}

// 사용자의 주 소속 org_unit 조회
export async function getUserPrimaryOrg(userId: string): Promise<string | null> {
  const db = createAdminClient()

  const { data } = await db
    .from('user_org_units')
    .select('org_unit_id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single()

  return data?.org_unit_id ?? null
}
