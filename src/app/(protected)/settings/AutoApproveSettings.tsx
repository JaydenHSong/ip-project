'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { VIOLATION_TYPES, VIOLATION_CATEGORIES } from '@/constants/violations'
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

const CATEGORY_LABELS: Record<ViolationCategory, { en: string; ko: string }> = {
  intellectual_property: { en: 'Intellectual Property', ko: '지적재산권 침해' },
  listing_content: { en: 'Listing Content', ko: '리스팅 콘텐츠' },
  review_manipulation: { en: 'Review Manipulation', ko: '리뷰 조작' },
  selling_practice: { en: 'Selling Practices', ko: '판매 관행' },
  regulatory_safety: { en: 'Regulatory / Safety', ko: '규제/안전' },
}

const IP_CATEGORIES: ViolationCategory[] = ['intellectual_property']

export const AutoApproveSettings = ({ isAdmin }: { isAdmin: boolean }) => {
  const { t, locale } = useI18n()
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
    label: locale === 'ko' ? CATEGORY_LABELS[cat].ko : CATEGORY_LABELS[cat].en,
    isIp: IP_CATEGORIES.includes(cat),
    violations: Object.entries(VIOLATION_TYPES)
      .filter(([, v]) => v.category === cat)
      .map(([code, v]) => ({ code: code as ViolationCode, name: v.name, codeLabel: v.code })),
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
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig((s) => ({ ...s, enabled: e.target.checked }))}
            disabled={!isAdmin}
            className="h-4 w-4 rounded border-th-border text-th-accent focus:ring-th-accent"
          />
          <span className="text-sm text-th-text">
            {t('settings.autoApprove.enableAutoApprove' as Parameters<typeof t>[0])}
          </span>
        </label>

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

        {/* Violation type checkboxes */}
        <div>
          <h3 className="text-sm font-medium text-th-text mb-3">
            {t('settings.autoApprove.violationTypes' as Parameters<typeof t>[0])}
          </h3>

          <div className="space-y-4">
            {violationsByCategory.map(({ category, label, isIp, violations }) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-th-text-secondary uppercase">
                    {label}
                  </span>
                  {isIp && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                      {t('settings.autoApprove.ipWarning' as Parameters<typeof t>[0])}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-2">
                  {violations.map(({ code, name, codeLabel }) => (
                    <label key={code} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.types[code] === true}
                        onChange={(e) =>
                          setConfig((s) => ({
                            ...s,
                            types: { ...s.types, [code]: e.target.checked },
                          }))
                        }
                        disabled={!isAdmin}
                        className="h-3.5 w-3.5 rounded border-th-border text-th-accent focus:ring-th-accent"
                      />
                      <span className="text-sm text-th-text">
                        {codeLabel} {name}
                      </span>
                    </label>
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
