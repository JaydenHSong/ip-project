'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/useToast'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { BR_FORM_TYPES, BR_FORM_TYPE_CODES, type BrFormTypeCode } from '@/constants/br-form-types'

type AutoDraftConfig = {
  enabled: boolean
  types: Record<string, boolean>
}

const IP_FORM_TYPES: BrFormTypeCode[] = ['ip_violation']

export const AutoDraftSettings = ({ isAdmin }: { isAdmin: boolean }) => {
  const { addToast } = useToast()
  const [config, setConfig] = useState<AutoDraftConfig>({
    enabled: false,
    types: {},
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings/auto-draft')
      .then((res) => res.json())
      .then((data: AutoDraftConfig) => setConfig({ enabled: data.enabled, types: data.types ?? {} }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/settings/auto-draft', {
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
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setSaving(false)
    }
  }

  const brFormTypeList = BR_FORM_TYPE_CODES.map((code) => ({
    code,
    label: BR_FORM_TYPES[code].label,
    isIp: IP_FORM_TYPES.includes(code),
  }))

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-th-text">Auto Draft</h2>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="space-y-4">
            <div className="h-10 rounded-lg bg-th-bg-secondary animate-pulse" />
            <div className="h-20 rounded-lg bg-th-bg-secondary animate-pulse" />
          </div>
        ) : (
          <>
        <p className="text-sm text-th-text-muted">
          Automatically generate AI tone/manner suggestions when new reports are created with complete data.
        </p>

        <Toggle
          checked={config.enabled}
          onChange={(checked) => setConfig((s) => ({ ...s, enabled: checked }))}
          disabled={!isAdmin}
          label="Enable Auto Draft"
        />

        <div className="rounded-lg bg-th-bg-tertiary p-3">
          <p className="text-xs text-th-text-muted">
            <strong>Auto Draft runs when:</strong>
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-th-text-muted">
            <li>• ASIN is present</li>
            <li>• BR form type is selected</li>
            <li>• Screenshot is attached</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-medium text-th-text mb-3">
            Per Form Type
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {brFormTypeList.map(({ code, label, isIp }) => (
              <div key={code} className="flex items-center gap-2">
                <Toggle
                  size="sm"
                  checked={config.types[code] === true}
                  onChange={(checked) =>
                    setConfig((s) => ({
                      ...s,
                      types: { ...s.types, [code]: checked },
                    }))
                  }
                  disabled={!isAdmin}
                  label={label}
                />
                {isIp && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                    IP
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

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
