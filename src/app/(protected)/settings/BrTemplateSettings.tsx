'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/hooks/useToast'
import { Upload, Trash2, RefreshCw, FileSpreadsheet } from 'lucide-react'

type BrTemplate = {
  id: string
  code: string
  category: string
  title: string
  br_form_type: string
  violation_codes: string[]
  active: boolean
  created_at: string
}

export const BrTemplateSettings = () => {
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [templates, setTemplates] = useState<BrTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BrTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so same file can be re-uploaded
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
        addToast({
          type: 'error',
          title: 'Import failed',
          message: data.error?.message ?? 'Unknown error',
        })
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-th-text">BR Templates</h2>
          <p className="mt-0.5 text-sm text-th-text-muted">
            Import Excel/CSV templates used as few-shot examples when generating BR case drafts.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
            size="sm"
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
            icon={<Upload className="h-4 w-4" />}
          >
            Import File
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
      <div className="flex flex-wrap gap-4">
        <div className="rounded-xl border border-th-border bg-surface-card px-4 py-3">
          <p className="text-xs text-th-text-muted">Total Templates</p>
          <p className="mt-0.5 text-2xl font-bold text-th-text">{templates.length}</p>
        </div>
        <div className="rounded-xl border border-th-border bg-surface-card px-4 py-3">
          <p className="text-xs text-th-text-muted">Active</p>
          <p className="mt-0.5 text-2xl font-bold text-th-text">
            {templates.filter((t) => t.active).length}
          </p>
        </div>
        {lastImport && (
          <div className="rounded-xl border border-th-border bg-surface-card px-4 py-3">
            <p className="text-xs text-th-text-muted">Last Import</p>
            <p className="mt-0.5 text-sm font-semibold text-th-text">{lastImport}</p>
          </div>
        )}
      </div>

      {/* Expected format hint */}
      <div className="rounded-xl border border-th-border bg-th-bg-tertiary px-4 py-3">
        <p className="text-xs font-semibold text-th-text-secondary">Expected column headers:</p>
        <p className="mt-1 font-mono text-xs text-th-text-muted">
          code, category, title, body, br_form_type, instruction, violation_codes, placeholders
        </p>
        <p className="mt-1 text-xs text-th-text-muted">
          Required: code, category, title, body, br_form_type. Accepts .xlsx, .xls, .csv (max 5 MB).
          Use commas/semicolons to separate multiple violation_codes or placeholders.
        </p>
      </div>

      {/* Template list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-th-bg-secondary" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <FileSpreadsheet className="h-10 w-10 text-th-text-muted opacity-40" />
          <p className="text-sm text-th-text-muted">No BR templates imported yet.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            icon={<Upload className="h-4 w-4" />}
          >
            Import your first file
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-th-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-th-border bg-th-bg-tertiary text-left">
                <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">Code</th>
                <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">Title</th>
                <th className="hidden px-4 py-3 text-xs font-semibold text-th-text-tertiary sm:table-cell">Category</th>
                <th className="hidden px-4 py-3 text-xs font-semibold text-th-text-tertiary md:table-cell">Form Type</th>
                <th className="hidden px-4 py-3 text-xs font-semibold text-th-text-tertiary lg:table-cell">Violations</th>
                <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-th-text-tertiary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-th-border">
              {templates.map((tmpl) => (
                <tr key={tmpl.id} className="group transition-colors hover:bg-th-bg-hover">
                  <td className="px-4 py-3">
                    <span className="rounded bg-th-bg-tertiary px-1.5 py-0.5 font-mono text-xs text-th-text">
                      {tmpl.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-th-text">{tmpl.title}</td>
                  <td className="hidden px-4 py-3 text-th-text-muted sm:table-cell">{tmpl.category}</td>
                  <td className="hidden px-4 py-3 text-th-text-muted md:table-cell">{tmpl.br_form_type}</td>
                  <td className="hidden px-4 py-3 text-th-text-muted lg:table-cell">
                    {tmpl.violation_codes.length > 0 ? tmpl.violation_codes.join(', ') : '—'}
                  </td>
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
                    <button
                      onClick={() => setDeleteTarget(tmpl)}
                      className="rounded-lg p-1.5 text-th-text-muted hover:bg-red-500/10 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
