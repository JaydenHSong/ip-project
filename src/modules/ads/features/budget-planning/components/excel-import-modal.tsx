// S13 — Excel Import Modal
// Design Ref: §5.3 S13 "[Import]", §4.2 POST /api/ads/budgets/import
'use client'

import { useState, useRef } from 'react'
import type { ImportBudgetResponse } from '../types'

type ExcelImportModalProps = {
  brandMarketId: string
  year: number
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
}

const ExcelImportModal = ({ brandMarketId, year, isOpen, onClose, onImportComplete }: ExcelImportModalProps) => {
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<ImportBudgetResponse['data'] | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
    setResult(null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('brand_market_id', brandMarketId)
      formData.append('year', String(year))

      const res = await fetch('/api/ads/budgets/import', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json() as ImportBudgetResponse
      setResult(json.data)

      if (json.data.imported_count > 0) {
        onImportComplete()
      }
    } catch {
      setResult({ imported_count: 0, skipped_count: 0, errors: [{ row: 0, message: 'Upload failed' }] })
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setResult(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-th-border px-6 py-4">
          <h2 className="text-base font-semibold text-th-text">Import Budget</h2>
          <button onClick={handleClose} className="text-th-text-muted hover:text-th-text-secondary">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* File selector */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-th-border px-4 py-6 text-center hover:border-orange-400 transition-colors"
            >
              {selectedFile ? (
                <div>
                  <p className="text-sm font-medium text-th-text">{selectedFile.name}</p>
                  <p className="mt-1 text-xs text-th-text-muted">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-th-text-muted">Click to select CSV or Excel file</p>
                  <p className="mt-1 text-xs text-th-text-muted">Supported: .csv, .xlsx, .xls</p>
                </div>
              )}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-md p-3 ${result.errors.length > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <p className="text-sm font-medium text-th-text-secondary">
                {result.imported_count} imported, {result.skipped_count} skipped
              </p>
              {result.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600">
                      Row {err.row}: {err.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Format hint */}
          <div className="text-xs text-th-text-muted">
            <p className="font-medium mb-1">Expected CSV format:</p>
            <p className="font-mono">channel, month, amount</p>
            <p className="font-mono">sp, 1, 5000</p>
            <p className="font-mono">sp, 2, 6000</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-th-border px-6 py-4">
          <button
            onClick={handleClose}
            className="rounded-md border border-th-border px-4 py-2 text-sm font-medium text-th-text-secondary hover:bg-th-bg-hover"
          >
            Close
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {isUploading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}

export { ExcelImportModal }
