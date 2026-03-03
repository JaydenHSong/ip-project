'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

type ScAutomationSettingsProps = {
  isAdmin: boolean
}

type SettingsData = {
  auto_submit_enabled: boolean
  default_countdown_seconds: number
  default_min_delay_sec: number
  default_max_delay_sec: number
}

const DELAY_OPTIONS = [
  { min: 30, max: 60, label: '30~60s' },
  { min: 60, max: 90, label: '60~90s' },
  { min: 90, max: 120, label: '90~120s' },
] as const

export const ScAutomationSettings = ({ isAdmin }: ScAutomationSettingsProps) => {
  const { t } = useI18n()
  const [settings, setSettings] = useState<SettingsData>({
    auto_submit_enabled: false,
    default_countdown_seconds: 3,
    default_min_delay_sec: 30,
    default_max_delay_sec: 60,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings/sc-automation')
      .then((res) => res.json())
      .then((data: SettingsData) => setSettings(data))
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/settings/sc-automation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Save failed')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const selectedDelay = DELAY_OPTIONS.find((o) => o.min === settings.default_min_delay_sec)
    ?? DELAY_OPTIONS[0]

  return (
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

        {/* Auto Submit 토글 */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.auto_submit_enabled}
            onChange={(e) => setSettings((s) => ({ ...s, auto_submit_enabled: e.target.checked }))}
            disabled={!isAdmin}
            className="h-4 w-4 rounded border-th-border text-th-accent focus:ring-th-accent"
          />
          <span className="text-sm text-th-text">
            {t('settings.scAutomation.enableAutoSubmit' as Parameters<typeof t>[0])}
          </span>
        </label>

        {/* Countdown 선택 */}
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

        {/* Batch Delay 선택 */}
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
      </CardContent>
    </Card>
  )
}
