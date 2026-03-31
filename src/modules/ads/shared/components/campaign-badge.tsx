// Design Ref: §2.1 shared/components — Auto Pilot / Manual 뱃지
'use client'

import type { CampaignMode } from '../types'

type CampaignBadgeProps = {
  mode: CampaignMode
  className?: string
}

const BADGE_STYLES: Record<CampaignMode, string> = {
  autopilot: 'bg-orange-50 text-orange-700 border-orange-200',
  manual: 'bg-gray-50 text-gray-600 border-gray-200',
}

const BADGE_LABELS: Record<CampaignMode, string> = {
  autopilot: 'Auto Pilot',
  manual: 'Manual',
}

const CampaignBadge = ({ mode, className = '' }: CampaignBadgeProps) => {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${BADGE_STYLES[mode]} ${className}`}>
      {BADGE_LABELS[mode]}
    </span>
  )
}

export { CampaignBadge }
