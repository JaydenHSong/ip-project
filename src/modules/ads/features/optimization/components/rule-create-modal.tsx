// M03 — Rule Create Modal
// Design Ref: §2.1 optimization/components/rule-create-modal.tsx
'use client'

import { useState } from 'react'
import type { RuleFormData } from '../types'
import type { RuleTemplate, RunFrequency } from '@/modules/ads/shared/types'

type RuleCreateModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: RuleFormData) => Promise<void>
}

const TEMPLATES: { key: RuleTemplate; label: string; description: string }[] = [
  { key: 'high_acos_pause', label: 'High ACoS Pause', description: 'Pause keywords with ACoS above threshold' },
  { key: 'winner_promote', label: 'Winner Promote', description: 'Promote converting search terms to exact match' },
  { key: 'low_ctr_negate', label: 'Low CTR Negate', description: 'Negate keywords with low click-through rate' },
  { key: 'budget_guard', label: 'Budget Guard', description: 'Alert when daily spend exceeds threshold' },
  { key: 'custom', label: 'Custom Rule', description: 'Define your own condition and action' },
]

const RuleCreateModal = ({ isOpen, onClose, onSubmit }: RuleCreateModalProps) => {
  const [form, setForm] = useState<RuleFormData>({
    name: '',
    template: 'high_acos_pause',
    condition_metric: 'acos',
    condition_operator: '>',
    condition_value: 50,
    action: 'pause_keyword',
    action_params: {},
    scope: 'all',
    scope_campaign_ids: [],
    look_back_days: 7,
    run_frequency: 'daily',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulateResult, setSimulateResult] = useState<{
    affected_campaigns: number
    matched_keywords: number
    estimated_impact: string
  } | null>(null)

  if (!isOpen) return null

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit(form)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSimulate = async () => {
    setIsSimulating(true)
    setSimulateResult(null)
    try {
      const res = await fetch('/api/ads/rules/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: form.template,
          condition_metric: form.condition_metric,
          condition_operator: form.condition_operator,
          condition_value: form.condition_value,
          scope: form.scope,
          scope_campaign_ids: form.scope_campaign_ids,
          look_back_days: form.look_back_days,
        }),
      })
      if (res.ok) {
        const json = await res.json() as { data: { affected_campaigns: number; matched_keywords: number; estimated_impact: string } }
        setSimulateResult(json.data)
      }
    } catch { /* silent */ }
    finally { setIsSimulating(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Create Rule</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <div className="space-y-4 px-6 py-5 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
            <div className="space-y-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setForm({ ...form, template: t.key })}
                  className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                    form.template === t.key ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">{t.label}</p>
                  <p className="text-xs text-gray-500">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Metric</label>
              <select
                value={form.condition_metric}
                onChange={(e) => setForm({ ...form, condition_metric: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="acos">ACoS</option>
                <option value="ctr">CTR</option>
                <option value="spend">Spend</option>
                <option value="orders">Orders</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Operator</label>
              <select
                value={form.condition_operator}
                onChange={(e) => setForm({ ...form, condition_operator: e.target.value as RuleFormData['condition_operator'] })}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Value</label>
              <input
                type="number"
                value={form.condition_value}
                onChange={(e) => setForm({ ...form, condition_value: Number(e.target.value) })}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Look-back</label>
              <select
                value={form.look_back_days}
                onChange={(e) => setForm({ ...form, look_back_days: Number(e.target.value) })}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Frequency</label>
              <select
                value={form.run_frequency}
                onChange={(e) => setForm({ ...form, run_frequency: e.target.value as RunFrequency })}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Simulate Result */}
        {simulateResult && (
          <div className="mx-6 mb-2 rounded-md border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-700 mb-1">Simulation Result</p>
            <div className="flex gap-4 text-xs">
              <div>
                <span className="text-gray-500">Campaigns affected: </span>
                <span className="font-semibold text-gray-900">{simulateResult.affected_campaigns}</span>
              </div>
              <div>
                <span className="text-gray-500">Keywords matched: </span>
                <span className="font-semibold text-gray-900">{simulateResult.matched_keywords}</span>
              </div>
              <div>
                <span className="text-gray-500">Est. impact: </span>
                <span className="font-semibold text-orange-600">{simulateResult.estimated_impact}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <div className="flex gap-2">
            {/* Simulate — Design M03: "[Simulate] 버튼 + results" */}
            <button
              onClick={handleSimulate}
              disabled={!form.name || isSimulating}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {isSimulating ? 'Simulating...' : 'Simulate'}
            </button>
            <button onClick={handleSubmit} disabled={!form.name || isSubmitting} className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50">
              {isSubmitting ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { RuleCreateModal }
