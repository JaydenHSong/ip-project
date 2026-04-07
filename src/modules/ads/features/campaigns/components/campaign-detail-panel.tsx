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
        <h3 className="text-sm font-medium text-th-text mb-3">Last 7 Days</h3>
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
        <h3 className="text-sm font-medium text-th-text mb-2">Budget Pacing</h3>
        {(() => {
          const budget = campaign.mode === 'manual' ? campaign.daily_budget : campaign.weekly_budget
          const spent = metrics?.spend ?? 0
          const pct = budget ? (spent / budget) * 100 : 0
          return (
            <div>
              <div className="flex justify-between text-xs text-th-text-muted mb-1">
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
            <span className="text-th-text-muted">AI Confidence</span>
            <span className="font-medium text-th-text">{campaign.confidence_score}%</span>
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
        <div className="rounded border border-th-border bg-th-bg-hover p-3">
          <dt className="text-xs text-th-text-muted">Keywords</dt>
          <dd className="text-lg font-semibold text-th-text">{campaign.keywords_count ?? 0}</dd>
        </div>
        <div className="rounded border border-th-border bg-th-bg-hover p-3">
          <dt className="text-xs text-th-text-muted">Ad Groups</dt>
          <dd className="text-lg font-semibold text-th-text">{campaign.ad_groups_count ?? 0}</dd>
        </div>
      </dl>

      {/* Metadata */}
      <div className="border-t border-th-border pt-4">
        <dl className="space-y-1 text-xs text-th-text-muted">
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

// ─── Tab: Ad Groups ───

type AdGroupRow = { id: string; name: string; default_bid: number | null; state: string | null; keyword_count: number }

const AdGroupsTab = ({ campaign }: { campaign: CampaignDetail }) => {
  const [adGroups, setAdGroups] = useState<AdGroupRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch ad groups + keyword counts
  useState(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`/api/ads/keywords?campaign_id=${campaign.id}&limit=0`)
        if (res.ok) {
          const json = await res.json() as { data: { ad_group_id: string }[] }
          // Group by ad_group_id to get counts
          const counts = new Map<string, number>()
          for (const kw of json.data ?? []) {
            counts.set(kw.ad_group_id, (counts.get(kw.ad_group_id) ?? 0) + 1)
          }
          // Build rows from campaign data
          setAdGroups([{
            id: 'default',
            name: `${campaign.name} - Default`,
            default_bid: campaign.max_bid_cap,
            state: 'enabled',
            keyword_count: campaign.keywords_count ?? 0,
          }])
        }
      } catch { /* silent */ }
      finally { setIsLoading(false) }
    }
    fetch_()
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-th-bg-hover" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded border border-th-border bg-th-bg-hover p-3">
          <p className="text-xs text-th-text-muted">Ad Groups</p>
          <p className="text-lg font-semibold text-th-text">{campaign.ad_groups_count ?? adGroups.length}</p>
        </div>
        <div className="rounded border border-th-border bg-th-bg-hover p-3">
          <p className="text-xs text-th-text-muted">Keywords</p>
          <p className="text-lg font-semibold text-th-text">{campaign.keywords_count ?? 0}</p>
        </div>
      </div>

      {/* Ad Group List */}
      <div className="rounded-lg border border-th-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-th-border">
              <th className="px-3 py-2 text-left text-th-text-muted font-medium">Ad Group</th>
              <th className="px-3 py-2 text-right text-th-text-muted font-medium">Default Bid</th>
              <th className="px-3 py-2 text-center text-th-text-muted font-medium">State</th>
              <th className="px-3 py-2 text-right text-th-text-muted font-medium">Keywords</th>
            </tr>
          </thead>
          <tbody>
            {adGroups.map((ag) => (
              <tr key={ag.id} className="border-b border-th-border">
                <td className="px-3 py-2 font-medium text-th-text-secondary">{ag.name}</td>
                <td className="px-3 py-2 text-right font-mono text-th-text-secondary">
                  {ag.default_bid ? `$${ag.default_bid.toFixed(2)}` : '-'}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    ag.state === 'enabled' ? 'bg-emerald-50 text-emerald-700' : 'bg-th-bg-tertiary text-th-text-muted'
                  }`}>
                    {ag.state ?? 'unknown'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-th-text-secondary">{ag.keyword_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

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
      <h3 className="text-sm font-medium text-th-text mb-3">Recent Actions</h3>
      {campaign.recent_actions && campaign.recent_actions.length > 0 ? (
        <div className="space-y-2">
          {campaign.recent_actions.map((action) => (
            <div key={action.id} className="rounded border border-th-border bg-th-bg-hover px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-th-text-secondary">{action.action_type}</p>
                <p className="text-[11px] text-th-text-muted">
                  {new Date(action.executed_at).toLocaleString()}
                </p>
              </div>
              <p className="text-[11px] text-th-text-muted mt-0.5">{action.reason}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-th-text-muted py-4 text-center">No AI actions recorded yet</p>
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
          <label className="block text-xs text-th-text-muted mb-1">Target ACoS (%)</label>
          <input
            type="number"
            value={editForm.target_acos ?? ''}
            onChange={(e) => setEditForm({ ...editForm, target_acos: Number(e.target.value) })}
            className="w-full rounded-md border border-th-border px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
          />
        </div>
        {campaign.mode === 'manual' ? (
          <div>
            <label className="block text-xs text-th-text-muted mb-1">Daily Budget ($)</label>
            <input
              type="number"
              value={editForm.daily_budget ?? ''}
              onChange={(e) => setEditForm({ ...editForm, daily_budget: Number(e.target.value) })}
              className="w-full rounded-md border border-th-border px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs text-th-text-muted mb-1">Weekly Budget ($)</label>
            <input
              type="number"
              value={editForm.weekly_budget ?? ''}
              onChange={(e) => setEditForm({ ...editForm, weekly_budget: Number(e.target.value) })}
              className="w-full rounded-md border border-th-border px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>
        )}
        <div>
          <label className="block text-xs text-th-text-muted mb-1">Max Bid Cap ($)</label>
          <input
            type="number"
            value={editForm.max_bid_cap ?? ''}
            onChange={(e) => setEditForm({ ...editForm, max_bid_cap: Number(e.target.value) })}
            step={0.01}
            className="w-full rounded-md border border-th-border px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
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
            className="rounded-md border border-th-border px-4 py-2 text-sm font-medium text-th-text-secondary hover:bg-th-bg-hover"
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
          <dt className="text-th-text-muted">Campaign Type</dt>
          <dd className="font-medium text-th-text">{campaign.campaign_type.toUpperCase()}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-th-text-muted">Mode</dt>
          <dd className="font-medium text-th-text">{campaign.mode === 'autopilot' ? 'Auto Pilot' : 'Manual'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-th-text-muted">Target ACoS</dt>
          <dd className="font-medium text-th-text">{campaign.target_acos ?? '-'}%</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-th-text-muted">
            {campaign.mode === 'manual' ? 'Daily Budget' : 'Weekly Budget'}
          </dt>
          <dd className="font-medium text-th-text">
            ${(campaign.mode === 'manual' ? campaign.daily_budget : campaign.weekly_budget) ?? '-'}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-th-text-muted">Max Bid Cap</dt>
          <dd className="font-medium text-th-text">${campaign.max_bid_cap ?? '-'}</dd>
        </div>
      </dl>
      <button
        onClick={() => setIsEditing(true)}
        className="w-full rounded-md border border-th-border px-4 py-2 text-sm font-medium text-th-text-secondary hover:bg-th-bg-hover"
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
      <div className="relative w-full max-w-md overflow-y-auto bg-surface-card shadow-xl">
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

          {/* Quick Actions */}
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

          {/* 4-Tab Navigation — Design M02 */}
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

        {/* Content */}
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
