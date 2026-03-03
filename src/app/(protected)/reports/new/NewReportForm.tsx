'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { useI18n } from '@/lib/i18n/context'
import { VIOLATION_CATEGORIES, VIOLATION_GROUPS } from '@/constants/violations'
import { MARKETPLACE_CODES, MARKETPLACES } from '@/constants/marketplaces'
import type { ViolationCategory } from '@/constants/violations'
import type { ReportTemplate } from '@/types/templates'
import { Star, FileText } from 'lucide-react'

const MARKETPLACE_OPTIONS = MARKETPLACE_CODES.map((code) => ({
  value: code,
  label: `${MARKETPLACES[code].name} (${code})`,
}))

const CATEGORY_OPTIONS = Object.entries(VIOLATION_CATEGORIES).map(([key, label]) => ({
  value: key,
  label: label as string,
}))

type NewReportFormProps = {
  embedded?: boolean
  onSuccess?: () => void
}

export const NewReportForm = ({ embedded, onSuccess }: NewReportFormProps) => {
  const router = useRouter()
  const { t } = useI18n()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateId, setDuplicateId] = useState<string | null>(null)

  // Listing fields
  const [asin, setAsin] = useState('')
  const [marketplace, setMarketplace] = useState('US')
  const [title, setTitle] = useState('')
  const [sellerName, setSellerName] = useState('')

  // Violation fields
  const [category, setCategory] = useState('')
  const [violationType, setViolationType] = useState('')
  const [note, setNote] = useState('')

  // Template suggestion
  const [suggestedTemplates, setSuggestedTemplates] = useState<ReportTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null)

  const typeOptions = category
    ? (VIOLATION_GROUPS[category as ViolationCategory] ?? []).map((v) => ({
        value: v.code,
        label: `${v.code}: ${v.name}`,
      }))
    : []

  // Fetch recommended templates when violation type changes
  const fetchSuggestedTemplates = useCallback(async (vType: string) => {
    if (!vType) {
      setSuggestedTemplates([])
      return
    }
    setLoadingTemplates(true)
    try {
      const res = await fetch(`/api/templates?violation_type=${vType}&limit=3`)
      if (res.ok) {
        const data = await res.json() as ReportTemplate[]
        setSuggestedTemplates(data)
      }
    } catch {
      setSuggestedTemplates([])
    } finally {
      setLoadingTemplates(false)
    }
  }, [])

  useEffect(() => {
    fetchSuggestedTemplates(violationType)
  }, [violationType, fetchSuggestedTemplates])

  const handleUseTemplate = (tmpl: ReportTemplate) => {
    // Simple interpolation with available fields
    let body = tmpl.body
    if (asin) body = body.replace(/\{\{ASIN\}\}/g, asin.trim().toUpperCase())
    if (title) body = body.replace(/\{\{TITLE\}\}/g, title)
    if (sellerName) body = body.replace(/\{\{SELLER\}\}/g, sellerName)
    body = body.replace(/\{\{MARKETPLACE\}\}/g, marketplace)
    body = body.replace(/\{\{TODAY\}\}/g, new Date().toLocaleDateString('en-US'))
    // Leave remaining variables as-is for user to fill
    setNote(body)
    // Track usage
    fetch(`/api/templates/${tmpl.id}/use`, { method: 'POST' }).catch(() => {})
  }

  const canSubmit = asin.trim() && category && violationType

  const handleCategoryChange = (value: string) => {
    setCategory(value)
    setViolationType('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError(null)
    setDuplicateId(null)

    try {
      const res = await fetch('/api/reports/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asin: asin.trim().toUpperCase(),
          marketplace,
          title: title.trim() || undefined,
          seller_name: sellerName.trim() || undefined,
          user_violation_type: violationType,
          violation_category: category,
          note: note.trim() || undefined,
        }),
      })

      if (res.status === 409) {
        const data = await res.json()
        setDuplicateId(data.error?.details?.existing_report_id ?? null)
        setError(null)
        return
      }

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message ?? 'Failed to create report')
      }

      const data = await res.json()
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/reports/${data.report_id}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!embedded && (
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-th-text-muted hover:text-th-text-secondary">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-th-text">{t('reports.new.title')}</h1>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-st-danger-text/30 bg-st-danger-bg px-4 py-3 text-sm text-st-danger-text">
          {error}
        </div>
      )}

      {duplicateId && (
        <div className="rounded-lg border border-st-warning-text/30 bg-st-warning-bg px-4 py-3">
          <p className="text-sm font-medium text-st-warning-text">
            {t('reports.new.duplicateWarning')}
          </p>
          <Link
            href={`/reports/${duplicateId}`}
            className="mt-1 inline-block text-sm text-th-accent underline"
          >
            {t('reports.new.viewExisting')}
          </Link>
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-th-text">{t('reports.new.listingInfo')}</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t('reports.new.asin')}
              value={asin}
              onChange={(e) => setAsin(e.target.value)}
              placeholder={t('reports.new.asinPlaceholder')}
              required
            />
            <Select
              label={t('reports.new.marketplace')}
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value)}
              options={MARKETPLACE_OPTIONS}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t('reports.new.listingTitle')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('reports.new.listingTitlePlaceholder')}
            />
            <Input
              label={t('reports.new.sellerName')}
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
              placeholder={t('reports.new.sellerNamePlaceholder')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-th-text">{t('reports.new.violationDetails')}</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label={t('reports.new.violationCategory')}
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              options={CATEGORY_OPTIONS}
              placeholder={t('reports.new.selectCategory')}
            />
            <Select
              label={t('reports.new.violationType')}
              value={violationType}
              onChange={(e) => setViolationType(e.target.value)}
              options={typeOptions}
              placeholder={t('reports.new.selectType')}
              disabled={!category}
            />
          </div>
          {/* Recommended templates */}
          {violationType && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-th-text-secondary">
                Recommended Templates
              </label>
              {loadingTemplates ? (
                <p className="py-3 text-center text-xs text-th-text-muted">{t('common.loading')}</p>
              ) : suggestedTemplates.length > 0 ? (
                <div className="space-y-2">
                  {suggestedTemplates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="rounded-lg border border-th-border bg-th-bg-secondary p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {tmpl.is_default && (
                              <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
                            )}
                            <span className="text-sm font-medium text-th-text">{tmpl.title}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-th-text-muted">
                            Used {tmpl.usage_count} times
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setPreviewTemplateId(
                                previewTemplateId === tmpl.id ? null : tmpl.id,
                              )
                            }
                          >
                            <FileText className="mr-1 h-3.5 w-3.5" />
                            {previewTemplateId === tmpl.id ? 'Hide' : 'Preview'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleUseTemplate(tmpl)}
                          >
                            Use
                          </Button>
                        </div>
                      </div>
                      {previewTemplateId === tmpl.id && (
                        <div className="mt-2 rounded bg-th-bg-tertiary p-2 text-xs text-th-text-secondary whitespace-pre-wrap">
                          {tmpl.body.slice(0, 300)}
                          {tmpl.body.length > 300 && '...'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-2 text-xs text-th-text-muted">
                  No templates available for this violation type.
                </p>
              )}
            </div>
          )}

          <Textarea
            label={t('reports.new.note')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('reports.new.notePlaceholder')}
            rows={note.length > 200 ? 12 : 4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onSuccess ?? (() => router.back())}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={loading} disabled={!canSubmit}>
          {t('reports.new.createReport')}
        </Button>
      </div>
    </form>
  )
}
