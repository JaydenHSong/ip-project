'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/hooks/useToast'
import { BR_FORM_OPTIONS } from '@/lib/reports/br-data'
import { Upload, Trash2, RefreshCw, FileSpreadsheet, Plus, Pencil } from 'lucide-react'

type BrTemplate = {
  id: string
  code: string
  category: string
  title: string
  body: string
  br_form_type: string
  violation_codes: string[]
  instruction: string | null
  active: boolean
  created_at: string
}

const EMPTY_FORM = {
  code: '',
  category: '',
  title: '',
  body: '',
  br_form_type: 'other_policy',
  violation_codes: '',
  instruction: '',
}

export const BrTemplateSettings = () => {
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [templates, setTemplates] = useState<BrTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BrTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)

  // D1: 생성/수정 모달
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<BrTemplate | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // D2: 필터
  const [filterCategory, setFilterCategory] = useState('')
  const [filterFormType, setFilterFormType] = useState('')

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/br-templates?all=true')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates ?? [])
      }
    } catch {
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Distinct categories from templates
  const categories = useMemo(
    () => [...new Set(templates.map((t) => t.category))].sort(),
    [templates],
  )

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = templates
    if (filterCategory) result = result.filter((t) => t.category === filterCategory)
    if (filterFormType) result = result.filter((t) => t.br_form_type === filterFormType)
    return result
  }, [templates, filterCategory, filterFormType])

  const openCreateModal = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEditModal = (tmpl: BrTemplate) => {
    setEditTarget(tmpl)
    setForm({
      code: tmpl.code,
      category: tmpl.category,
      title: tmpl.title,
      body: tmpl.body,
      br_form_type: tmpl.br_form_type,
      violation_codes: tmpl.violation_codes.join(', '),
      instruction: tmpl.instruction ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.code || !form.category || !form.title || !form.body || !form.br_form_type) {
      addToast({ type: 'error', title: 'Required fields missing', message: 'code, category, title, body, form type are required' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        code: form.code,
        category: form.category,
        title: form.title,
        body: form.body,
        br_form_type: form.br_form_type,
        violation_codes: form.violation_codes.split(/[,;]/).map((v) => v.trim()).filter(Boolean),
        instruction: form.instruction || null,
      }

      const isEdit = !!editTarget
      const url = isEdit ? `/api/br-templates/${editTarget.id}` : '/api/br-templates'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        addToast({ type: 'success', title: isEdit ? 'Template updated' : 'Template created' })
        setModalOpen(false)
        fetchTemplates()
      } else {
        const data = await res.json()
        addToast({ type: 'error', title: 'Save failed', message: data.error?.message ?? 'Unknown error' })
      }
    } catch {
      addToast({ type: 'error', title: 'Save failed', message: 'Network error' })
    } finally {
      setSaving(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/br-templates/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (res.ok) {
        addToast({
          type: 'success',
          title: `Imported ${data.imported} template${data.imported !== 1 ? 's' : ''}`,
          message: data.skipped > 0 ? `${data.skipped} row(s) skipped due to errors` : undefined,
        })
        fetchTemplates()
      } else {
        addToast({ type: 'error', title: 'Import failed', message: data.error?.message ?? 'Unknown error' })
      }
    } catch {
      addToast({ type: 'error', title: 'Import failed', message: 'Network error' })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/br-templates/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        addToast({ type: 'success', title: 'Template deleted' })
        setDeleteTarget(null)
        fetchTemplates()
      } else {
        const data = await res.json()
        addToast({ type: 'error', title: 'Delete failed', message: data.error?.message })
      }
    } finally {
      setDeleting(false)
    }
  }

  const lastImport = templates.length > 0
    ? new Date(
        Math.max(...templates.map((t) => new Date(t.created_at).getTime()))
      ).toLocaleDateString()
    : null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      {/* Header */}
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-th-text">BR Templates</h2>
          <p className="mt-0.5 text-sm text-th-text-muted">
            Manage templates used as few-shot examples when generating BR case drafts.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            loading={loading}
            onClick={fetchTemplates}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
            icon={<Upload className="h-4 w-4" />}
          >
            Import
          </Button>
          <Button
            size="sm"
            onClick={openCreateModal}
            icon={<Plus className="h-4 w-4" />}
          >
            New Template
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex shrink-0 flex-wrap gap-4">
        <div className="rounded-xl border border-th-border bg-surface-card px-4 py-3">
          <p className="text-xs text-th-text-muted">Total</p>
          <p className="mt-0.5 text-2xl font-bold text-th-text">{templates.length}</p>
        </div>
        <div className="rounded-xl border border-th-border bg-surface-card px-4 py-3">
          <p className="text-xs text-th-text-muted">Active</p>
          <p className="mt-0.5 text-2xl font-bold text-th-text">
            {templates.filter((t) => t.active).length}
          </p>
        </div>
        <div className="rounded-xl border border-th-border bg-surface-card px-4 py-3">
          <p className="text-xs text-th-text-muted">Showing</p>
          <p className="mt-0.5 text-2xl font-bold text-th-text">{filtered.length}</p>
        </div>
        {lastImport && (
          <div className="rounded-xl border border-th-border bg-surface-card px-4 py-3">
            <p className="text-xs text-th-text-muted">Last Import</p>
            <p className="mt-0.5 text-sm font-semibold text-th-text">{lastImport}</p>
          </div>
        )}
      </div>

      {/* D2: Filters */}
      <div className="flex shrink-0 flex-wrap gap-3">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={filterFormType}
          onChange={(e) => setFilterFormType(e.target.value)}
          className="rounded-lg border border-th-border bg-surface-card px-3 py-1.5 text-sm text-th-text"
        >
          <option value="">All Form Types</option>
          {BR_FORM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {(filterCategory || filterFormType) && (
          <button
            onClick={() => { setFilterCategory(''); setFilterFormType('') }}
            className="text-xs text-th-accent-text hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Template list — pocket scroll: thead fixed, tbody scrolls */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-th-bg-secondary" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <FileSpreadsheet className="h-10 w-10 text-th-text-muted opacity-40" />
          <p className="text-sm text-th-text-muted">No BR templates yet.</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              icon={<Upload className="h-4 w-4" />}
            >
              Import file
            </Button>
            <Button
              size="sm"
              onClick={openCreateModal}
              icon={<Plus className="h-4 w-4" />}
            >
              Create manually
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-th-border">
          {/* Sticky thead */}
          <table className="w-full shrink-0 text-sm">
            <thead>
              <tr className="border-b border-th-border bg-th-bg-tertiary text-left">
                <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">Code</th>
                <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">Title / Preview</th>
                <th className="hidden px-4 py-3 text-xs font-semibold text-th-text-tertiary sm:table-cell">Category</th>
                <th className="hidden px-4 py-3 text-xs font-semibold text-th-text-tertiary md:table-cell">Form Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-th-text-tertiary">Actions</th>
              </tr>
            </thead>
          </table>
          {/* Scrollable rows with pocket shadow */}
          <div className="min-h-0 flex-1 overflow-y-auto shadow-[inset_0_6px_8px_-4px_rgba(0,0,0,0.15)]">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-th-border">
                {filtered.map((tmpl) => (
                  <tr
                    key={tmpl.id}
                    onClick={() => openEditModal(tmpl)}
                    className="group cursor-pointer transition-colors hover:bg-th-bg-hover"
                  >
                    <td className="px-4 py-3">
                      <span className="rounded bg-th-bg-tertiary px-1.5 py-0.5 font-mono text-xs text-th-text">
                        {tmpl.code}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="font-medium text-th-text">{tmpl.title}</p>
                      <p className="mt-0.5 truncate text-xs text-th-text-muted">
                        {tmpl.body?.substring(0, 80)}{tmpl.body?.length > 80 ? '...' : ''}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 text-th-text-muted sm:table-cell">{tmpl.category}</td>
                    <td className="hidden px-4 py-3 text-th-text-muted md:table-cell">{tmpl.br_form_type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          tmpl.active
                            ? 'bg-st-success-bg text-st-success-text'
                            : 'bg-th-bg-tertiary text-th-text-muted'
                        }`}
                      >
                        {tmpl.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(tmpl) }}
                          className="rounded-lg p-1.5 text-th-text-muted opacity-0 hover:bg-th-bg-tertiary hover:text-th-text group-hover:opacity-100"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(tmpl) }}
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
        </div>
      )}

      {/* D1: Create/Edit Modal — wide layout, body-focused */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Template' : 'New Template'}
        className="max-w-3xl"
      >
        <div className="space-y-4">
          {/* Row 1: Code + Category + Title */}
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Code"
              placeholder="MI-14"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-th-text-secondary">Category</label>
              <input
                list="br-categories"
                placeholder="Main image"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-2 text-sm text-th-text placeholder:text-th-text-muted focus:border-th-accent focus:outline-none focus:ring-1 focus:ring-th-accent"
              />
              <datalist id="br-categories">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-th-text-secondary">Form Type</label>
              <select
                value={form.br_form_type}
                onChange={(e) => setForm((f) => ({ ...f, br_form_type: e.target.value }))}
                className="w-full rounded-lg border border-th-border bg-surface-card px-3 py-2 text-sm text-th-text"
              >
                {BR_FORM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Title (full width) */}
          <Input
            label="Title"
            placeholder="Image overlay text violation"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />

          {/* Row 3: Body — primary area, tall textarea */}
          <Textarea
            label="Body"
            placeholder="The listing for [ASIN] has an image that contains..."
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={16}
          />

          {/* Row 4: Violation Codes + Instruction side by side */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Violation Codes"
              placeholder="V04, V05, V06"
              value={form.violation_codes}
              onChange={(e) => setForm((f) => ({ ...f, violation_codes: e.target.value }))}
            />
            <Input
              label="Instruction (optional)"
              placeholder="Additional AI guidance for this template"
              value={form.instruction}
              onChange={(e) => setForm((f) => ({ ...f, instruction: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {editTarget ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Template"
      >
        <p className="text-sm text-th-text-secondary">
          Delete template &ldquo;{deleteTarget?.title}&rdquo; ({deleteTarget?.code})? This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
