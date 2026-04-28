'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MARKETPLACE_CODES, MARKETPLACES } from '@/constants/marketplaces'
import { CAMPAIGN_FREQUENCIES } from '@/types/campaigns'
import { useI18n } from '@/lib/i18n/context'

type CampaignFormProps = {
  initialData?: {
    keyword: string
    marketplace: string
    start_date: string
    end_date: string
    frequency: string
    max_pages: number
  }
  campaignId?: string
  embedded?: boolean
  onSuccess?: () => void
}

const MARKETPLACE_OPTIONS = MARKETPLACE_CODES.map((code) => ({
  value: code,
  label: `${MARKETPLACES[code].name} (${code})`,
}))

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  every_12h: 'Every 12h',
  every_6h: 'Every 6h',
  every_3d: 'Every 3 Days',
  weekly: 'Weekly',
}

const FREQUENCY_OPTIONS = CAMPAIGN_FREQUENCIES.map((f) => ({
  value: f,
  label: FREQUENCY_LABELS[f] ?? f,
}))

export const CampaignForm = ({ initialData, campaignId, onSuccess }: CampaignFormProps) => {
  const router = useRouter()
  const { t } = useI18n()
  const isEdit = !!campaignId

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [keyword, setKeyword] = useState(initialData?.keyword ?? '')
  const [marketplace, setMarketplace] = useState(initialData?.marketplace ?? 'US')
  const [startDate, setStartDate] = useState(initialData?.start_date ?? new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(initialData?.end_date ?? '')
  const [frequency, setFrequency] = useState(initialData?.frequency ?? 'daily')
  const [maxPages, setMaxPages] = useState(initialData?.max_pages ?? 3)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const body = {
      keyword,
      marketplace,
      start_date: startDate,
      end_date: endDate || undefined,
      frequency,
      max_pages: maxPages,
    }

    const url = isEdit ? `/api/campaigns/${campaignId}` : '/api/campaigns'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error?.message ?? t('campaigns.form.failed'))
      setLoading(false)
      return
    }

    const data = await res.json()
    if (onSuccess) {
      onSuccess()
    } else {
      router.push(`/ip/campaigns/${data.id}`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-st-danger-text/30 bg-st-danger-bg px-4 py-3 text-sm text-st-danger-text">
          {error}
        </div>
      )}

      <Input
        label={t('campaigns.form.keyword')}
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="spigen case"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label={t('campaigns.form.marketplace')}
          value={marketplace}
          onChange={(e) => setMarketplace(e.target.value)}
          options={MARKETPLACE_OPTIONS}
        />
        <Select
          label={t('campaigns.form.frequency')}
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          options={FREQUENCY_OPTIONS}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('campaigns.form.startDate')}
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
        <Input
          label={t('campaigns.form.endDate')}
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <Input
        label={t('campaigns.form.maxPages')}
        type="number"
        value={String(maxPages)}
        onChange={(e) => setMaxPages(Number(e.target.value))}
        min={1}
        max={20}
      />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onSuccess ?? (() => router.back())}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? t('campaigns.form.update') : t('campaigns.form.create')}
        </Button>
      </div>
    </form>
  )
}
