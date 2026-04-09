// M01 — Campaign Create Modal (4-step wizard orchestrator)
// Design Ref: §3.4 P3 — Reduced from 565→~120 LOC
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useMarketContext } from '@/modules/ads/shared/hooks/use-market-context'
import type { CreateCampaignRequest } from '../types'
import type { CampaignMode } from '@/modules/ads/shared/types'
import { INITIAL_STATE, STEPS_MANUAL, STEPS_AUTOPILOT } from './create-steps/types'
import type { FormState } from './create-steps/types'
import { StepTeamName } from './create-steps/step-team-name'
import { StepMode } from './create-steps/step-mode'
import { StepTypeTargeting } from './create-steps/step-targeting'
import { StepBudgetAP } from './create-steps/step-budget-ap'
import { StepReview } from './create-steps/step-review'

type CampaignCreateModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateCampaignRequest) => Promise<void>
  // M4 fix: caller (e.g. Autopilot page) can pre-select mode
  defaultMode?: CampaignMode
}

const CampaignCreateModal = ({ isOpen, onClose, onSubmit, defaultMode }: CampaignCreateModalProps) => {
  const { selectedMarketId } = useMarketContext()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(() =>
    defaultMode ? { ...INITIAL_STATE, mode: defaultMode } : INITIAL_STATE,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Re-apply defaultMode whenever the modal re-opens so the wizard always
  // starts in the caller-requested mode.
  useEffect(() => {
    if (isOpen && defaultMode) {
      setForm((prev) => ({ ...prev, mode: defaultMode }))
    }
  }, [isOpen, defaultMode])

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

  // H7 fix: validate every step before allowing Next.
  // Previously step 1+ always returned true, allowing empty campaigns to be submitted.
  const validateStep = (s: number): boolean => {
    if (s === 0) {
      return form.marketing_code.length === 6 && form.name.trim().length > 0
    }
    if (s === 1) {
      // Mode is preset (manual default), always valid
      return form.mode === 'manual' || form.mode === 'autopilot'
    }
    if (s === 2) {
      if (form.mode === 'manual') {
        // Manual: type + targeting + at least one keyword OR ASIN
        const hasTargets = form.targeting_type === 'keyword'
          ? form.keywords.length > 0
          : form.product_asins.length > 0
        return form.daily_budget > 0 && form.max_bid_cap > 0 && hasTargets
      }
      // Autopilot: weekly budget + target acos required
      return form.weekly_budget > 0 && form.target_acos > 0 && form.target_acos < 100
    }
    return true
  }
  const canNext = validateStep(step)

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
