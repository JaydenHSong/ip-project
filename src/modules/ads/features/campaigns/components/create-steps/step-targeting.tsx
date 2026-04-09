'use client'

import { KeywordInput } from '../keyword-input'
import type { FormState } from './types'

export const StepTypeTargeting = ({
  form,
  onUpdate,
}: {
  form: FormState
  onUpdate: (patch: Partial<FormState>) => void
}) => (
  <div className="space-y-4">
    {/* Campaign Type */}
    <div>
      <label className="block text-sm font-medium text-th-text-secondary mb-2">Campaign Type</label>
      <div className="grid grid-cols-3 gap-3">
        {(['sp', 'sb', 'sd'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onUpdate({ campaign_type: type })}
            className={`rounded-lg border-2 p-3 text-center transition-colors ${
              form.campaign_type === type
                ? 'border-orange-500 bg-orange-50'
                : 'border-th-border hover:border-th-border'
            }`}
          >
            <p className="text-sm font-semibold text-th-text">{type.toUpperCase()}</p>
            <p className="mt-0.5 text-[11px] text-th-text-muted">
              {type === 'sp' ? 'Sponsored Products' : type === 'sb' ? 'Sponsored Brands' : 'Sponsored Display'}
            </p>
          </button>
        ))}
      </div>
    </div>

    {/* Budget + ACoS */}
    <div className="grid grid-cols-3 gap-3">
      <div>
        <label className="block text-xs text-th-text-muted mb-1">Target ACoS (%)</label>
        <input
          type="number"
          value={form.target_acos}
          onChange={(e) => onUpdate({ target_acos: Number(e.target.value) })}
          min={1} max={100}
          className="w-full rounded-md border border-th-border px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs text-th-text-muted mb-1">Daily Budget ($)</label>
        <input
          type="number"
          value={form.daily_budget}
          onChange={(e) => onUpdate({ daily_budget: Number(e.target.value) })}
          min={1}
          className="w-full rounded-md border border-th-border px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs text-th-text-muted mb-1">Max Bid Cap ($)</label>
        <input
          type="number"
          value={form.max_bid_cap}
          onChange={(e) => onUpdate({ max_bid_cap: Number(e.target.value) })}
          min={0.02} step={0.01}
          className="w-full rounded-md border border-th-border px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
        />
      </div>
    </div>

    {/* Targeting */}
    <div>
      <div className="flex gap-2 mb-2">
        {(['keyword', 'product'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onUpdate({ targeting_type: t })}
            className={`rounded-md border px-3 py-1 text-xs transition-colors ${
              form.targeting_type === t
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-th-border text-th-text-secondary hover:border-th-border'
            }`}
          >
            {t === 'keyword' ? 'Keyword' : 'Product'} Targeting
          </button>
        ))}
      </div>

      {form.targeting_type === 'keyword' && (
        <KeywordInput
          keywords={form.keywords}
          onChange={(keywords) => onUpdate({ keywords })}
        />
      )}

      {form.targeting_type === 'product' && (
        <div>
          <textarea
            value={form.product_asins.join('\n')}
            onChange={(e) => onUpdate({ product_asins: e.target.value.split('\n').filter(Boolean) })}
            placeholder="Enter ASINs, one per line..."
            rows={3}
            className="w-full rounded-md border border-th-border px-3 py-2 text-sm font-mono focus:border-orange-500 focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-th-text-muted">{form.product_asins.length} ASINs</p>
        </div>
      )}
    </div>
  </div>
)
