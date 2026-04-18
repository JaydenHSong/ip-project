'use client'

import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import { ProgressBar } from '@/modules/ads/shared/components/progress-bar'
import { AiQueuePreview } from '../ai-queue-preview'
import type { CampaignDetail } from '../../types'

export const OverviewTab = ({ campaign }: { campaign: CampaignDetail }) => {
  const metrics = campaign.metrics_7d
  const budget = campaign.mode === 'manual' ? campaign.daily_budget : campaign.weekly_budget
  const spent = metrics?.spend ?? 0
  const pacingPct = budget ? (spent / budget) * 100 : 0

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-th-text-muted">Last 7 Days</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <KpiCard label="Spend" value={metrics ? `$${metrics.spend.toFixed(2)}` : '-'} />
          <KpiCard label="Sales" value={metrics ? `$${metrics.sales.toFixed(2)}` : '-'} />
          <KpiCard label="ACoS" value={metrics?.acos != null ? `${metrics.acos.toFixed(1)}%` : '-'} />
          <KpiCard label="ROAS" value={metrics?.roas != null ? `${metrics.roas.toFixed(2)}x` : '-'} />
          <KpiCard label="Orders" value={metrics?.orders ?? 0} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-lg border border-th-border bg-surface-card p-3">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-th-text-muted">Budget Pacing</h3>
          <div className="mt-2">
            <div className="mb-1 flex justify-between text-[11px] text-th-text-muted">
              <span>${spent.toFixed(0)} spent</span>
              <span>${budget ?? 0} {campaign.mode === 'manual' ? '/day' : '/week'}</span>
            </div>
            <ProgressBar value={pacingPct} showPercent={false} size="md" />
          </div>
        </div>

        {campaign.confidence_score != null ? (
          <div className="rounded-lg border border-th-border bg-surface-card p-3">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-th-text-muted">AI Confidence</h3>
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-[11px]">
                <span className="text-th-text-muted">Model confidence</span>
                <span className="font-medium text-th-text">{campaign.confidence_score}%</span>
              </div>
              <ProgressBar value={campaign.confidence_score} showPercent={false} />
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-th-text-muted">Structure</h3>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded border border-th-border bg-th-bg-hover p-3">
            <dt className="text-[11px] text-th-text-muted">Keywords</dt>
            <dd className="text-lg font-semibold text-th-text">{campaign.keywords_count ?? 0}</dd>
          </div>
          <div className="rounded border border-th-border bg-th-bg-hover p-3">
            <dt className="text-[11px] text-th-text-muted">Ad Groups</dt>
            <dd className="text-lg font-semibold text-th-text">{campaign.ad_groups_count ?? 0}</dd>
          </div>
        </dl>
      </div>

      {campaign.brand_market_id && (
        <AiQueuePreview
          campaignId={campaign.id}
          brandMarketId={campaign.brand_market_id}
          maxItems={2}
        />
      )}

      <div className="border-t border-th-border pt-4">
        <dl className="space-y-1.5 text-[11px] text-th-text-muted">
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
