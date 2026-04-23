'use client'

import { useEffect, useState, useMemo } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { BrFormType } from '@/types/reports'
import { Search, ChevronDown, ChevronUp, Check } from 'lucide-react'

type BrTemplate = {
  id: string
  code: string
  category: string
  title: string
  subject: string | null
  body: string
  br_form_type: string
  placeholders: string[]
}

type BrTemplateListProps = {
  formType: BrFormType
  listing: {
    asin?: string
    title?: string | null
    brand?: string | null
    seller_name?: string | null
    marketplace?: string
  }
  onApply: (body: string, title: string, subject: string | null) => void
  compact?: boolean
}

const interpolateBrTemplate = (
  body: string,
  listing: BrTemplateListProps['listing'],
): string =>
  body
    .replace(/\[ASIN\]/gi, listing.asin ?? '[ASIN]')
    .replace(/\[product name\]/gi, listing.title ?? '[product name]')
    .replace(/\[brand name\]/gi, listing.brand ?? '[brand name]')
    .replace(/\[seller name\]/gi, listing.seller_name ?? '[seller name]')
    .replace(/\[marketplace\]/gi, listing.marketplace ?? '[marketplace]')

export const BrTemplateList = ({
  formType,
  listing,
  onApply,
  compact = false,
}: BrTemplateListProps) => {
  const [templates, setTemplates] = useState<BrTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadTemplates = async () => {
      setLoading(true)
      setSearch('')
      setExpandedCategory(null)

      try {
        const res = await fetch(`/api/br-templates?form_type=${formType}`)
        const data = await res.json() as { templates: BrTemplate[] }
        if (!cancelled) {
          setTemplates(data.templates ?? [])
        }
      } catch {
        if (!cancelled) {
          setTemplates([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadTemplates()

    return () => {
      cancelled = true
    }
  }, [formType])

  const filtered = useMemo(() => {
    if (!search) return templates
    const q = search.toLowerCase()
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    )
  }, [templates, search])

  const grouped = useMemo(() => {
    const map = new Map<string, BrTemplate[]>()
    for (const t of filtered) {
      const list = map.get(t.category) ?? []
      list.push(t)
      map.set(t.category, list)
    }
    return map
  }, [filtered])

  const handleApply = (tmpl: BrTemplate) => {
    const interpolated = interpolateBrTemplate(tmpl.body, listing)
    onApply(interpolated, tmpl.title, tmpl.subject)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="h-5 w-5 animate-spin text-th-accent" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-th-border py-8 text-center">
        <p className="text-sm text-th-text-muted">No templates for this form type.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-th-text-muted" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className={`space-y-1 overflow-y-auto ${compact ? 'max-h-[400px]' : 'max-h-[500px]'}`}>
        {[...grouped.entries()].map(([category, items]) => {
          const isOpen = expandedCategory === category || grouped.size === 1 || !!search
          return (
            <div key={category}>
              <button
                type="button"
                onClick={() => setExpandedCategory(isOpen && !search ? null : category)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-th-bg-hover"
              >
                <span className="text-sm font-medium text-th-text">
                  {category} ({items.length})
                </span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-th-text-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-th-text-muted" />
                )}
              </button>

              {isOpen && (
                <div className="space-y-1.5 pb-1 pl-1">
                  {items.map((tmpl) => {
                    if (compact) {
                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => handleApply(tmpl)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-th-bg-hover"
                        >
                          <span className="shrink-0 rounded bg-th-bg-tertiary px-1.5 py-0.5 text-[10px] font-medium text-th-text-muted">
                            {tmpl.code}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-th-text">
                            {tmpl.title}
                          </span>
                        </button>
                      )
                    }

                    const interpolated = interpolateBrTemplate(tmpl.body, listing)
                    const previewLines = interpolated.split('\n').slice(0, 3).join('\n')
                    const hasMore = interpolated.split('\n').length > 3
                    const isExpanded = expandedId === tmpl.id

                    return (
                      <div
                        key={tmpl.id}
                        className="rounded-xl border border-th-border bg-surface-card transition-all hover:border-th-border-hover"
                      >
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="shrink-0 rounded bg-th-bg-tertiary px-1.5 py-0.5 text-[10px] font-medium text-th-text-muted">
                                  {tmpl.code}
                                </span>
                                <h3 className="truncate text-sm font-semibold text-th-text">
                                  {tmpl.title}
                                </h3>
                              </div>
                            </div>
                            <Button size="sm" onClick={() => handleApply(tmpl)} className="shrink-0">
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Use
                            </Button>
                          </div>

                          <div className="mt-2 rounded-lg bg-th-bg-tertiary/60 px-3 py-2">
                            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-th-text-secondary">
                              {isExpanded ? interpolated : previewLines}
                              {!isExpanded && hasMore && (
                                <span className="text-th-text-muted">...</span>
                              )}
                            </pre>
                            {hasMore && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : tmpl.id)}
                                className="mt-1 flex items-center gap-0.5 text-[11px] font-medium text-th-accent-text hover:underline"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-3 w-3" /> Collapse
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3 w-3" /> Show full
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
          )
        })}
      </div>
    </div>
  )
}
