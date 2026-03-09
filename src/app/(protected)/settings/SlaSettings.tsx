'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { useToast } from '@/hooks/useToast'

type SlaConfigRow = {
  violation_category: string
  expected_response_hours: number
  warning_threshold_hours: number
}

const CATEGORY_LABELS: Record<string, string> = {
  intellectual_property: 'Intellectual Property (V01~V06)',
  listing_content: 'Listing Content (V07~V11)',
  review_manipulation: 'Review Manipulation (V12~V14)',
  selling_practice: 'Selling Practice (V15~V17)',
  regulatory_safety: 'Regulatory Safety (V18~V19)',
}

const DEFAULT_CONFIGS: SlaConfigRow[] = [
  { violation_category: 'intellectual_property', expected_response_hours: 72, warning_threshold_hours: 48 },
  { violation_category: 'listing_content', expected_response_hours: 120, warning_threshold_hours: 96 },
  { violation_category: 'review_manipulation', expected_response_hours: 120, warning_threshold_hours: 96 },
  { violation_category: 'selling_practice', expected_response_hours: 120, warning_threshold_hours: 96 },
  { violation_category: 'regulatory_safety', expected_response_hours: 72, warning_threshold_hours: 48 },
]

type SlaSettingsProps = {
  isAdmin: boolean
}

export const SlaSettings = ({ isAdmin }: SlaSettingsProps) => {
  const { addToast } = useToast()
  const [configs, setConfigs] = useState<SlaConfigRow[]>(DEFAULT_CONFIGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings/sla')
      .then((res) => res.json())
      .then((data: { configs: SlaConfigRow[] }) => {
        if (data.configs && data.configs.length > 0) {
          // Merge DB configs with defaults (keep defaults for missing categories)
          const merged = DEFAULT_CONFIGS.map((dc) => {
            const found = data.configs.find((c) => c.violation_category === dc.violation_category)
            return found ?? dc
          })
          setConfigs(merged)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (index: number, field: 'expected_response_hours' | 'warning_threshold_hours', value: string) => {
    const num = parseInt(value, 10)
    if (isNaN(num)) return
    setConfigs((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: num } : c)))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/sla', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Save failed')
      }
      addToast({ type: 'success', title: 'SLA settings saved' })
    } catch (e) {
      addToast({ type: 'error', title: 'Save failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="h-5 w-5 animate-spin text-th-text-muted" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-th-text">SLA Configuration</h2>
            <p className="mt-1 text-sm text-th-text-muted">
              Set expected response times and warning thresholds per violation category.
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" loading={saving} onClick={handleSave}>
              Save
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-th-border">
                <th className="pb-3 pr-4 text-xs font-semibold text-th-text-tertiary">Violation Category</th>
                <th className="pb-3 px-4 text-xs font-semibold text-th-text-tertiary">Expected Response (hours)</th>
                <th className="pb-3 pl-4 text-xs font-semibold text-th-text-tertiary">Warning Threshold (hours)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-th-border">
              {configs.map((config, idx) => (
                <tr key={config.violation_category}>
                  <td className="py-3 pr-4 text-sm text-th-text">
                    {CATEGORY_LABELS[config.violation_category] ?? config.violation_category}
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={config.expected_response_hours}
                      onChange={(e) => handleChange(idx, 'expected_response_hours', e.target.value)}
                      disabled={!isAdmin}
                      className="w-20 rounded-md border border-th-border bg-th-bg-secondary px-2 py-1 text-sm text-th-text focus:border-th-accent focus:outline-none disabled:opacity-50"
                    />
                  </td>
                  <td className="py-3 pl-4">
                    <input
                      type="number"
                      min={1}
                      max={config.expected_response_hours}
                      value={config.warning_threshold_hours}
                      onChange={(e) => handleChange(idx, 'warning_threshold_hours', e.target.value)}
                      disabled={!isAdmin}
                      className="w-20 rounded-md border border-th-border bg-th-bg-secondary px-2 py-1 text-sm text-th-text focus:border-th-accent focus:outline-none disabled:opacity-50"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-lg bg-th-bg-tertiary p-3">
          <p className="text-xs text-th-text-muted">
            <strong>Expected Response</strong>: Time Amazon is expected to respond after case submission.
            <br />
            <strong>Warning Threshold</strong>: Time elapsed after which SLA badge turns yellow (warning state).
            <br />
            Badge turns red (breached) when the full expected response time is exceeded.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
