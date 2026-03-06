'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { VIOLATION_TYPES } from '@/constants/violations'
import type { ViolationCategory, ViolationCode } from '@/constants/violations'

type AutoApproveConfig = {
  enabled: boolean
  threshold: number
  types: Record<string, boolean>
}

const CATEGORY_ORDER: ViolationCategory[] = [
  'intellectual_property',
  'listing_content',
  'review_manipulation',
  'selling_practice',
  'regulatory_safety',
]

const IP_CATEGORIES: ViolationCategory[] = ['intellectual_property']

export const AutoApproveSettings = ({ isAdmin }: { isAdmin: boolean }) => {
  const { t } = useI18n()
  const [config, setConfig] = useState<AutoApproveConfig>({
    enabled: false,
    threshold: 90,
    types: {},
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings/auto-approve')
      .then((res) => res.json())
      .then((data: AutoApproveConfig) => setConfig(data))
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/settings/auto-approve', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
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

  const violationsByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: t(`violations.categories.${cat}` as Parameters<typeof t>[0]),
    isIp: IP_CATEGORIES.includes(cat),
    violations: Object.entries(VIOLATION_TYPES)
      .filter(([, v]) => v.category === cat)
      .map(([code, v]) => ({
        code: code as ViolationCode,
        name: t(`violations.types.${code}` as Parameters<typeof t>[0]) ?? v.name,
        codeLabel: v.code,
      })),
  }))

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-th-text">
          {t('settings.autoApprove.title' as Parameters<typeof t>[0])}
        </h2>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-th-text-muted">
          {t('settings.autoApprove.description' as Parameters<typeof t>[0])}
        </p>

        {/* Global toggle */}
        <Toggle
          checked={config.enabled}
          onChange={(checked) => setConfig((s) => ({ ...s, enabled: checked }))}
          disabled={!isAdmin}
          label={t('settings.autoApprove.enableAutoApprove' as Parameters<typeof t>[0])}
        />

        {/* Threshold slider */}
        <div>
          <label className="block text-sm text-th-text-muted mb-1">
            {t('settings.autoApprove.threshold' as Parameters<typeof t>[0])}: {config.threshold}%
          </label>
          <input
            type="range"
            min={50}
            max={100}
            step={5}
            value={config.threshold}
            onChange={(e) => setConfig((s) => ({ ...s, threshold: Number(e.target.value) }))}
            disabled={!isAdmin}
            className="w-full accent-th-accent"
          />
          <p className="text-xs text-th-text-muted mt-1">
            {t('settings.autoApprove.thresholdDesc' as Parameters<typeof t>[0])}
          </p>
        </div>

        {/* Violation type toggles */}
        <div>
          <h3 className="text-sm font-medium text-th-text mb-3">
            {t('settings.autoApprove.violationTypes' as Parameters<typeof t>[0])}
          </h3>

          <div className="space-y-5">
            {violationsByCategory.map(({ category, label, isIp, violations }) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-th-text-secondary">
                    {label}
                  </span>
                  {isIp && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                      {t('settings.autoApprove.ipWarning' as Parameters<typeof t>[0])}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-1">
                  {violations.map(({ code, name, codeLabel }) => (
                    <Toggle
                      key={code}
                      size="sm"
                      checked={config.types[code] === true}
                      onChange={(checked) =>
                        setConfig((s) => ({
                          ...s,
                          types: { ...s.types, [code]: checked },
                        }))
                      }
                      disabled={!isAdmin}
                      label={`${codeLabel} ${name}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <Button size="sm" loading={saving} onClick={handleSave}>
              {t('settings.autoApprove.save' as Parameters<typeof t>[0])}
            </Button>
            {saved && (
              <span className="text-sm text-green-500">
                {t('settings.autoApprove.saved' as Parameters<typeof t>[0])}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
