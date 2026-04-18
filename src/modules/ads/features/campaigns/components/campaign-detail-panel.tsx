'use client'

import { useEffect, useRef, useState } from 'react'
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
  errorMessage?: string | null
  onRetry?: () => void
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
  errorMessage,
  onRetry,
  onClose,
  onUpdate,
  onDuplicate,
}: CampaignDetailPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const campaignId = campaign?.id
  const [isAnimatingIn, setIsAnimatingIn] = useState(false)
  const closeTimerRef = useRef<number | null>(null)

  const clearCloseTimer = () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }
  const requestClose = () => {
    setIsAnimatingIn(false)
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      onClose()
    }, 180)
  }
  useEffect(() => {
    setActiveTab('overview')
  }, [campaignId])
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setIsAnimatingIn(true)
    })
    return () => {
      window.cancelAnimationFrame(raf)
      clearCloseTimer()
    }
  }, [])
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-200 ${
          isAnimatingIn ? 'opacity-30' : 'opacity-0'
        }`}
        onClick={requestClose}
      />
      <div className={`relative w-full max-w-[680px] overflow-y-auto bg-surface-card shadow-xl transition-transform duration-200 ease-out ${isAnimatingIn ? 'translate-x-0' : 'translate-x-8'}`}>
        <div className="sticky top-0 z-10 border-b border-th-border bg-surface-card">
          <div className="flex items-start gap-2 px-5 py-3.5">
            <button
              onClick={requestClose}
              aria-label="Close detail panel"
              className="mt-0.5 rounded-md p-1.5 text-base leading-none text-th-text-muted transition-colors hover:bg-th-bg-hover hover:text-th-text-secondary"
            >
              &larr;
            </button>
            <div className="min-w-0 flex-1">
              {isLoading ? (
                <div className="h-5 w-48 animate-pulse rounded bg-th-bg-tertiary" />
              ) : campaign ? (
                <>
                  <h2 className="truncate text-[15px] font-semibold text-th-text">{campaign.name}</h2>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-th-text-muted">{campaign.marketing_code}</span>
                    <CampaignBadge mode={campaign.mode} />
                    <AdsStatusBadge status={campaign.status} />
                  </div>
                </>
              ) : null}
            </div>
          </div>
          {!isLoading && campaign && (
            <div className="flex items-center gap-1.5 border-t border-th-border px-5 py-2">
              {campaign.status === 'active' && (
                <button
                  onClick={() => onUpdate(campaign.id, { status: 'paused' })}
                  className="rounded-md border border-th-border px-2.5 py-1 text-[11px] font-medium text-th-text-secondary hover:bg-th-bg-hover"
                >
                  Pause
                </button>
              )}
              {campaign.status === 'paused' && (
                <button
                  onClick={() => onUpdate(campaign.id, { status: 'active' })}
                  className="rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-600"
                >
                  Resume
                </button>
              )}
              {onDuplicate && (
                <button
                  onClick={() => onDuplicate(campaign.id)}
                  className="rounded-md border border-th-border px-2.5 py-1 text-[11px] font-medium text-th-text-secondary hover:bg-th-bg-hover"
                >
                  Duplicate
                </button>
              )}
            </div>
          )}
          {!isLoading && campaign && (
            <div className="flex border-t border-th-border bg-th-bg-hover/40 px-2">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 border-b-2 px-2 py-2 text-[11px] font-medium uppercase tracking-wide transition-colors ${
                    activeTab === tab.key
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-th-text-muted hover:text-th-text-secondary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-th-bg-hover" />
            ))}
          </div>
        ) : errorMessage ? (
          <div className="p-5">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">Unable to load campaign details</p>
              <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
              {onRetry ? (
                <button
                  onClick={onRetry}
                  className="mt-3 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  Retry
                </button>
              ) : null}
            </div>
          </div>
        ) : campaign ? (
          <div className="p-5">
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
