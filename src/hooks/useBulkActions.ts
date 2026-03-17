import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/useToast'

type BulkResult = Record<string, number>

export function useBulkActions(
  selectedIds: Set<string>,
  clearSelection: () => void,
) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()
  const { addToast } = useToast()

  const execute = useCallback(async (
    endpoint: string,
    extraBody?: Record<string, unknown>,
    options?: {
      successTitle?: string
      successCheck?: (result: BulkResult) => boolean
      formatMessage?: (result: BulkResult) => string
      onSuccess?: () => void
    },
  ): Promise<BulkResult | null> => {
    if (selectedIds.size === 0) return null
    setLoading(endpoint)
    try {
      const res = await fetch(`/api/reports/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_ids: [...selectedIds], ...extraBody }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? `${endpoint} failed`)
      }
      const result = await res.json() as BulkResult
      clearSelection()
      options?.onSuccess?.()

      const hasFailed = options?.successCheck
        ? !options.successCheck(result)
        : (result.failed ?? 0) > 0

      const message = options?.formatMessage?.(result)
        ?? Object.entries(result).map(([k, v]) => `${k}: ${v}`).join(', ')

      addToast({
        type: hasFailed ? 'warning' : 'success',
        title: hasFailed ? `Partially ${options?.successTitle ?? 'done'}` : (options?.successTitle ?? 'Done'),
        message,
      })
      router.refresh()
      return result
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
      return null
    } finally {
      setLoading(null)
    }
  }, [selectedIds, clearSelection, router, addToast])

  const approve = useCallback(() => execute('bulk-approve', undefined, {
    successTitle: 'Approved',
    formatMessage: (r) => `Approved: ${r.approved}, Failed: ${r.failed}, Skipped: ${r.skipped}`,
  }), [execute])

  const submit = useCallback((action: 'submit_review' | 'submit_sc') => execute('bulk-submit', { action }, {
    successTitle: 'Submitted',
    formatMessage: (r) => `Submitted: ${r.submitted}, Failed: ${r.failed}, Skipped: ${r.skipped}`,
  }), [execute])

  const deleteBulk = useCallback((onSuccess?: () => void) => execute('bulk-delete', undefined, {
    successTitle: 'Deleted',
    formatMessage: (r) => `Deleted: ${r.deleted}${(r.failed ?? 0) > 0 ? `, Failed: ${r.failed}` : ''}`,
    onSuccess,
  }), [execute])

  return { loading, approve, submit, deleteBulk }
}
