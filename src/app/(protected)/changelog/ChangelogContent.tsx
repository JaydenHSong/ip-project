'use client'

import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Plus } from 'lucide-react'
import type { ChangelogEntry, ChangelogCategory } from '@/types/changelog'

type ChangelogContentProps = {
  isAdmin: boolean
}

const CATEGORY_CONFIG = {
  new: { variant: 'info' as const, icon: 'R' },
  fix: { variant: 'danger' as const, icon: 'B' },
  policy: { variant: 'warning' as const, icon: 'P' },
  ai: { variant: 'violet' as const, icon: 'A' },
} as const

const CATEGORY_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'fix', label: 'Fix' },
  { value: 'policy', label: 'Policy' },
  { value: 'ai', label: 'AI' },
]

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const ChangelogContent = ({ isAdmin }: ChangelogContentProps) => {
  const { t } = useI18n()
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formCategory, setFormCategory] = useState<ChangelogCategory>('new')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/changelog')
      if (res.ok) {
        const json = (await res.json()) as { data: ChangelogEntry[] }
        setEntries(json.data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formCategory,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
        }),
      })

      if (res.ok) {
        setFormTitle('')
        setFormDescription('')
        setFormCategory('new')
        setShowForm(false)
        await fetchEntries()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getCategoryLabel = (category: ChangelogCategory): string => {
    const key = `changelog.categories.${category}` as const
    return t(key)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-th-text md:text-2xl">
          {t('changelog.title')}
        </h1>
        {isAdmin && (
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            icon={<Plus className="h-4 w-4" />}
          >
            {t('changelog.addEntry')}
          </Button>
        )}
      </div>

      {/* Add Entry Form */}
      {isAdmin && showForm && (
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label={t('changelog.category')}
                  options={CATEGORY_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: getCategoryLabel(opt.value as ChangelogCategory),
                  }))}
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ChangelogCategory)}
                />
                <Input
                  label={t('changelog.entryTitle')}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-th-text-secondary">
                  {t('changelog.description')}
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={t('changelog.descriptionPlaceholder')}
                  rows={3}
                  className="rounded-xl border border-th-border-secondary bg-surface-card px-4 py-2.5 text-sm text-th-text placeholder-th-text-muted transition-all duration-200 focus:border-th-accent focus:outline-none focus:ring-2 focus:ring-th-accent/20"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={submitting}
                  disabled={!formTitle.trim()}
                >
                  {t('changelog.submit')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <p className="text-sm text-th-text-muted">{t('common.loading')}</p>
      )}

      {/* Empty State */}
      {!loading && entries.length === 0 && (
        <Card>
          <CardContent>
            <p className="text-center text-sm text-th-text-muted">
              {t('changelog.noEntries')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {!loading && entries.length > 0 && (
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-th-border md:left-[23px]" />

          {entries.map((entry) => (
            <div key={entry.id} className="relative flex gap-4 py-3 md:gap-5">
              {/* Timeline dot */}
              <div className="relative z-10 mt-1 flex h-[10px] w-[10px] shrink-0 items-center justify-center rounded-full border-2 border-th-accent bg-th-bg md:h-[14px] md:w-[14px] ml-[14px] md:ml-[16px]" />

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={CATEGORY_CONFIG[entry.category].variant}>
                    {getCategoryLabel(entry.category)}
                  </Badge>
                  <span className="text-xs text-th-text-muted">
                    {formatDate(entry.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-th-text">
                  {entry.title}
                </p>
                {entry.description && (
                  <p className="mt-0.5 text-sm text-th-text-muted">
                    {entry.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
