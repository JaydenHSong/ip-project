// Design Ref: §2.1 shared/components — Running/Learning/Paused 등
'use client'

import type { CampaignStatus } from '../types'

type StatusBadgeProps = {
  status: CampaignStatus
  className?: string
}

const STATUS_STYLES: Record<CampaignStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  learning: 'bg-orange-50 text-orange-700',
  paused: 'bg-th-bg-tertiary text-th-text-muted',
  archived: 'bg-th-bg-hover text-th-text-muted',
}

const STATUS_LABELS: Record<CampaignStatus, string> = {
  active: 'Running',
  learning: 'Learning',
  paused: 'Paused',
  archived: 'Archived',
}

const AdsStatusBadge = ({ status, className = '' }: StatusBadgeProps) => {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]} ${className}`}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : status === 'learning' ? 'bg-orange-500' : 'bg-gray-400'}`} />
      {STATUS_LABELS[status]}
    </span>
  )
}

export { AdsStatusBadge }
