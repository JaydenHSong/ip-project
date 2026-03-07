'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ScrollTabs } from '@/components/ui/ScrollTabs'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { SlidePanel } from '@/components/ui/SlidePanel'
import { Toggle } from '@/components/ui/Toggle'
import { useI18n } from '@/lib/i18n/context'
import { VIOLATION_CATEGORIES, VIOLATION_TYPES } from '@/constants/violations'
import type { ViolationCategory, ViolationCode } from '@/constants/violations'
import { TEMPLATE_VARIABLES } from '@/types/templates'
import type { ReportTemplate } from '@/types/templates'
import { Star, Pencil, Trash2, Copy, Plus, ChevronDown, ChevronRight } from 'lucide-react'

const MARKETPLACE_OPTIONS = ['US', 'UK', 'JP', 'DE', 'FR', 'IT', 'ES', 'CA', 'MX', 'AU']

type TemplateFormData = {
  title: string
  body: string
  category: string
  violation_types: string[]
  marketplace: string[]
  tags: string
  is_default: boolean
}

const emptyForm: TemplateFormData = {
  title: '',
  body: '',
  category: '',
  violation_types: [],
  marketplace: [],
  tags: '',
  is_default: false,
}

export const TemplatesTab = () => {
  const { t } = useI18n()
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TemplateFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ReportTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string> | 'all'>('all')

  const isGroupCollapsed = (cat: string): boolean => {
    if (collapsedGroups === 'all') return true
    return collapsedGroups.has(cat)
  }

  const toggleGroup = (cat: string) => {
    setCollapsedGroups((prev) => {
      if (prev === 'all') {
        const allCats = new Set(Object.keys(groupedTemplates))
        allCats.delete(cat)
        return allCats
      }
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const filteredTemplates = useMemo(() => {
    if (categoryFilter === 'all') return templates
    return templates.filter((t) => t.category === categoryFilter)
  }, [templates, categoryFilter])

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, ReportTemplate[]> = {}
    for (const tmpl of filteredTemplates) {
      const key = tmpl.category ?? 'uncategorized'
      if (!groups[key]) groups[key] = []
      groups[key].push(tmpl)
    }
    return groups
  }, [filteredTemplates])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const tmpl of templates) {
      const key = tmpl.category ?? 'uncategorized'
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [templates])

  const fetchTemplates = () => {
    setLoading(true)
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data: ReportTemplate[]) => setTemplates(data))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (tmpl: ReportTemplate) => {
    setEditingId(tmpl.id)
    setForm({
      title: tmpl.title,
      body: tmpl.body,
      category: tmpl.category ?? '',
      violation_types: tmpl.violation_types,
      marketplace: tmpl.marketplace,
      tags: tmpl.tags.join(', '),
      is_default: tmpl.is_default,
    })
    setShowForm(true)
  }

  const handleDuplicate = async (tmpl: ReportTemplate) => {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${tmpl.title} (Copy)`,
        body: tmpl.body,
        category: tmpl.category,
        violation_types: tmpl.violation_types,
        marketplace: tmpl.marketplace,
        tags: tmpl.tags,
        is_default: false,
      }),
    })
    if (res.ok) fetchTemplates()
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category || null,
        violation_types: form.violation_types,
        marketplace: form.marketplace,
        tags: form.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        is_default: form.is_default,
      }

      if (editingId) {
        await fetch(`/api/templates/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setShowForm(false)
      fetchTemplates()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`/api/templates/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      fetchTemplates()
    } finally {
      setDeleting(false)
    }
  }

  const insertVariable = (variable: string) => {
    setForm((prev) => ({ ...prev, body: prev.body + variable }))
  }

  const toggleViolationType = (code: string) => {
    setForm((prev) => ({
      ...prev,
      violation_types: prev.violation_types.includes(code)
        ? prev.violation_types.filter((v) => v !== code)
        : [...prev.violation_types, code],
    }))
  }

  const toggleMarketplace = (mp: string) => {
    setForm((prev) => ({
      ...prev,
      marketplace: prev.marketplace.includes(mp)
        ? prev.marketplace.filter((m) => m !== mp)
        : [...prev.marketplace, mp],
    }))
  }

  const categories = Object.keys(VIOLATION_CATEGORIES) as ViolationCategory[]
  const violationCodes = Object.keys(VIOLATION_TYPES) as ViolationCode[]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-th-text md:text-2xl">Templates</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Category filter tabs */}
      <ScrollTabs>
        <button
          onClick={() => setCategoryFilter('all')}
          className={`snap-start whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
            categoryFilter === 'all'
              ? 'bg-surface-card text-th-text shadow-sm'
              : 'text-th-text-muted hover:text-th-text-secondary'
          }`}
        >
          All ({templates.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat === categoryFilter ? 'all' : cat)}
            className={`snap-start whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
              categoryFilter === cat
                ? 'bg-surface-card text-th-text shadow-sm'
                : 'text-th-text-muted hover:text-th-text-secondary'
            }`}
          >
            {VIOLATION_CATEGORIES[cat]} ({categoryCounts[cat] ?? 0})
          </button>
        ))}
      </ScrollTabs>

      {loading ? (
        <p className="py-8 text-center text-sm text-th-text-muted">{t('common.loading')}</p>
      ) : filteredTemplates.length === 0 ? (
        <p className="py-8 text-center text-sm text-th-text-muted">{t('common.noData')}</p>
      ) : (
        <div className="space-y-2">
          {Object.entries(groupedTemplates).map(([cat, tmpls]) => {
            const isCollapsed = isGroupCollapsed(cat)
            const catLabel = VIOLATION_CATEGORIES[cat as ViolationCategory] ?? cat
            return (
              <div key={cat} className="rounded-xl border border-th-border bg-surface-card shadow-sm">
                <button
                  onClick={() => toggleGroup(cat)}
                  className="flex w-full items-center gap-2 rounded-t-xl px-4 py-3.5 text-left transition-colors hover:bg-th-bg-hover"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-th-text-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-th-text-muted" />
                  )}
                  <span className="text-sm font-semibold text-th-text">{catLabel}</span>
                  <span className="rounded-full bg-th-bg-tertiary px-2 py-0.5 text-xs text-th-text-muted">
                    {tmpls.length}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="overflow-x-auto border-t border-th-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-th-border bg-th-bg-tertiary text-left">
                          <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">Title</th>
                          <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">Violations</th>
                          <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">Marketplace</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-th-text-tertiary">Used</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-th-text-tertiary">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-th-border">
                        {tmpls.map((tmpl) => (
                          <tr key={tmpl.id} className="group transition-colors hover:bg-th-bg-hover">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5">
                                {tmpl.is_default && (
                                  <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
                                )}
                                <span className="font-medium text-th-text">{tmpl.title}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-th-text-muted">
                              {tmpl.violation_types.length > 0 ? tmpl.violation_types.join(', ') : '—'}
                            </td>
                            <td className="px-4 py-3.5 text-th-text-muted">
                              {tmpl.marketplace.length > 0 ? tmpl.marketplace.join(', ') : 'All'}
                            </td>
                            <td className="px-4 py-3.5 text-right text-th-text-muted">{tmpl.usage_count}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => openEdit(tmpl)}
                                  className="rounded-lg p-1.5 text-th-text-muted hover:bg-th-bg-tertiary hover:text-th-text"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDuplicate(tmpl)}
                                  className="rounded-lg p-1.5 text-th-text-muted hover:bg-th-bg-tertiary hover:text-th-text"
                                  title="Duplicate"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(tmpl)}
                                  className="rounded-lg p-1.5 text-th-text-muted hover:bg-red-500/10 hover:text-red-500"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit SlidePanel */}
      <SlidePanel
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Edit Template' : 'New Template'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-th-text-secondary">Body</label>
            <div className="mb-2 flex flex-wrap gap-1">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="rounded bg-th-bg-tertiary px-2 py-0.5 text-xs text-th-text-muted hover:bg-th-bg-secondary hover:text-th-text"
                >
                  {v}
                </button>
              ))}
            </div>
            <Textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={10}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-th-text-secondary">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-lg border border-th-border bg-th-bg-secondary px-3 py-2 text-sm text-th-text"
            >
              <option value="">None</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {VIOLATION_CATEGORIES[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-th-text-secondary">
              Violation Types
            </label>
            <div className="flex flex-wrap gap-1.5">
              {violationCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleViolationType(code)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    form.violation_types.includes(code)
                      ? 'bg-th-accent text-white'
                      : 'bg-th-bg-secondary text-th-text-muted hover:bg-th-bg-tertiary'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-th-text-secondary">
              Marketplace (empty = all)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MARKETPLACE_OPTIONS.map((mp) => (
                <button
                  key={mp}
                  type="button"
                  onClick={() => toggleMarketplace(mp)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    form.marketplace.includes(mp)
                      ? 'bg-th-accent text-white'
                      : 'bg-th-bg-secondary text-th-text-muted hover:bg-th-bg-tertiary'
                  }`}
                >
                  {mp}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Tags (comma separated)"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            placeholder="e.g., trademark, standard"
          />

          <Toggle
            size="sm"
            checked={form.is_default}
            onChange={(checked) => setForm((f) => ({ ...f, is_default: checked }))}
            label="Default template"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              loading={saving}
              disabled={!form.title.trim() || !form.body.trim()}
              onClick={handleSave}
            >
              {t('common.save')}
            </Button>
          </div>
        </div>
      </SlidePanel>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('common.delete')}
      >
        <p className="text-sm text-th-text-secondary">
          Delete template &ldquo;{deleteTarget?.title}&rdquo;? This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
