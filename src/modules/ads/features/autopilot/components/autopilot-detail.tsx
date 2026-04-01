// S09 — Auto Pilot Detail
// Design Ref: §5.3 S09
'use client'

import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import { ProgressBar } from '@/modules/ads/shared/components/progress-bar'
import { AiActivityLog } from './ai-activity-log'
import { RollbackButton } from './rollback-button'
import type { AutopilotCampaignItem, ActivityLogEntry } from '../types'

type AutopilotDetailProps = {
  campaign: AutopilotCampaignItem
  activityLog: ActivityLogEntry[]
  onPause: () => void
  onRollback: (logIds: string[]) => Promise<void>
  onBack: () => void
}

const AutopilotDetail = ({ campaign, activityLog, onPause, onRollback, onBack }: AutopilotDetailProps) => {
  const last5Ids = activityLog
    .filter((l) => !l.is_rolled_back && !l.guardrail_blocked)
    .slice(0, 5)
    .map((l) => l.id)

  return (
    <div className="space-y-6">
      {/* Campaign Header — Design S09 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</button>
          <div>
            <h2 className="text-base font-semibold text-gray-900">{campaign.name}</h2>
            <p className="text-xs text-gray-400 font-mono">{campaign.marketing_code}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === 'active' && (
            <button onClick={onPause} className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600">
              Pause
            </button>
          )}
          <button className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            Settings
          </button>
        </div>
      </div>

      {/* KPI Strip 4 cards — Design S09 */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="ACoS Target" value={campaign.target_acos ? `${campaign.target_acos}%` : '-'} />
        <KpiCard label="Weekly Budget" value={campaign.weekly_budget ? `$${campaign.weekly_budget}` : '-'} />
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Confidence</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{campaign.confidence_score ?? 0}%</p>
          <ProgressBar value={campaign.confidence_score ?? 0} showPercent={false} className="mt-2" />
        </div>
        <KpiCard label="Actions (7d)" value={activityLog.length} />
      </div>

      {/* Undo Last 5 — Design S09 */}
      {last5Ids.length > 0 && (
        <div className="flex justify-end">
          <RollbackButton
            label={`Undo Last ${last5Ids.length}`}
            onRollback={() => onRollback(last5Ids)}
          />
        </div>
      )}

      {/* AI Activity Log — Design S09 */}
      <AiActivityLog
        entries={activityLog}
        onRollback={(id) => onRollback([id])}
      />
    </div>
  )
}

export { AutopilotDetail }
