'use client'

import type { ScoredCampaign } from './types'

type CampaignTableRowProps = {
  campaign: ScoredCampaign
  onRowClick: (id: string) => void
}

const getStatusClassName = (status: string) => {
  if (status === 'active') return 'text-emerald-600'
  if (status === 'paused') return 'text-th-text-muted'
  if (status === 'learning') return 'text-orange-500'
  return 'text-th-text-secondary'
}

const getRowSignalClassName = (signal: ScoredCampaign['signal']) => {
  if (signal === 'critical') return 'border-l-red-600/80'
  if (signal === 'attention') return 'border-l-orange-500/70'
  return 'border-l-transparent'
}

const CampaignTableRow = ({ campaign, onRowClick }: CampaignTableRowProps) => (
  <tr
    className={`cursor-pointer border-l-2 transition-colors hover:bg-th-bg-hover ${getRowSignalClassName(campaign.signal)}`}
    onClick={() => onRowClick(campaign.id)}
  >
    <td className="px-3 py-2.5">
      <div>
        <p className="max-w-[280px] truncate text-[13px] font-medium text-th-text">{campaign.name}</p>
        <p className="mt-0.5 text-[11px] text-th-text-muted">
          {campaign.marketing_code} · {campaign.campaign_type.toUpperCase()}
        </p>
      </div>
    </td>
    <td className="px-3 py-2.5 text-xs">
      <span className={getStatusClassName(campaign.status)}>
        {campaign.status === 'active'
          ? 'Active'
          : campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
      </span>
    </td>
    <td className="px-3 py-2.5 text-right text-xs text-th-text-secondary">
      ${Math.round(campaign.daily_budget ?? campaign.weekly_budget ?? 0)}
    </td>
    <td className="px-3 py-2.5 text-right text-xs text-th-text-secondary">
      {campaign.spend_today != null ? `$${campaign.spend_today.toFixed(2)}` : '-'}
    </td>
    <td className="px-3 py-2.5 text-right text-xs">
      <span
        className={
          campaign.acos != null &&
          campaign.target_acos != null &&
          campaign.acos > campaign.target_acos
            ? 'font-medium text-red-600'
            : 'text-th-text-secondary'
        }
      >
        {campaign.acos != null ? `${campaign.acos.toFixed(1)}%` : '-'}
      </span>
    </td>
    <td className="px-3 py-2.5 text-right text-xs text-th-text-muted">-</td>
    <td className="px-3 py-2.5 text-right text-xs text-th-text-muted">-</td>
    <td className="px-3 py-2.5 text-xs">
      <span className={campaign.mode === 'autopilot' ? 'text-indigo-500' : 'text-th-text-secondary'}>
        {campaign.mode === 'autopilot' ? 'Auto Pilot' : 'Manual'}
      </span>
    </td>
  </tr>
)

export { CampaignTableRow }
