'use client'

import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Plus } from 'lucide-react'
import type { ChangelogEntry, ChangelogCategory } from '@/types/changelog'

const CATEGORY_CONFIG = {
  new: { variant: 'info' as const },
  fix: { variant: 'danger' as const },
  policy: { variant: 'warning' as const },
  ai: { variant: 'violet' as const },
} as const

const CATEGORY_OPTIONS: { value: ChangelogCategory; label: string }[] = [
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

export const NoticesTab = () => {
  const { t } = useI18n()
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!formTitle.trim()) return

    setSubmitting(true)
    setSaved(false)
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
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-th-text">
            {t('settings.notices.title' as Parameters<typeof t>[0])}
          </h2>
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            icon={<Plus className="h-4 w-4" />}
          >
            {t('settings.notices.addNotice' as Parameters<typeof t>[0])}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Notice Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-th-border bg-th-bg-secondary p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label={t('changelog.category')}
                options={CATEGORY_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: getCategoryLabel(opt.value),
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
            <div className="flex items-center justify-end gap-3">
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
        )}

        {/* Saved confirmation */}
        {saved && (
          <p className="text-sm text-green-500">
            {t('settings.notices.saved' as Parameters<typeof t>[0])}
          </p>
        )}

        {/* Loading */}
        {loading && (
          <p className="text-sm text-th-text-muted">{t('common.loading')}</p>
        )}

        {/* Empty State */}
        {!loading && entries.length === 0 && (
          <p className="text-center text-sm text-th-text-muted py-8">
            {t('settings.notices.noNotices' as Parameters<typeof t>[0])}
          </p>
        )}

        {/* Notice List */}
        {!loading && entries.length > 0 && (
          <div className="divide-y divide-th-border">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <Badge variant={CATEGORY_CONFIG[entry.category].variant}>
                  {getCategoryLabel(entry.category)}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-th-text">{entry.title}</p>
                  {entry.description && (
                    <p className="mt-0.5 text-sm text-th-text-muted">{entry.description}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-th-text-muted">
                  {formatDate(entry.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
