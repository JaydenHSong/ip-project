// M01 — Campaign Create Modal (4-step wizard)
// Design Ref: §5.3 M01a-d, §8 Test Plan
// Steps per Design:
//   M01a: Team + Brand/Market + 6자리 코드 + Name
//   M01b: Mode (Manual vs Auto Pilot + Permanent 경고)
//   M01c/M01c-AP: Type/Targeting/Budget
//   M01d/M01d-AP: Keywords/Review
'use client'

import { useState, useCallback } from 'react'
import { useMarketContext } from '@/modules/ads/shared/hooks/use-market-context'
import { MarketingCodeInput } from './marketing-code-input'
import type { CampaignType, CampaignMode, MatchType } from '@/modules/ads/shared/types'
import type { CreateCampaignRequest } from '../types'

type CampaignCreateModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateCampaignRequest) => Promise<void>
}

type KeywordEntry = {
  text: string
  match_type: MatchType
  bid: number
}

type FormState = {
  campaign_type: CampaignType
  mode: CampaignMode
  marketing_code: string
  name: string
  target_acos: number
  daily_budget: number
  weekly_budget: number
  max_bid_cap: number
  targeting_type: 'keyword' | 'product'
  keywords: KeywordEntry[]
  negative_keywords: { text: string; match_type: MatchType }[]
  product_asins: string[]
}

const INITIAL_STATE: FormState = {
  campaign_type: 'sp',
  mode: 'manual',
  marketing_code: '',
  name: '',
  target_acos: 25,
  daily_budget: 50,
  weekly_budget: 350,
  max_bid_cap: 5,
  targeting_type: 'keyword',
  keywords: [],
  negative_keywords: [],
  product_asins: [],
}

const STEPS_MANUAL = ['Team & Name', 'Mode', 'Type & Targeting', 'Review'] as const
const STEPS_AUTOPILOT = ['Team & Name', 'Mode', 'Budget', 'Review'] as const

// ─── Step 1 (M01a): Team + Brand/Market + Code + Name ───

