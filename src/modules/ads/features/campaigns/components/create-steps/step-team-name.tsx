'use client'

import { MarketingCodeInput } from '../marketing-code-input'
import type { FormState } from './types'

export const StepTeamName = ({
  form,
  onUpdate,
  brandMarketId,
}: {
  form: FormState
  onUpdate: (patch: Partial<FormState>) => void
  brandMarketId: string
}) => (
  <div className="space-y-4">
    <MarketingCodeInput
      brandMarketId={brandMarketId}
      value={form.marketing_code}
      onChange={(code) => onUpdate({ marketing_code: code })}
    />
    <div>
      <label className="block text-sm font-medium text-th-text-secondary mb-1">Campaign Name</label>
      <input
        type="text"
        value={form.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder="e.g. Spigen US SP - iPhone Cases"
        className="w-full rounded-md border border-th-border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
      />
      {form.marketing_code && form.name && (
        <p className="mt-2 text-xs text-th-text-muted">
          Preview: <span className="font-mono font-medium">{form.marketing_code}</span> — {form.name}
        </p>
      )}
    </div>
  </div>
)
