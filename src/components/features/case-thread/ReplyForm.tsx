'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Paperclip, X } from 'lucide-react'

const MAX_FILES = 6
const MAX_TOTAL_SIZE = 10 * 1024 * 1024 // 10MB

type PendingFile = {
  file: File
  uploading: boolean
  storagePath: string | null
  error: string | null
}

type ReplyFormProps = {
  reportId: string
  hasPendingReply: boolean
  onSent?: () => void
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export const ReplyForm = ({ reportId, hasPendingReply, onSent }: ReplyFormProps) => {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<PendingFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0)
  const isUploading = files.some((f) => f.uploading)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return

    // 개수 검증
    if (files.length + selected.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed`)
      return
    }

    // 합계 크기 검증
    const newTotal = totalSize + selected.reduce((sum, f) => sum + f.size, 0)
    if (newTotal > MAX_TOTAL_SIZE) {
      setError('Total file size exceeds 10MB limit')
      return
    }

    setError(null)
    const newFiles: PendingFile[] = selected.map((file) => ({
      file,
      uploading: false,
      storagePath: null,
      error: null,
    }))

    setFiles((prev) => [...prev, ...newFiles])

    // 각 파일을 Storage에 업로드
    newFiles.forEach((pf, idx) => {
      uploadFile(pf, files.length + idx)
    })

    // input 리셋
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFile = async (pf: PendingFile, index: number) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, uploading: true } : f)))

    try {
      const formData = new FormData()
      formData.append('file', pf.file)
      formData.append('path', 'br-reply-attachments')

      const res = await fetch('/api/reports/upload-attachment', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message ?? 'Upload failed')
      }

      const { storagePath } = await res.json()
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, uploading: false, storagePath } : f)),
      )
    } catch (e) {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? { ...f, uploading: false, error: e instanceof Error ? e.message : 'Upload failed' }
            : f,
        ),
      )
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!text.trim()) return
    if (isUploading) return

    const failedFiles = files.filter((f) => f.error)
    if (failedFiles.length > 0) {
      setError('Some files failed to upload. Remove them or retry.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const attachments = files
        .filter((f) => f.storagePath)
        .map((f) => ({
          name: f.file.name,
          storage_path: f.storagePath!,
          size: f.file.size,
        }))

      const res = await fetch(`/api/reports/${reportId}/case-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, attachments: attachments.length > 0 ? attachments : undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message ?? 'Failed to queue reply')
      }
      setText('')
      setFiles([])
      onSent?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (hasPendingReply) {
    return (
      <div className="rounded-lg border border-blue-400/30 bg-blue-50/50 p-3 dark:bg-blue-900/10">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Reply queued — waiting for delivery to Amazon
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-blue-400/30 bg-blue-50/50 p-3 dark:bg-blue-900/10">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write reply to Amazon..."
        rows={3}
      />

      {/* 첨부 파일 목록 */}
      {files.length > 0 && (
        <div className="mt-2 space-y-1">
          {files.map((pf, idx) => (
            <div
              key={`${pf.file.name}-${idx}`}
              className="flex items-center gap-2 rounded border border-th-border bg-surface-card px-2 py-1 text-xs"
            >
              <Paperclip className="h-3 w-3 shrink-0 text-th-text-muted" />
              <span className="flex-1 truncate text-th-text-secondary">{pf.file.name}</span>
              <span className="shrink-0 text-th-text-muted">{formatFileSize(pf.file.size)}</span>
              {pf.uploading && (
                <span className="shrink-0 text-blue-500">uploading...</span>
              )}
              {pf.error && (
                <span className="shrink-0 text-red-500">failed</span>
              )}
              {pf.storagePath && (
                <span className="shrink-0 text-green-500">✓</span>
              )}
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="shrink-0 rounded p-0.5 text-th-text-muted hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <p className="text-[10px] text-th-text-muted">
            {files.length}/{MAX_FILES} files · {formatFileSize(totalSize)}/10MB
          </p>
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.zip"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= MAX_FILES || loading}
          >
            <Paperclip className="mr-1 h-3.5 w-3.5" />
            Attach
          </Button>
        </div>
        <Button
          size="sm"
          loading={loading}
          onClick={handleSubmit}
          disabled={!text.trim() || isUploading}
        >
          Send Reply
        </Button>
      </div>
    </div>
  )
}
