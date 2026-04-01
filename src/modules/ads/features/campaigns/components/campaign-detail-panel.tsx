// M02 — Campaign Detail Slide Panel (4-tab structure)
// Design Ref: §2.1 campaigns/components/campaign-detail-panel.tsx
// Tabs: Overview / Ad Groups / AI Activity / Settings
'use client'

import { useState } from 'react'
import { AdsStatusBadge } from '@/modules/ads/shared/components/status-badge'
import { CampaignBadge } from '@/modules/ads/shared/components/campaign-badge'
import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import { ProgressBar } from '@/modules/ads/shared/components/progress-bar'
import { AiQueuePreview } from './ai-queue-preview'
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

// ─── Tab: Overview ───

const OverviewTab = ({ campaign }: { campaign: CampaignDetail }) => {
  const metrics = campaign.metrics_7d

  return (
    <div className="space-y-6">
      {/* KPI 5 Cards — Design M02 spec */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Last 7 Days</h3>
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Spend" value={metrics ? `$${metrics.spend.toFixed(2)}` : '-'} />
          <KpiCard label="Sales" value={metrics ? `$${metrics.sales.toFixed(2)}` : '-'} />
          <KpiCard label="ACoS" value={metrics?.acos != null ? `${metrics.acos.toFixed(1)}%` : '-'} />
          <KpiCard label="ROAS" value={metrics?.roas != null ? `${metrics.roas.toFixed(2)}x` : '-'} />
          <KpiCard label="Orders" value={metrics?.orders ?? 0} />
        </div>
      </div>

      {/* Budget Pacing — Design M02 spec */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">Budget Pacing</h3>
        {(() => {
          const budget = campaign.mode === 'manual' ? campaign.daily_budget : campaign.weekly_budget
          const spent = metrics?.spend ?? 0
          const pct = budget ? (spent / budget) * 100 : 0
          return (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>${spent.toFixed(0)} spent</span>
                <span>${budget ?? 0} {campaign.mode === 'manual' ? '/day' : '/week'}</span>
              </div>
              <ProgressBar value={pct} showPercent={false} size="md" />
            </div>
          )
        })()}
      </div>

      {/* Confidence (autopilot only) */}
      {campaign.confidence_score != null && (
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">AI Confidence</span>
            <span className="font-medium text-gray-900">{campaign.confidence_score}%</span>
          </div>
          <ProgressBar value={campaign.confidence_score} showPercent={false} />
        </div>
      )}

      {/* AI Recommendations Preview — Design M02: "AI Recommendations 미리보기 2건" */}
      {campaign.brand_market_id && (
        <AiQueuePreview
          campaignId={campaign.id}
          brandMarketId={campaign.brand_market_id}
          maxItems={2}
        />
      )}

      {/* Quick Stats */}
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded border border-gray-100 bg-gray-50 p-3">
          <dt className="text-xs text-gray-500">Keywords</dt>
          <dd className="text-lg font-semibold text-gray-900">{campaign.keywords_count ?? 0}</dd>
        </div>
        <div className="rounded border border-gray-100 bg-gray-50 p-3">
          <dt className="text-xs text-gray-500">Ad Groups</dt>
          <dd className="text-lg font-semibold text-gray-900">{campaign.ad_groups_count ?? 0}</dd>
        </div>
      </dl>

      {/* Metadata */}
      <div className="border-t border-gray-200 pt-4">
        <dl className="space-y-1 text-xs text-gray-400">
          <div className="flex justify-between">
            <dt>Created</dt>
            <dd>{new Date(campaign.created_at).toLocaleDateString()}</dd>
          </div>
          {campaign.launched_at && (
            <div className="flex justify-between">
              <dt>Launched</dt>
              <dd>{new Date(campaign.launched_at).toLocaleDateString()}</dd>
            </div>
          )}
          {campaign.assigned_user && (
            <div className="flex justify-between">
              <dt>Assigned to</dt>
              <dd>{campaign.assigned_user.name}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Learning Day</dt>
            <dd>{campaign.learning_day}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

// ─── Tab: Ad Groups (placeholder for Track A) ───

const AdGroupsTab = ({ campaign }: { campaign: CampaignDetail }) => (
  <div className="py-8 text-center">
    <div className="mb-3 mx-auto h-12 w-12 rounded-full bg-gray-100" />
    <p className="text-sm font-medium text-gray-900">Ad Groups</p>
    <p className="mt-1 text-sm text-gray-500">
      {campaign.ad_groups_count ?? 0} ad groups &middot; {campaign.keywords_count ?? 0} keywords
    </p>
    <p className="mt-2 text-xs text-gray-400">Detailed ad group management coming in Track C</p>
  </div>
)

// ─── Tab: AI Activity ───

const AiActivityTab = ({ campaign }: { campaign: CampaignDetail }) => (
  <div className="space-y-4">
    {/* AI Queue */}
    {campaign.brand_market_id && (
      <AiQueuePreview
        campaignId={campaign.id}
        brandMarketId={campaign.brand_market_id}
      />
    )}

    {/* Recent Actions Log */}
    <div>
      <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Actions</h3>
      {campaign.recent_actions && campaign.recent_actions.length > 0 ? (
        <div className="space-y-2">
          {campaign.recent_actions.map((action) => (
            <div key={action.id} className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">{action.action_type}</p>
                <p className="text-[11px] text-gray-400">
                  {new Date(action.executed_at).toLocaleString()}
                </p>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">{action.reason}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 py-4 text-center">No AI actions recorded yet</p>
      )}
    </div>
  </div>
)

// ─── Tab: Settings ───

const SettingsTab = ({
  campaign,
  onUpdate,
}: {
  campaign: CampaignDetail
  onUpdate: (id: string, data: UpdateCampaignRequest) => Promise<void>
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<UpdateCampaignRequest>({
    target_acos: campaign.target_acos ?? undefined,
    daily_budget: campaign.daily_budget ?? undefined,
    weekly_budget: campaign.weekly_budget ?? undefined,
    max_bid_cap: campaign.max_bid_cap ?? undefined,
  })

  const handleSave = async () => {
    await onUpdate(campaign.id, editForm)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Target ACoS (%)</label>
          <input
            type="number"
            value={editForm.target_acos ?? ''}
            onChange={(e) => setEditForm({ ...editForm, target_acos: Number(e.target.value) })}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
          />
        </div>
        {campaign.mode === 'manual' ? (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Daily Budget ($)</label>
            <input
              type="number"
              value={editForm.daily_budget ?? ''}
              onChange={(e) => setEditForm({ ...editForm, daily_budget: Number(e.target.value) })}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Weekly Budget ($)</label>
            <input
              type="number"
              value={editForm.weekly_budget ?? ''}
              onChange={(e) => setEditForm({ ...editForm, weekly_budget: Number(e.target.value) })}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>
        )}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Max Bid Cap ($)</label>
          <input
            type="number"
            value={editForm.max_bid_cap ?? ''}
            onChange={(e) => setEditForm({ ...editForm, max_bid_cap: Number(e.target.value) })}
            step={0.01}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Save
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">Campaign Type</dt>
          <dd className="font-medium text-gray-900">{campaign.campaign_type.toUpperCase()}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Mode</dt>
          <dd className="font-medium text-gray-900">{campaign.mode === 'autopilot' ? 'Auto Pilot' : 'Manual'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Target ACoS</dt>
          <dd className="font-medium text-gray-900">{campaign.target_acos ?? '-'}%</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">
            {campaign.mode === 'manual' ? 'Daily Budget' : 'Weekly Budget'}
          </dt>
          <dd className="font-medium text-gray-900">
            ${(campaign.mode === 'manual' ? campaign.daily_budget : campaign.weekly_budget) ?? '-'}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Max Bid Cap</dt>
          <dd className="font-medium text-gray-900">${campaign.max_bid_cap ?? '-'}</dd>
        </div>
      </dl>
      <button
        onClick={() => setIsEditing(true)}
        className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Edit Settings
      </button>
    </div>
  )
}

// ─── Main Panel ───

const CampaignDetailPanel = ({
  campaign,
  isOpen,
  isLoading,
  onClose,
  onUpdate,
  onDuplicate,
}: CampaignDetailPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  // Reset tab when campaign changes
  const [prevCampaignId, setPrevCampaignId] = useState<string | null>(null)
  if (campaign?.id !== prevCampaignId) {
    setPrevCampaignId(campaign?.id ?? null)
    setActiveTab('overview')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md overflow-y-auto bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="min-w-0 flex-1">
              {isLoading ? (
                <div className="h-5 w-48 animate-pulse rounded bg-gray-100" />
              ) : campaign ? (
                <>
                  <h2 className="truncate text-base font-semibold text-gray-900">{campaign.name}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">{campaign.marketing_code}</span>
                    <CampaignBadge mode={campaign.mode} />
                    <AdsStatusBadge status={campaign.status} />
                  </div>
                </>
              ) : null}
            </div>
            <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600">&times;</button>
          </div>

          {/* Quick Actions */}
          {!isLoading && campaign && (
            <div className="flex items-center gap-2 px-6 pb-3">
              {campaign.status === 'active' && (
                <button
                  onClick={() => onUpdate(campaign.id, { status: 'paused' })}
                  className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
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
                  className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Duplicate
                </button>
              )}
            </div>
          )}

          {/* 4-Tab Navigation — Design M02 */}
          {!isLoading && campaign && (
            <div className="flex border-t border-gray-100">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'border-b-2 border-orange-500 text-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-50" />
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
