// S02 — Director Dashboard
// Design Ref: §5.3 S02
// Budget Pacing, Market Performance, Auto Pilot Impact, Team Performance, Pending Actions
'use client'

import { useState } from 'react'
import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import { BudgetPacingBar } from './budget-pacing-bar'
import { AcosHeatmap } from './acos-heatmap'
import { AlertDetailModal } from '@/modules/ads/features/optimization/components/alert-detail-modal'
// Design Ref: ft-optimization-ui-wiring §3.2 S1 — M04 wiring via Pending Actions
import type { AlertDetailData } from '@/modules/ads/features/optimization/types'
import type { DirectorDashboardData, PendingActionItem } from '../types'

type DirectorDashboardProps = {
  data: DirectorDashboardData | null
  isLoading?: boolean
  errorMessage?: string | null
  onRetry?: () => void
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-50',
  warning: 'border-l-orange-500 bg-orange-50',
  info: 'border-l-gray-300 bg-th-bg-hover',
}

const SEVERITY_TEXT: Record<string, string> = {
  critical: 'text-red-700',
  warning: 'text-orange-700',
  info: 'text-th-text-secondary',
}

const SkeletonBlock = ({ h = 'h-48' }: { h?: string }) => (
  <div className={`${h} animate-pulse rounded-lg border border-th-border bg-th-bg-hover`} />
)

// ─── Pending Actions List ───

const PendingActionsList = ({
  actions,
  onSelect,
}: {
  actions: PendingActionItem[]
  onSelect: (id: string) => void
}) => {
  if (actions.length === 0) {
    return <p className="text-sm text-th-text-muted text-center py-6">No pending actions</p>
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
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onSelect(a.id)}
                  className={`block w-full rounded border-l-2 px-3 py-2 text-left hover:brightness-95 ${SEVERITY_STYLES[sev]}`}
                >
                  <p className="text-xs font-medium text-th-text-secondary">{a.title}</p>
                  <p className="text-[11px] text-th-text-muted">{a.campaign_name} &middot; {a.type}</p>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main ───

const DirectorDashboard = ({ data, isLoading, errorMessage, onRetry }: DirectorDashboardProps) => {
  // Design Ref: ft-optimization-ui-wiring §3.2 S1 — M04 Alert Detail wiring
  const [selectedAlert, setSelectedAlert] = useState<AlertDetailData | null>(null)
  const [alertModalOpen, setAlertModalOpen] = useState(false)

  const handleSelectAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/ads/alerts/${alertId}`)
      if (!res.ok) return
      const json = await res.json() as { data: AlertDetailData }
      setSelectedAlert(json.data)
      setAlertModalOpen(true)
    } catch (err) {
      console.error('[director-dashboard] alert fetch failed', err)
    }
  }

  const handleAlertAction = (alertId: string, actionKey: string) => {
    // Full action wiring deferred to follow-up PDCA (ft-alert-action-router)
    console.info('[director-dashboard] alert action', alertId, actionKey)
  }

  if (errorMessage) {
    return (
      <div className="rounded-lg border border-th-border bg-surface-card p-6 text-center">
        <p className="text-sm text-red-700">{errorMessage}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-md bg-th-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Retry
          </button>
        ) : null}
      </div>
    )
  }

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
        <div className="rounded-lg border border-th-border bg-surface-card p-4">
          <h3 className="text-sm font-medium text-th-text mb-3">Auto Pilot Impact</h3>
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
        <div className="rounded-lg border border-th-border bg-surface-card p-4">
          <h3 className="text-sm font-medium text-th-text mb-3">Team Performance</h3>
          {data.team_performance.length === 0 ? (
            <p className="text-sm text-th-text-muted text-center py-6">No team data</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-th-border">
                  <th className="py-1.5 text-left text-th-text-muted font-medium">Team</th>
                  <th className="py-1.5 text-right text-th-text-muted font-medium">Spend</th>
                  <th className="py-1.5 text-right text-th-text-muted font-medium">ACoS</th>
                  <th className="py-1.5 text-right text-th-text-muted font-medium">Campaigns</th>
                </tr>
              </thead>
              <tbody>
                {data.team_performance.map((t) => (
                  <tr key={t.org_unit_id} className="border-b border-th-border">
                    <td className="py-1.5 font-medium text-th-text-secondary">{t.team_name}</td>
                    <td className="py-1.5 text-right text-th-text-secondary">${t.spend.toFixed(0)}</td>
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
                    <td className="py-1.5 text-right text-th-text-secondary">{t.campaigns_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pending Actions — Design S02: "Pending Actions 목록 (severity 그룹핑 + CTA)" */}
      <div className="rounded-lg border border-th-border bg-surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-th-text">Pending Actions</h3>
          {data.pending_actions_total > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {data.pending_actions_total}
            </span>
          )}
        </div>
        <PendingActionsList actions={data.pending_actions} onSelect={handleSelectAlert} />
      </div>

      {/* M04 Alert Detail Modal */}
      <AlertDetailModal
        alert={selectedAlert}
        isOpen={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
        onAction={handleAlertAction}
      />
    </div>
  )
}

export { DirectorDashboard }
