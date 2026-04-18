'use client'

import { BudgetKpiStrip } from '@/modules/ads/features/budget-planning/components/budget-kpi-strip'
import { BudgetGrid } from '@/modules/ads/features/budget-planning/components/budget-grid'
import { BudgetTeamRollupTable } from '@/modules/ads/features/budget-planning/components/budget-team-rollup-table'
import type { BudgetKpiData, BudgetEntry, BudgetListResponse } from '@/modules/ads/features/budget-planning/types'
import type { Role } from '@/types/users'

type BudgetPlanningTabContentProps = {
  selectedMarketId: string | null
  currentYear: number
  budgetData: BudgetListResponse['data'] | null
  budgetKpi: BudgetKpiData | null
  isBudgetLoading: boolean
  budgetError: string | null
  onRetryBudget: () => void
  onBudgetSave: (entries: BudgetEntry[]) => Promise<void>
  userRole: Role | null
  budgetOrgUnitId: string | null
  onBudgetTeamChange: (orgUnitId: string) => void
  marketLabel: string | null
  marketplace: string | null
}

const BudgetPlanningTabContent = ({
  selectedMarketId,
  currentYear,
  budgetData,
  budgetKpi,
  isBudgetLoading,
  budgetError,
  onRetryBudget,
  onBudgetSave,
  userRole,
  budgetOrgUnitId,
  onBudgetTeamChange,
  marketLabel,
  marketplace,
}: BudgetPlanningTabContentProps) => {
  const canEditBudget =
    userRole === 'owner' ||
    userRole === 'admin' ||
    userRole === 'editor' ||
    userRole === 'viewer_plus'

  if (!selectedMarketId) {
    return (
      <div className="rounded-lg border border-dashed border-th-border bg-surface-card p-8 text-center">
        <p className="text-sm text-th-text-muted">Select a market to view annual budget planning.</p>
      </div>
    )
  }

  const teamOptions = budgetData?.team_options
  const teamRollups = budgetData?.team_rollups
  const showTeamPicker = Boolean(teamOptions && teamOptions.length > 1)
  const showRollup = Boolean(teamRollups && teamRollups.length > 1)

  const teamSelectValue = budgetOrgUnitId ?? budgetData?.org_unit_id ?? ''

  return (
    <div className="space-y-6">
      {showRollup && teamRollups ? (
        <BudgetTeamRollupTable
          year={currentYear}
          teams={teamRollups}
          selectedOrgId={teamSelectValue || null}
          onSelectTeam={onBudgetTeamChange}
        />
      ) : null}

      {showTeamPicker ? (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="budget-team-select" className="text-sm font-medium text-th-text-secondary">
            편집할 팀
          </label>
          <select
            id="budget-team-select"
            value={teamSelectValue}
            onChange={(e) => onBudgetTeamChange(e.target.value)}
            className="rounded-md border border-th-border bg-surface-card px-3 py-2 text-sm text-th-text"
          >
            {(teamOptions ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-th-text-muted">
            소속 조직 범위의 팀만 표시됩니다. 디렉터는 위 표에서 팀을 클릭해도 선택이 바뀝니다.
          </p>
        </div>
      ) : null}

      {budgetError ? (
        <div className="rounded-lg border border-red-200 bg-red-50/90 p-4 dark:border-red-800 dark:bg-red-950/40">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">예산을 불러오지 못했습니다</p>
          <p className="mt-1 text-xs text-red-700 dark:text-red-300">{budgetError}</p>
          <button
            type="button"
            onClick={onRetryBudget}
            className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 dark:border-red-700 dark:bg-th-bg-hover dark:text-red-200"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!budgetError ? <BudgetKpiStrip data={budgetKpi} isLoading={isBudgetLoading} /> : null}

      {budgetData && !budgetError && (
        <div className="space-y-2">
          {showRollup ? (
            <p className="text-xs font-medium text-th-text-secondary">선택한 팀 — 월별 입력·저장</p>
          ) : null}
          <BudgetGrid
            plan_total={budgetData.plan_total}
            actual_total={budgetData.actual_total}
            year={currentYear}
            marketLabel={marketLabel}
            marketplace={marketplace}
            onSave={onBudgetSave}
            canEdit={canEditBudget}
          />
        </div>
      )}

    </div>
  )
}

export { BudgetPlanningTabContent }
