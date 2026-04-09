'use client'

import type { FormState } from './types'

export const StepBudgetAP = ({
  form,
  onUpdate,
}: {
  form: FormState
  onUpdate: (patch: Partial<FormState>) => void
}) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-th-text-secondary mb-1">Target ACoS (%)</label>
      <input
        type="number"
        value={form.target_acos}
        onChange={(e) => onUpdate({ target_acos: Number(e.target.value) })}
        min={1} max={100}
        className="w-full rounded-md border border-th-border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
      />
      <p className="mt-1 text-xs text-th-text-muted">AI will optimize towards this target</p>
    </div>
    <div>
      <label className="block text-sm font-medium text-th-text-secondary mb-1">Weekly Budget ($)</label>
      <input
        type="number"
        value={form.weekly_budget}
        onChange={(e) => onUpdate({ weekly_budget: Number(e.target.value) })}
        min={7}
        className="w-full rounded-md border border-th-border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
      />
      <p className="mt-1 text-xs text-th-text-muted">AI distributes budget across days using Daily Pacing</p>
    </div>
    <div>
      <label className="block text-sm font-medium text-th-text-secondary mb-1">Max Bid Cap ($)</label>
      <input
        type="number"
        value={form.max_bid_cap}
        onChange={(e) => onUpdate({ max_bid_cap: Number(e.target.value) })}
        min={0.02} step={0.01}
        className="w-full rounded-md border border-th-border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
      />
      <p className="mt-1 text-xs text-th-text-muted">Safety cap — AI will never bid above this amount</p>
    </div>
  </div>
)
