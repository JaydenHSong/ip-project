'use client'

import type { FormState } from './types'

export const StepReview = ({ form }: { form: FormState }) => (
  <div className="space-y-4">
    <div className="rounded-lg border border-th-border bg-th-bg-hover p-4">
      <h4 className="text-sm font-semibold text-th-text mb-3">Campaign Summary</h4>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-th-text-muted">Marketing Code</dt>
        <dd className="font-mono font-medium text-th-text">{form.marketing_code || '-'}</dd>
        <dt className="text-th-text-muted">Name</dt>
        <dd className="font-medium text-th-text truncate">{form.name || '-'}</dd>
        <dt className="text-th-text-muted">Mode</dt>
        <dd className="font-medium text-th-text">{form.mode === 'autopilot' ? 'Auto Pilot' : 'Manual'}</dd>
        {form.mode === 'manual' && (
          <>
            <dt className="text-th-text-muted">Type</dt>
            <dd className="font-medium text-th-text">{form.campaign_type.toUpperCase()}</dd>
          </>
        )}
        <dt className="text-th-text-muted">Target ACoS</dt>
        <dd className="font-medium text-th-text">{form.target_acos}%</dd>
        <dt className="text-th-text-muted">Budget</dt>
        <dd className="font-medium text-th-text">
          ${form.mode === 'manual' ? `${form.daily_budget}/day` : `${form.weekly_budget}/week`}
        </dd>
        <dt className="text-th-text-muted">Max Bid Cap</dt>
        <dd className="font-medium text-th-text">${form.max_bid_cap}</dd>
        {form.mode === 'manual' && (
          <>
            <dt className="text-th-text-muted">Keywords</dt>
            <dd className="font-medium text-th-text">{form.keywords.length}</dd>
          </>
        )}
      </dl>
    </div>

    {form.mode === 'autopilot' && (
      <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
        <p className="text-xs text-orange-700">
          <span className="font-medium">Auto Pilot mode is permanent.</span> AI will begin optimizing after launch.
          Initial learning period is approximately 7-14 days.
        </p>
      </div>
    )}

    {form.keywords.length > 0 && (
      <div className="rounded-lg border border-th-border p-4">
        <h4 className="text-sm font-semibold text-th-text mb-2">Keywords ({form.keywords.length})</h4>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {form.keywords.map((kw, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-th-text-secondary">{kw.text} <span className="text-th-text-muted">({kw.match_type})</span></span>
              <span className="font-mono text-th-text-muted">${kw.bid.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)
