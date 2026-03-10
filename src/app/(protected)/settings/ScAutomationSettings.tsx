'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { useToast } from '@/hooks/useToast'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'

type ScAutomationSettingsProps = {
  isAdmin: boolean
}

type SettingsData = {
  auto_submit_enabled: boolean
  default_countdown_seconds: number
  default_min_delay_sec: number
  default_max_delay_sec: number
}

type ResubmitSettingsData = {
  interval_days: number
  max_count: number
  auto_strengthen: boolean
}

const DELAY_OPTIONS = [
  { min: 5, max: 10, label: '5~10s' },
  { min: 10, max: 20, label: '10~20s' },
  { min: 20, max: 30, label: '20~30s' },
  { min: 30, max: 60, label: '30~60s' },
] as const

export const ScAutomationSettings = ({ isAdmin }: ScAutomationSettingsProps) => {
  const { t } = useI18n()
  const { addToast } = useToast()
  const [settings, setSettings] = useState<SettingsData>({
    auto_submit_enabled: false,
    default_countdown_seconds: 3,
    default_min_delay_sec: 5,
    default_max_delay_sec: 10,
  })
  const [resubmitSettings, setResubmitSettings] = useState<ResubmitSettingsData>({
    interval_days: 7,
    max_count: 3,
    auto_strengthen: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/pd-automation')
        .then((res) => res.json())
        .then((data: Partial<SettingsData>) => setSettings((prev) => ({ ...prev, ...data }))),
      fetch('/api/settings/resubmit-defaults')
        .then((res) => res.json())
        .then((data: Partial<ResubmitSettingsData>) => setResubmitSettings((prev) => ({ ...prev, ...data }))),
    ])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const [scRes, resubRes] = await Promise.all([
        fetch('/api/settings/pd-automation', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        }),
        fetch('/api/settings/resubmit-defaults', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resubmitSettings),
        }),
      ])
      if (!scRes.ok || !resubRes.ok) {
        throw new Error('Save failed')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setSaving(false)
    }
  }

  const selectedDelay = DELAY_OPTIONS.find((o) => o.min === settings.default_min_delay_sec)
    ?? DELAY_OPTIONS[0]

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-5 w-48 rounded bg-th-bg-secondary animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-10 rounded-lg bg-th-bg-secondary animate-pulse" />
            <div className="h-10 rounded-lg bg-th-bg-secondary animate-pulse" />
            <div className="h-10 rounded-lg bg-th-bg-secondary animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-5 w-48 rounded bg-th-bg-secondary animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-10 rounded-lg bg-th-bg-secondary animate-pulse" />
            <div className="h-10 rounded-lg bg-th-bg-secondary animate-pulse" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* PD Auto Submit */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-th-text">
            {t('settings.scAutomation.title' as Parameters<typeof t>[0])}
          </h2>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-th-text-muted">
            {t('settings.scAutomation.description' as Parameters<typeof t>[0])}
          </p>

          <Toggle
            checked={settings.auto_submit_enabled}
            onChange={(checked) => setSettings((s) => ({ ...s, auto_submit_enabled: checked }))}
            disabled={!isAdmin}
            label={t('settings.scAutomation.enableAutoSubmit' as Parameters<typeof t>[0])}
          />

          {/* Countdown */}
          <div>
            <label className="block text-sm text-th-text-muted mb-1">
              {t('settings.scAutomation.countdown' as Parameters<typeof t>[0])}
            </label>
            <select
              value={settings.default_countdown_seconds}
              onChange={(e) => setSettings((s) => ({ ...s, default_countdown_seconds: Number(e.target.value) }))}
              disabled={!isAdmin}
              className="w-full rounded-lg border border-th-border bg-th-bg-secondary px-3 py-2 text-sm text-th-text focus:border-th-accent focus:outline-none"
            >
              <option value={3}>3 seconds</option>
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
            </select>
          </div>

          {/* Batch Delay */}
          <div>
            <label className="block text-sm text-th-text-muted mb-1">
              {t('settings.scAutomation.batchDelay' as Parameters<typeof t>[0])}
            </label>
            <select
              value={selectedDelay.min}
              onChange={(e) => {
                const opt = DELAY_OPTIONS.find((o) => o.min === Number(e.target.value)) ?? DELAY_OPTIONS[0]
                setSettings((s) => ({
                  ...s,
                  default_min_delay_sec: opt.min,
                  default_max_delay_sec: opt.max,
                }))
              }}
              disabled={!isAdmin}
              className="w-full rounded-lg border border-th-border bg-th-bg-secondary px-3 py-2 text-sm text-th-text focus:border-th-accent focus:outline-none"
            >
              {DELAY_OPTIONS.map((opt) => (
                <option key={opt.min} value={opt.min}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-th-text-muted">
            {t('settings.scAutomation.note' as Parameters<typeof t>[0])}
          </p>
        </CardContent>
      </Card>

      {/* Auto Resubmit Settings */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-th-text">
            {t('settings.scAutomation.resubmitTitle' as Parameters<typeof t>[0])}
          </h2>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-th-text-muted">
            {t('settings.scAutomation.resubmitDesc' as Parameters<typeof t>[0])}
          </p>

          {/* Interval Days */}
          <div>
            <label className="block text-sm text-th-text-muted mb-1">
              {t('settings.scAutomation.defaultIntervalDays' as Parameters<typeof t>[0])}
            </label>
            <input
              type="number"
              min={3}
              max={30}
              value={resubmitSettings.interval_days}
              onChange={(e) => setResubmitSettings((s) => ({ ...s, interval_days: Number(e.target.value) }))}
              disabled={!isAdmin}
              className="w-32 rounded-lg border border-th-border bg-th-bg-secondary px-3 py-2 text-sm text-th-text focus:border-th-accent focus:outline-none"
            />
          </div>

          {/* Max Count */}
          <div>
            <label className="block text-sm text-th-text-muted mb-1">
              {t('settings.scAutomation.maxResubmitCount' as Parameters<typeof t>[0])}
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={resubmitSettings.max_count}
              onChange={(e) => setResubmitSettings((s) => ({ ...s, max_count: Number(e.target.value) }))}
              disabled={!isAdmin}
              className="w-32 rounded-lg border border-th-border bg-th-bg-secondary px-3 py-2 text-sm text-th-text focus:border-th-accent focus:outline-none"
            />
          </div>

          {/* Auto Strengthen */}
          <Toggle
            checked={resubmitSettings.auto_strengthen}
            onChange={(checked) => setResubmitSettings((s) => ({ ...s, auto_strengthen: checked }))}
            disabled={!isAdmin}
            label={t('settings.scAutomation.autoStrengthen' as Parameters<typeof t>[0])}
          />
          <p className="text-xs text-th-text-muted">
            {t('settings.scAutomation.autoStrengthenDesc' as Parameters<typeof t>[0])}
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      {isAdmin && (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            loading={saving}
            onClick={handleSave}
          >
            {t('settings.scAutomation.save' as Parameters<typeof t>[0])}
          </Button>
          {saved && (
            <span className="text-sm text-green-500">
              {t('settings.scAutomation.saved' as Parameters<typeof t>[0])}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
