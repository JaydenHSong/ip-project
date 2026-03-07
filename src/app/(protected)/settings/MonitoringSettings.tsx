'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { useToast } from '@/hooks/useToast'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type MonitoringSettingsProps = {
  isAdmin: boolean
}

export const MonitoringSettings = ({ isAdmin }: MonitoringSettingsProps) => {
  const { t } = useI18n()
  const { addToast } = useToast()
  const [intervalDays, setIntervalDays] = useState(7)
  const [maxDays, setMaxDays] = useState(90)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings/monitoring')
      .then((res) => res.json())
      .then((data) => {
        if (data.monitoring_interval_days) setIntervalDays(data.monitoring_interval_days)
        if (data.monitoring_max_days) setMaxDays(data.monitoring_max_days)
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/settings/monitoring', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monitoring_interval_days: intervalDays,
          monitoring_max_days: maxDays,
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
        <h2 className="font-semibold text-th-text">{t('settings.monitoring.title' as Parameters<typeof t>[0])}</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          label={t('settings.monitoring.intervalDays' as Parameters<typeof t>[0])}
          type="number"
          min={1}
          max={30}
          value={intervalDays}
          onChange={(e) => setIntervalDays(Number(e.target.value))}
          disabled={!isAdmin}
        />
        <Input
          label={t('settings.monitoring.maxDays' as Parameters<typeof t>[0])}
          type="number"
          min={7}
          max={365}
          value={maxDays}
          onChange={(e) => setMaxDays(Number(e.target.value))}
          disabled={!isAdmin}
        />
        {isAdmin && (
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              loading={saving}
              onClick={handleSave}
            >
              {t('settings.monitoring.save' as Parameters<typeof t>[0])}
            </Button>
            {saved && (
              <span className="text-sm text-green-500">{t('settings.monitoring.saved' as Parameters<typeof t>[0])}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
