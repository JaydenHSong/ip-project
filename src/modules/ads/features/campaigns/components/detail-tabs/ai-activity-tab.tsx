'use client'

import { AiQueuePreview } from '../ai-queue-preview'
import type { CampaignDetail } from '../../types'

export const AiActivityTab = ({ campaign }: { campaign: CampaignDetail }) => (
  <div className="space-y-4">
    {campaign.brand_market_id && (
      <AiQueuePreview
        campaignId={campaign.id}
        brandMarketId={campaign.brand_market_id}
      />
    )}

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
