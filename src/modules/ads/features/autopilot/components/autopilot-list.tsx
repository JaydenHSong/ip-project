// S08 — Auto Pilot Main Table
// Design Ref: §5.3 S08
'use client'

import { AdsStatusBadge } from '@/modules/ads/shared/components/status-badge'
import { ProgressBar } from '@/modules/ads/shared/components/progress-bar'
import { EmptyState } from '@/modules/ads/shared/components/empty-state'
import type { AutopilotCampaignItem } from '../types'

type AutopilotListProps = {
  campaigns: AutopilotCampaignItem[]
  isLoading?: boolean
  onRowClick: (id: string) => void
  onAction: (id: string, action: 'pause' | 'resume' | 'emergency_stop') => void
}

const AutopilotList = ({ campaigns, isLoading, onRowClick, onAction }: AutopilotListProps) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
        ))}
      </div>
    )
  }

  if (campaigns.length === 0) {
    return <EmptyState title="No Auto Pilot campaigns" description="Create an Auto Pilot campaign to get started." />
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Campaign</th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">Status</th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">Confidence</th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500">Target ACoS</th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500">Weekly Budget</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Last Action</th>
            <th className="px-3 py-3 w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {campaigns.map((c) => (
            <tr key={c.id} className="cursor-pointer hover:bg-gray-50" onClick={() => onRowClick(c.id)}>
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900 truncate max-w-[200px]">{c.name}</p>
                <p className="text-xs text-gray-400 font-mono">{c.marketing_code}</p>
              </td>
              <td className="px-3 py-3 text-center">
                <AdsStatusBadge status={c.status} />
              </td>
              <td className="px-3 py-3">
                <div className="w-20 mx-auto">
                  <ProgressBar value={c.confidence_score ?? 0} showPercent size="sm" />
                </div>
              </td>
              <td className="px-3 py-3 text-right text-gray-700">{c.target_acos ?? '-'}%</td>
              <td className="px-3 py-3 text-right text-gray-700">${c.weekly_budget ?? 0}</td>
              <td className="px-3 py-3 text-xs text-gray-500">
                {c.last_action ? (
                  <div>
                    <span>{c.last_action}</span>
                    {c.last_action_at && (
                      <span className="ml-1 text-gray-400">
                        {new Date(c.last_action_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ) : '-'}
              </td>
              <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                {/* Kebab menu — Design S08 */}
                <div className="relative group">
                  <button className="text-gray-400 hover:text-gray-600">&#x22EE;</button>
                  <div className="hidden group-hover:block absolute right-0 top-6 z-10 w-36 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                    {c.status === 'active' && (
                      <button onClick={() => onAction(c.id, 'pause')} className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50">
                        Pause
                      </button>
                    )}
                    {c.status === 'paused' && (
                      <button onClick={() => onAction(c.id, 'resume')} className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50">
                        Resume
                      </button>
                    )}
                    <button onClick={() => onAction(c.id, 'emergency_stop')} className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50">
                      Emergency Stop
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { AutopilotList }
