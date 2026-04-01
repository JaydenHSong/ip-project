// S02 — Director Dashboard
// Design Ref: §5.3 S02
// Budget Pacing, Market Performance, Auto Pilot Impact, Team Performance, Pending Actions
'use client'

import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import { BudgetPacingBar } from './budget-pacing-bar'
import { AcosHeatmap } from './acos-heatmap'
import type { DirectorDashboardData, PendingActionItem } from '../types'

type DirectorDashboardProps = {
  data: DirectorDashboardData | null
  isLoading?: boolean
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-50',
  warning: 'border-l-orange-500 bg-orange-50',
  info: 'border-l-gray-300 bg-gray-50',
}

const SEVERITY_TEXT: Record<string, string> = {
  critical: 'text-red-700',
  warning: 'text-orange-700',
  info: 'text-gray-600',
}

const SkeletonBlock = ({ h = 'h-48' }: { h?: string }) => (
  <div className={`${h} animate-pulse rounded-lg border border-gray-200 bg-gray-50`} />
)

// ─── Pending Actions List ───

const PendingActionsList = ({ actions }: { actions: PendingActionItem[] }) => {
  if (actions.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">No pending actions</p>
  }

  // Group by severity
  const grouped = {
    critical: actions.filter((a) => a.severity === 'critical'),
    warning: actions.filter((a) => a.severity === 'warning'),
    info: actions.filter((a) => a.severity === 'info'),
  }

  return (
    <div className="space-y-2">
      {(['critical', 'warning', 'info'] as const).map((sev) => {
        const items = grouped[sev]
        if (items.length === 0) return null
        return (
          <div key={sev}>
            <p className={`text-[11px] font-medium uppercase tracking-wider mb-1 ${SEVERITY_TEXT[sev]}`}>
              {sev} ({items.length})
            </p>
            <div className="space-y-1">
              {items.map((a) => (
                <div
                  key={a.id}
                  className={`rounded border-l-2 px-3 py-2 ${SEVERITY_STYLES[sev]}`}
                >
                  <p className="text-xs font-medium text-gray-700">{a.title}</p>
                  <p className="text-[11px] text-gray-500">{a.campaign_name} &middot; {a.type}</p>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main ───

const DirectorDashboard = ({ data, isLoading }: DirectorDashboardProps) => {
  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <SkeletonBlock h="h-64" />
        <SkeletonBlock />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Budget Pacing — Design S02: "Budget Pacing 전폭" */}
      <BudgetPacingBar items={data.budget_pacing} />

      {/* Market Performance ACoS — Design S02 */}
      <AcosHeatmap data={data.market_performance} />

      {/* Two-column: Auto Pilot Impact + Team Performance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Auto Pilot Impact — Design S02: "Auto Pilot Impact 요약 카드" */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Auto Pilot Impact</h3>
          <div className="grid grid-cols-3 gap-3">
            <KpiCard
              label="ACoS Change"
              value={`${data.autopilot_impact.acos_change >= 0 ? '+' : ''}${data.autopilot_impact.acos_change.toFixed(1)}%`}
            />
            <KpiCard
              label="Savings"
              value={`$${data.autopilot_impact.savings.toFixed(0)}`}
            />
            <KpiCard
              label="Actions (7d)"
              value={data.autopilot_impact.actions_7d}
            />
          </div>
        </div>

        {/* Team Performance — Design S02: "Team Performance 테이블 (심각도 순)" */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Team Performance</h3>
          {data.team_performance.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No team data</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-1.5 text-left text-gray-500 font-medium">Team</th>
                  <th className="py-1.5 text-right text-gray-500 font-medium">Spend</th>
                  <th className="py-1.5 text-right text-gray-500 font-medium">ACoS</th>
                  <th className="py-1.5 text-right text-gray-500 font-medium">Campaigns</th>
                </tr>
              </thead>
              <tbody>
                {data.team_performance.map((t) => (
                  <tr key={t.org_unit_id} className="border-b border-gray-50">
                    <td className="py-1.5 font-medium text-gray-700">{t.team_name}</td>
                    <td className="py-1.5 text-right text-gray-600">${t.spend.toFixed(0)}</td>
                    <td className="py-1.5 text-right">
                      <span className={t.delta_acos > 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {t.acos.toFixed(1)}%
                      </span>
                      {t.delta_acos !== 0 && (
                        <span className={`ml-1 text-[10px] ${t.delta_acos > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {t.delta_acos > 0 ? '+' : ''}{t.delta_acos.toFixed(1)}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-gray-600">{t.campaigns_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pending Actions — Design S02: "Pending Actions 목록 (severity 그룹핑 + CTA)" */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Pending Actions</h3>
          {data.pending_actions.length > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {data.pending_actions.length}
            </span>
          )}
        </div>
        <PendingActionsList actions={data.pending_actions} />
      </div>
    </div>
  )
}

export { DirectorDashboard }
