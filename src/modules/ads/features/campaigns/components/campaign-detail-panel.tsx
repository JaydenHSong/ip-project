// M02 — Campaign Detail Slide Panel (orchestrator)
// Design Ref: §3.5 P4 — Reduced from 500→~130 LOC
'use client'

import { useState } from 'react'
import { AdsStatusBadge } from '@/modules/ads/shared/components/status-badge'
import { CampaignBadge } from '@/modules/ads/shared/components/campaign-badge'
import { OverviewTab } from './detail-tabs/overview-tab'
import { AdGroupsTab } from './detail-tabs/ad-groups-tab'
import { AiActivityTab } from './detail-tabs/ai-activity-tab'
import { SettingsTab } from './detail-tabs/settings-tab'
import type { CampaignDetail, UpdateCampaignRequest } from '../types'

type CampaignDetailPanelProps = {
  campaign: CampaignDetail | null
  isOpen: boolean
  isLoading?: boolean
  onClose: () => void
  onUpdate: (id: string, data: UpdateCampaignRequest) => Promise<void>
  onDuplicate?: (id: string) => void
}

type TabKey = 'overview' | 'ad_groups' | 'ai_activity' | 'settings'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'ad_groups', label: 'Ad Groups' },
  { key: 'ai_activity', label: 'AI Activity' },
  { key: 'settings', label: 'Settings' },
]

const CampaignDetailPanel = ({
  campaign,
  isOpen,
  isLoading,
  onClose,
  onUpdate,
  onDuplicate,
}: CampaignDetailPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const [prevCampaignId, setPrevCampaignId] = useState<string | null>(null)
  if (campaign?.id !== prevCampaignId) {
    setPrevCampaignId(campaign?.id ?? null)
    setActiveTab('overview')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* M2 fix: max-w-md (448px) was too narrow for 4-tab content; widen to 640px */}
      <div className="relative w-full max-w-2xl overflow-y-auto bg-surface-card shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-th-border bg-surface-card">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="min-w-0 flex-1">
              {isLoading ? (
                <div className="h-5 w-48 animate-pulse rounded bg-th-bg-tertiary" />
              ) : campaign ? (
                <>
                  <h2 className="truncate text-base font-semibold text-th-text">{campaign.name}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs font-mono text-th-text-muted">{campaign.marketing_code}</span>
                    <CampaignBadge mode={campaign.mode} />
                    <AdsStatusBadge status={campaign.status} />
                  </div>
                </>
              ) : null}
            </div>
            <button onClick={onClose} className="ml-4 text-th-text-muted hover:text-th-text-secondary">&times;</button>
          </div>

          {!isLoading && campaign && (
            <div className="flex items-center gap-2 px-6 pb-3">
              {campaign.status === 'active' && (
                <button
                  onClick={() => onUpdate(campaign.id, { status: 'paused' })}
                  className="rounded-md border border-th-border px-3 py-1 text-xs font-medium text-th-text-secondary hover:bg-th-bg-hover"
                >
                  Pause
                </button>
              )}
              {campaign.status === 'paused' && (
                <button
                  onClick={() => onUpdate(campaign.id, { status: 'active' })}
                  className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600"
                >
                  Resume
                </button>
              )}
              {onDuplicate && (
                <button
                  onClick={() => onDuplicate(campaign.id)}
                  className="rounded-md border border-th-border px-3 py-1 text-xs font-medium text-th-text-secondary hover:bg-th-bg-hover"
                >
                  Duplicate
                </button>
              )}
            </div>
          )}

          {!isLoading && campaign && (
            <div className="flex border-t border-th-border">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'border-b-2 border-orange-500 text-orange-600'
                      : 'text-th-text-muted hover:text-th-text-secondary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-th-bg-hover" />
            ))}
          </div>
        ) : campaign ? (
          <div className="p-6">
            {activeTab === 'overview' && <OverviewTab campaign={campaign} />}
            {activeTab === 'ad_groups' && <AdGroupsTab campaign={campaign} />}
            {activeTab === 'ai_activity' && <AiActivityTab campaign={campaign} />}
            {activeTab === 'settings' && <SettingsTab campaign={campaign} onUpdate={onUpdate} />}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export { CampaignDetailPanel }
