'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/useToast'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type MonitoringSettingsProps = {
  isAdmin: boolean
}

const CHECKS_OPTIONS = [
  { value: 1, label: 'Once daily' },
  { value: 2, label: 'Twice daily' },
  { value: 3, label: '3 times daily' },
  { value: 4, label: '4 times daily' },
]

export const MonitoringSettings = ({ isAdmin }: MonitoringSettingsProps) => {
  const { addToast } = useToast()
  const [brChecksPerDay, setBrChecksPerDay] = useState(2)
  const [brMaxMonitoringDays, setBrMaxMonitoringDays] = useState(90)
  const [cloneThresholdDays, setCloneThresholdDays] = useState(14)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings/monitoring')
      .then((res) => res.json())
      .then((data) => {
        if (data.br_checks_per_day) setBrChecksPerDay(data.br_checks_per_day)
        // Fallback for legacy key
        if (data.br_max_monitoring_days) setBrMaxMonitoringDays(data.br_max_monitoring_days)
        else if (data.monitoring_max_days) setBrMaxMonitoringDays(data.monitoring_max_days)
        if (data.clone_threshold_days) setCloneThresholdDays(data.clone_threshold_days)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/settings/monitoring', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          br_checks_per_day: brChecksPerDay,
          br_max_monitoring_days: brMaxMonitoringDays,
          clone_threshold_days: cloneThresholdDays,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Save failed')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-th-text">BR Monitoring</h2>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="space-y-4">
            <div className="h-10 rounded-lg bg-th-bg-secondary animate-pulse" />
            <div className="h-10 rounded-lg bg-th-bg-secondary animate-pulse" />
            <div className="h-10 rounded-lg bg-th-bg-secondary animate-pulse" />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-th-text-secondary mb-1">
                BR Case Checks Per Day
              </label>
              <select
                value={brChecksPerDay}
                onChange={(e) => setBrChecksPerDay(Number(e.target.value))}
                disabled={!isAdmin}
                className="w-full rounded-lg border border-th-border bg-th-bg-secondary px-3 py-2 text-sm text-th-text focus:border-th-accent focus:outline-none disabled:opacity-50"
              >
                {CHECKS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-th-text-muted">
                How often the crawler checks BR case status per day.
              </p>
            </div>

            <Input
              label="Max Monitoring Days"
              type="number"
              min={7}
              max={365}
              value={brMaxMonitoringDays}
              onChange={(e) => setBrMaxMonitoringDays(Number(e.target.value))}
              disabled={!isAdmin}
            />
            <p className="-mt-3 text-xs text-th-text-muted">
              Auto-close as &quot;unresolved&quot; after this many days.
            </p>

            <Input
              label="Clone Suggestion Threshold (days)"
              type="number"
              min={7}
              max={60}
              value={cloneThresholdDays}
              onChange={(e) => setCloneThresholdDays(Number(e.target.value))}
              disabled={!isAdmin}
            />
            <p className="-mt-3 text-xs text-th-text-muted">
              Show &quot;Clone suggested&quot; badge after this many days without resolution.
            </p>

            {isAdmin && (
              <div className="flex items-center gap-3">
                <Button size="sm" loading={saving} onClick={handleSave}>
                  Save
                </Button>
                {saved && (
                  <span className="text-sm text-green-500">Saved</span>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
