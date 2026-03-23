'use client'

import { useEffect, useState } from 'react'
import { SlidePanel } from '@/components/ui/SlidePanel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import { useI18n } from '@/lib/i18n/context'
import { interpolateTemplate } from '@/lib/templates/interpolate'
import { BR_FORM_TYPES, BR_FORM_TYPE_CODES, type BrFormTypeCode } from '@/constants/br-form-types'
import type { ReportTemplate } from '@/types/templates'
import type { Listing } from '@/types/listings'
import { Star, Search, ChevronDown, ChevronUp, Check } from 'lucide-react'

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
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data: ReportTemplate[]) => {
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

  const matchCount = filtered.filter(
    (tmpl) => currentViolationType && tmpl.violation_types.includes(currentViolationType),
  ).length

  const handleApply = (tmpl: ReportTemplate) => {
    const result = interpolateTemplate(tmpl.body, { listing, report })
    onApply(result, tmpl.title)
    onClose()
    fetch(`/api/templates/${tmpl.id}/use`, { method: 'POST' }).catch(() => {})
  }

  const categories = BR_FORM_TYPE_CODES

  return (
    <SlidePanel open={open} onClose={onClose} title={t('reports.detail.applyTemplate')} size="lg">
      <div className="space-y-4 p-1">
        {/* Current violation type indicator */}
        {currentViolationType && (
          <div className="flex items-center gap-2 rounded-lg border border-th-accent/20 bg-th-accent-soft/20 px-3 py-2">
            <ViolationBadge code={currentViolationType ?? ''} />
            {matchCount > 0 && (
              <span className="text-xs text-th-text-muted">
                {matchCount} matching template{matchCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-th-text-muted" />
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category filter chips */}
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
              {BR_FORM_TYPES[cat as BrFormTypeCode]?.label ?? cat}
            </button>
          ))}
        </div>

        {/* Template list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="h-5 w-5 animate-spin text-th-accent" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-th-border py-12 text-center">
            <p className="text-sm text-th-text-muted">
              {search || categoryFilter
                ? t('common.noData')
                : 'No templates available for this violation type.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((tmpl) => {
              const isMatch =
                currentViolationType && tmpl.violation_types.includes(currentViolationType)
              const isExpanded = expandedId === tmpl.id
              const interpolated = interpolateTemplate(tmpl.body, { listing, report })
              const previewLines = interpolated.split('\n').slice(0, 3).join('\n')
              const hasMore = interpolated.split('\n').length > 3

              return (
                <div
                  key={tmpl.id}
                  className={`group rounded-xl border transition-all ${
                    isMatch
                      ? 'border-th-accent/40 bg-th-accent-soft/20 shadow-sm'
                      : 'border-th-border bg-surface-card hover:border-th-border-hover hover:shadow-sm'
                  }`}
                >
                  {/* Card header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {tmpl.is_default && (
                            <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
                          )}
                          {isMatch && (
                            <span className="shrink-0 rounded bg-th-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-th-accent-text">
                              Match
                            </span>
                          )}
                          <h3 className="truncate text-sm font-semibold text-th-text">
                            {tmpl.title}
                          </h3>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {tmpl.violation_types.slice(0, 3).map((vt) => (
                            <span
                              key={vt}
                              className="rounded bg-th-bg-tertiary px-1.5 py-0.5 text-[10px] font-medium text-th-text-muted"
                            >
                              {vt}
                            </span>
                          ))}
                          {tmpl.violation_types.length > 3 && (
                            <span className="text-[10px] text-th-text-muted">
                              +{tmpl.violation_types.length - 3}
                            </span>
                          )}
                          <span className="text-[10px] text-th-text-muted">
                            · Used {tmpl.usage_count}x
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleApply(tmpl)}
                        className="shrink-0"
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Use
                      </Button>
                    </div>

                    {/* Body preview (3 lines) */}
                    <div className="mt-3 rounded-lg bg-th-bg-tertiary/60 px-3 py-2.5">
                      <pre className="whitespace-pre-wrap text-xs leading-relaxed text-th-text-secondary">
                        {isExpanded ? interpolated : previewLines}
                        {!isExpanded && hasMore && (
                          <span className="text-th-text-muted">...</span>
                        )}
                      </pre>
                      {hasMore && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : tmpl.id)}
                          className="mt-1.5 flex items-center gap-0.5 text-[11px] font-medium text-th-accent-text hover:underline"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3" /> Collapse
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" /> Show full template
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </SlidePanel>
  )
}
