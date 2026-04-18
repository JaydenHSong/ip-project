import { getBudgets } from './queries'
import type { TeamBudgetRollupRow } from './types'

type TeamOption = { id: string; name: string }

const buildTeamBudgetRollups = async (
  brandMarketId: string,
  year: number,
  assignableOrgIds: string[],
  teamOptions: TeamOption[],
): Promise<TeamBudgetRollupRow[]> => {
  const nameById = new Map(teamOptions.map((t) => [t.id, t.name]))
  return Promise.all(
    assignableOrgIds.map(async (orgId) => {
      const d = await getBudgets({
        brand_market_id: brandMarketId,
        year,
        org_unit_id: orgId,
      })
      return {
        org_unit_id: orgId,
        name: nameById.get(orgId) ?? 'Team',
        plan_total: d.plan_total,
        actual_total: d.actual_total,
        ytd: d.ytd,
      }
    }),
  )
}

export { buildTeamBudgetRollups }
