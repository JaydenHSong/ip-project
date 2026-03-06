'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { BackButton } from '@/components/ui/BackButton'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { useI18n } from '@/lib/i18n/context'
import { VIOLATION_CATEGORIES, VIOLATION_GROUPS } from '@/constants/violations'
import { MARKETPLACE_CODES, MARKETPLACES } from '@/constants/marketplaces'
import type { ViolationCategory } from '@/constants/violations'
import type { ReportTemplate } from '@/types/templates'
import { Star, FileText, Upload, X, Image, Plus } from 'lucide-react'

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
  const searchParams = useSearchParams()
  const { t } = useI18n()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateId, setDuplicateId] = useState<string | null>(null)

  // Listing fields (pre-fill from query params if available)
  const [asin, setAsin] = useState(searchParams.get('asin') ?? '')
  const [marketplace, setMarketplace] = useState(searchParams.get('marketplace') ?? 'US')
  const [title, setTitle] = useState(searchParams.get('title') ?? '')
  const [sellerName, setSellerName] = useState(searchParams.get('seller') ?? '')
  const [prefilling, setPrefilling] = useState(false)

  // Violation fields
  const [category, setCategory] = useState('')
  const [violationType, setViolationType] = useState('')
  const [note, setNote] = useState('')

  // Related ASINs (multi-ASIN support)
  const [relatedAsins, setRelatedAsins] = useState<string[]>([])

  // Screenshots (multiple)
  const [screenshots, setScreenshots] = useState<{ url: string; preview: string }[]>([])
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false)

  // Template suggestion
  const [suggestedTemplates, setSuggestedTemplates] = useState<ReportTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null)

  // ASIN + marketplace가 있으면 DB에서 listing 데이터 가져와서 pre-fill
  useEffect(() => {
    const paramAsin = searchParams.get('asin')
    const paramMp = searchParams.get('marketplace') ?? 'US'
    if (!paramAsin) return

    const prefillFromListing = async () => {
      setPrefilling(true)
      try {
        const res = await fetch(`/api/listings/lookup?asin=${paramAsin}&marketplace=${paramMp}`)
        if (!res.ok) return
        const listing = await res.json()
        if (listing.title && !title) setTitle(listing.title)
        if (listing.seller_name && !sellerName) setSellerName(listing.seller_name)
        if (listing.screenshot_url) {
          setScreenshots((prev) =>
            prev.length === 0
              ? [{ url: listing.screenshot_url, preview: listing.screenshot_url }]
              : prev,
          )
        }
      } catch {
        // pre-fill 실패해도 수동 입력 가능
      } finally {
        setPrefilling(false)
      }
    }

    prefillFromListing()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleScreenshotUpload = async (files: FileList) => {
    const remaining = 5 - screenshots.length
    const toUpload = Array.from(files).slice(0, remaining)

    for (const file of toUpload) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Screenshot must be under 5MB')
        return
      }
    }

    setUploadingScreenshot(true)
    try {
      const results: { url: string; preview: string }[] = []
      for (const file of toUpload) {
        const preview = URL.createObjectURL(file)
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/reports/upload-screenshot', {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error?.message ?? 'Upload failed')
        }
        const data = await res.json()
        results.push({ url: data.screenshot_url, preview })
      }
      setScreenshots((prev) => [...prev, ...results])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingScreenshot(false)
    }
  }

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index))
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
          screenshot_url: screenshots.length > 0 ? screenshots[0].url : undefined,
          screenshot_urls: screenshots.length > 0 ? screenshots.map((s) => s.url) : undefined,
          related_asins: relatedAsins
            .filter((a) => a.trim().length >= 5)
            .map((a) => ({ asin: a.trim().toUpperCase(), marketplace })),
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
          <BackButton href="/reports" />
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

          {/* Related ASINs (Multi-ASIN) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-th-text-secondary">
              Related ASINs
            </label>
            {relatedAsins.map((ra, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={ra}
                  onChange={(e) => {
                    const updated = [...relatedAsins]
                    updated[idx] = e.target.value.toUpperCase()
                    setRelatedAsins(updated)
                  }}
                  placeholder="B08XXXXXXXX"
                  className="flex-1 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setRelatedAsins(relatedAsins.filter((_, i) => i !== idx))}
                  className="rounded-lg p-2 text-th-text-muted hover:bg-st-danger-bg hover:text-st-danger-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {relatedAsins.length < 50 && (
              <button
                type="button"
                onClick={() => setRelatedAsins([...relatedAsins, ''])}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-th-accent-text hover:bg-th-accent-soft"
              >
                <Plus className="h-3.5 w-3.5" />
                Add ASIN
              </button>
            )}
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

      {/* Screenshot Upload */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-th-text">
              {t('reports.new.screenshot')}
            </h2>
            {screenshots.length > 0 && (
              <span className="text-xs text-th-text-muted">{screenshots.length}/5</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {screenshots.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {screenshots.map((ss, idx) => (
                <div key={idx} className="group relative">
                  <img
                    src={ss.preview}
                    alt={`Screenshot ${idx + 1}`}
                    className="h-32 w-full rounded-xl border border-th-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeScreenshot(idx)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-th-bg-tertiary/80 p-1 text-th-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-st-danger-bg hover:text-st-danger-text"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {screenshots.length < 5 && (
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-th-border px-6 py-6 transition-colors hover:border-th-accent hover:bg-th-accent-soft/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-th-bg-tertiary">
                <Image className="h-5 w-5 text-th-text-muted" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-th-text">
                  {t('reports.new.screenshotUpload')}
                </p>
                <p className="mt-1 text-xs text-th-text-muted">
                  {t('reports.new.screenshotHint')}
                </p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) handleScreenshotUpload(e.target.files)
                }}
              />
            </label>
          )}
          {uploadingScreenshot && (
            <div className="flex items-center justify-center gap-2 py-2">
              <svg className="h-4 w-4 animate-spin text-th-accent" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-th-text-muted">Uploading...</span>
            </div>
          )}
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
