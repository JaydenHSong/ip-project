'use client'

import { useEffect, useState } from 'react'
import { SlidePanel } from '@/components/ui/SlidePanel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useI18n } from '@/lib/i18n/context'
import { interpolateTemplate } from '@/lib/templates/interpolate'
import { VIOLATION_CATEGORIES } from '@/constants/violations'
import type { ViolationCategory } from '@/constants/violations'
import type { ReportTemplate } from '@/types/templates'
import type { Listing } from '@/types/listings'
// report type kept loose to accept both full Report and page-level report props
import { Star, FileText } from 'lucide-react'

type TemplatePanelProps = {
  open: boolean
  onClose: () => void
  onApply: (interpolatedBody: string, templateTitle: string) => void
  listing: Partial<Listing>
  report: { user_violation_type?: string; confirmed_violation_type?: string | null }
  currentViolationType?: string
}

export const TemplatePanel = ({
  open,
  onClose,
  onApply,
  listing,
  report,
  currentViolationType,
}: TemplatePanelProps) => {
  const { t } = useI18n()
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data: ReportTemplate[]) => {
        // Sort: matching violation types first, then default, then usage
        const sorted = [...data].sort((a, b) => {
          const aMatch = currentViolationType && a.violation_types.includes(currentViolationType) ? 1 : 0
          const bMatch = currentViolationType && b.violation_types.includes(currentViolationType) ? 1 : 0
          if (aMatch !== bMatch) return bMatch - aMatch
          if (a.is_default !== b.is_default) return a.is_default ? -1 : 1
          return b.usage_count - a.usage_count
        })
        setTemplates(sorted)
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [open, currentViolationType])

  const filtered = templates.filter((tmpl) => {
    if (categoryFilter && tmpl.category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        tmpl.title.toLowerCase().includes(q) ||
        tmpl.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    }
    return true
  })

  const handleApply = (tmpl: ReportTemplate) => {
    const result = interpolateTemplate(tmpl.body, { listing, report })
    onApply(result, tmpl.title)
    onClose()
    // Fire-and-forget usage tracking
    fetch(`/api/templates/${tmpl.id}/use`, { method: 'POST' }).catch(() => {})
  }

  const categories = Object.keys(VIOLATION_CATEGORIES) as ViolationCategory[]

  return (
    <SlidePanel open={open} onClose={onClose} title={t('reports.detail.applyTemplate')} size="lg">
      <div className="space-y-4">
        <Input
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              categoryFilter === null
                ? 'bg-th-accent text-white'
                : 'bg-th-bg-secondary text-th-text-secondary hover:bg-th-bg-tertiary'
            }`}
          >
            {t('common.all')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-th-accent text-white'
                  : 'bg-th-bg-secondary text-th-text-secondary hover:bg-th-bg-tertiary'
              }`}
            >
              {VIOLATION_CATEGORIES[cat]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-th-text-muted">{t('common.loading')}</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-th-text-muted">{t('common.noData')}</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((tmpl) => {
              const isMatch =
                currentViolationType && tmpl.violation_types.includes(currentViolationType)
              const isPreviewing = previewId === tmpl.id

              return (
                <div
                  key={tmpl.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    isMatch
                      ? 'border-th-accent/40 bg-th-accent-soft/30'
                      : 'border-th-border bg-th-bg-secondary'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {tmpl.is_default && (
                          <Star className="h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />
                        )}
                        <h3 className="truncate text-sm font-semibold text-th-text">
                          {tmpl.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-th-text-muted">
                        Used {tmpl.usage_count} times
                        {tmpl.violation_types.length > 0 &&
                          ` · ${tmpl.violation_types.join(', ')}`}
                        {tmpl.marketplace.length > 0 &&
                          ` · ${tmpl.marketplace.join(', ')}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewId(isPreviewing ? null : tmpl.id)}
                      >
                        <FileText className="mr-1 h-3.5 w-3.5" />
                        {isPreviewing ? 'Hide' : 'Preview'}
                      </Button>
                      <Button size="sm" onClick={() => handleApply(tmpl)}>
                        Apply
                      </Button>
                    </div>
                  </div>

                  {isPreviewing && (
                    <div className="mt-3 rounded-lg bg-th-bg-tertiary p-3 text-xs text-th-text-secondary whitespace-pre-wrap">
                      {interpolateTemplate(tmpl.body, { listing, report })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </SlidePanel>
  )
}