const StepTeamName = ({
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

// ─── Step 2 (M01b): Mode Selection + Permanent Warning ───

const StepMode = ({
  form,
  onUpdate,
}: {
  form: FormState
  onUpdate: (patch: Partial<FormState>) => void
}) => (
  <div className="space-y-4">
    <label className="block text-sm font-medium text-th-text-secondary mb-2">Campaign Mode</label>
    <div className="grid grid-cols-1 gap-3">
      {/* Manual */}
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

      {/* Auto Pilot + Permanent Warning (Design M01b) */}
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

    {/* Permanent Warning — Design M01b: "⚠ Permanent 경고" */}
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

// ─── Step 3 Manual (M01c): Type + Targeting + Budget + Keywords ───

const StepTypeTargeting = ({
  form,
  onUpdate,
}: {
  form: FormState
  onUpdate: (patch: Partial<FormState>) => void
}) => {
  const [newKeyword, setNewKeyword] = useState('')
  const [newMatchType, setNewMatchType] = useState<MatchType>('broad')
  const [newBid, setNewBid] = useState(0.75)

  const addKeyword = () => {
    if (!newKeyword.trim()) return
    onUpdate({
      keywords: [
        ...form.keywords,
        { text: newKeyword.trim(), match_type: newMatchType, bid: newBid },
      ],
    })
    setNewKeyword('')
  }

  const removeKeyword = (index: number) => {
    onUpdate({ keywords: form.keywords.filter((_, i) => i !== index) })
  }

  return (
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

      {/* Targeting + Keywords */}
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
          <>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Enter keyword..."
                onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                className="flex-1 rounded-md border border-th-border px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
              />
              <select
                value={newMatchType}
                onChange={(e) => setNewMatchType(e.target.value as MatchType)}
                className="rounded-md border border-th-border px-2 py-1.5 text-xs"
              >
                <option value="broad">Broad</option>
                <option value="phrase">Phrase</option>
                <option value="exact">Exact</option>
              </select>
              <input
                type="number"
                value={newBid}
                onChange={(e) => setNewBid(Number(e.target.value))}
                step={0.01} min={0.02}
                className="w-16 rounded-md border border-th-border px-2 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="rounded-md bg-th-text px-3 py-1.5 text-xs font-medium text-white hover:bg-th-text"
              >
                Add
              </button>
            </div>
            {form.keywords.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {form.keywords.map((kw, i) => (
                  <div key={i} className="flex items-center justify-between rounded border border-th-border bg-th-bg-hover px-3 py-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-th-text-secondary">{kw.text}</span>
                      <span className="rounded bg-th-bg-tertiary px-1 py-0.5 text-[10px] text-th-text-secondary">{kw.match_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-th-text-muted">${kw.bid.toFixed(2)}</span>
                      <button type="button" onClick={() => removeKeyword(i)} className="text-th-text-muted hover:text-red-500 text-xs">&times;</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-1 text-[11px] text-th-text-muted">{form.keywords.length} keywords</p>
          </>
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
}

// ─── Step 3 Auto Pilot (M01c-AP): Weekly Budget Only ───

const StepBudgetAP = ({
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

// ─── Step 4 (M01d/M01d-AP): Review ───

const StepReview = ({ form }: { form: FormState }) => (
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

// ─── Main Modal ───

const CampaignCreateModal = ({ isOpen, onClose, onSubmit }: CampaignCreateModalProps) => {
  const { selectedMarketId } = useMarketContext()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const steps = form.mode === 'autopilot' ? STEPS_AUTOPILOT : STEPS_MANUAL

  const updateForm = useCallback((patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleSubmit = async () => {
    if (!selectedMarketId) return
    setIsSubmitting(true)
    try {
      await onSubmit({
        brand_market_id: selectedMarketId,
        campaign_type: form.campaign_type,
        mode: form.mode,
        marketing_code: form.marketing_code,
        name: form.name,
        target_acos: form.target_acos,
        daily_budget: form.mode === 'manual' ? form.daily_budget : undefined,
        weekly_budget: form.mode === 'autopilot' ? form.weekly_budget : undefined,
        max_bid_cap: form.max_bid_cap,
        targeting_type: form.targeting_type,
        keywords: form.keywords.length > 0 ? form.keywords : undefined,
        product_asins: form.product_asins.length > 0 ? form.product_asins : undefined,
      })
      setForm(INITIAL_STATE)
      setStep(0)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setForm(INITIAL_STATE)
    setStep(0)
    onClose()
  }

  if (!isOpen) return null

  const canNext = (() => {
    if (step === 0) return form.marketing_code.length === 6 && form.name.trim().length > 0
    return true
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      <div className="relative w-full max-w-lg rounded-xl bg-surface-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-th-border px-6 py-4">
          <h2 className="text-base font-semibold text-th-text">Create Campaign</h2>
          <button onClick={handleClose} className="text-th-text-muted hover:text-th-text-secondary">&times;</button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-6 pt-4">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                i <= step ? 'bg-orange-500 text-white' : 'bg-th-bg-tertiary text-th-text-muted'
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs ${i <= step ? 'text-th-text-secondary' : 'text-th-text-muted'}`}>{label}</span>
              {i < steps.length - 1 && <div className={`mx-1 h-px w-6 ${i < step ? 'bg-orange-500' : 'bg-th-bg-tertiary'}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {step === 0 && <StepTeamName form={form} onUpdate={updateForm} brandMarketId={selectedMarketId ?? ''} />}
          {step === 1 && <StepMode form={form} onUpdate={updateForm} />}
          {step === 2 && form.mode === 'manual' && <StepTypeTargeting form={form} onUpdate={updateForm} />}
          {step === 2 && form.mode === 'autopilot' && <StepBudgetAP form={form} onUpdate={updateForm} />}
          {step === 3 && <StepReview form={form} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-th-border px-6 py-4">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : handleClose()}
            className="rounded-md border border-th-border px-4 py-2 text-sm font-medium text-th-text-secondary hover:bg-th-bg-hover"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : form.mode === 'autopilot' ? 'Launch Campaign' : 'Create Campaign'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export { CampaignCreateModal }
