'use client'

import type { FormState } from './types'

export const StepMode = ({
  form,
  onUpdate,
}: {
  form: FormState
  onUpdate: (patch: Partial<FormState>) => void
}) => (
  <div className="space-y-4">
    <label className="block text-sm font-medium text-th-text-secondary mb-2">Campaign Mode</label>
    <div className="grid grid-cols-1 gap-3">
      <button
        type="button"
        onClick={() => onUpdate({ mode: 'manual' })}
        className={`rounded-lg border-2 p-4 text-left transition-colors ${
          form.mode === 'manual'
            ? 'border-orange-500 bg-orange-50'
            : 'border-th-border hover:border-th-border'
        }`}
      >
        <p className="text-sm font-semibold text-th-text">Manual</p>
        <p className="mt-1 text-xs text-th-text-muted">
          You control all campaign settings — bids, budgets, keywords, and scheduling.
        </p>
      </button>

      <button
        type="button"
        onClick={() => onUpdate({ mode: 'autopilot' })}
        className={`rounded-lg border-2 p-4 text-left transition-colors ${
          form.mode === 'autopilot'
            ? 'border-orange-500 bg-orange-50'
            : 'border-th-border hover:border-th-border'
        }`}
      >
        <p className="text-sm font-semibold text-th-text">Auto Pilot</p>
        <p className="mt-1 text-xs text-th-text-muted">
          AI manages bids, budgets, and keywords automatically based on your target ACoS.
        </p>
      </button>
    </div>

    {form.mode === 'autopilot' && (
      <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
        <div className="flex items-start gap-2">
          <span className="text-orange-500 text-sm mt-0.5">&#9888;</span>
          <div>
            <p className="text-sm font-medium text-orange-800">Permanent Mode</p>
            <p className="mt-0.5 text-xs text-orange-700">
              Once launched as Auto Pilot, this campaign cannot be switched to Manual mode.
              AI will automatically manage bids, budgets, and keyword changes.
              You can pause or archive, but not revert to manual control.
            </p>
          </div>
        </div>
      </div>
    )}
  </div>
)
