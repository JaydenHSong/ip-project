'use client'

import { useState } from 'react'
import type { CampaignDetail, UpdateCampaignRequest } from '../../types'

export const SettingsTab = ({
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
