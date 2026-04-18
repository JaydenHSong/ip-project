'use client'

import type { TeamBudgetRollupRow } from '../types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const fmt = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(0))

type BudgetTeamRollupTableProps = {
  year: number
  teams: TeamBudgetRollupRow[]
  selectedOrgId: string | null
  onSelectTeam?: (orgUnitId: string) => void
}

const BudgetTeamRollupTable = ({
  year,
  teams,
  selectedOrgId,
  onSelectTeam,
}: BudgetTeamRollupTableProps) => {
  const yy = String(year).slice(2)

  return (
    <div className="rounded-lg border border-th-border bg-surface-card">
      <div className="border-b border-th-border px-4 py-3">
        <p className="text-sm font-medium text-th-text-secondary">팀별 요약 (이 마켓)</p>
        <p className="mt-1 text-xs text-th-text-muted">
          하위 팀이 여러 개일 때 전체를 한 표로 보여 줍니다. 행을 클릭하면 아래에서 해당 팀 예산을 수정할 수 있습니다.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-th-border">
              <th
                scope="col"
                className="sticky left-0 min-w-[10rem] bg-surface-card px-3 py-2 text-left text-th-text-muted"
              >
                Line
              </th>
              {MONTHS.map((m) => (
                <th key={m} scope="col" className="px-2 py-2 text-center text-th-text-muted min-w-[64px]">
                  {m}
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-center text-th-text-secondary font-semibold">
                Team total
              </th>
            </tr>
          </thead>
          <tbody>
            {teams.flatMap((t) => [
              <tr key={`${t.org_unit_id}-plan`} className="border-b border-th-border">
                <th
                  scope="row"
                  className={`sticky left-0 cursor-pointer px-3 py-2 text-left font-medium ${
                    selectedOrgId === t.org_unit_id
                      ? 'bg-orange-50 text-th-text dark:bg-orange-950/30'
                      : 'bg-surface-card text-th-text-secondary'
                  }`}
                  onClick={() => onSelectTeam?.(t.org_unit_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectTeam?.(t.org_unit_id)
                    }
                  }}
                  tabIndex={onSelectTeam ? 0 : undefined}
                  role={onSelectTeam ? 'button' : undefined}
                >
                  {t.name} · Plan &apos;{yy}
                </th>
                {MONTHS.map((_, i) => {
                  const month = i + 1
                  const amount = t.plan_total.months.find((m) => m.month === month)?.amount ?? 0
                  return (
                    <td key={month} className="px-1 py-1 text-right font-mono text-th-text-secondary">
                      ${fmt(amount)}
                    </td>
                  )
                })}
                <td className="px-3 py-2 text-right font-mono font-semibold text-th-text">
                  ${fmt(t.plan_total.annual_total)}
                </td>
              </tr>,
              <tr key={`${t.org_unit_id}-act`} className="border-b border-th-border bg-th-bg-hover/80">
                <th scope="row" className="sticky left-0 bg-th-bg-hover px-3 py-2 text-left font-medium text-th-text-muted">
                  {t.name} · Actual &apos;{yy}
                </th>
                {MONTHS.map((_, i) => {
                  const month = i + 1
                  const amount = t.actual_total.months.find((m) => m.month === month)?.amount ?? 0
                  return (
                    <td key={month} className="px-2 py-2 text-center font-mono text-th-text-muted">
                      {amount > 0 ? `$${fmt(amount)}` : '-'}
                    </td>
                  )
                })}
                <td className="px-3 py-2 text-right font-mono font-medium text-th-text-secondary">
                  ${fmt(t.actual_total.annual_total)}
                </td>
              </tr>,
            ])}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export { BudgetTeamRollupTable }
