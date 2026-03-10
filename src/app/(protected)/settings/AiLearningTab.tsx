'use client'

import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ChevronDown, ChevronUp } from 'lucide-react'

type LearningRecord = {
  id: string
  report_id: string | null
  trigger: string
  violation_type: string | null
  original_draft: string | null
  final_draft: string | null
  feedback: string | null
  outcome: string | null
  metadata: Record<string, unknown>
  created_at: string
  reports: {
    id: string
    status: string
    draft_title: string | null
    listing_id: string | null
  } | null
}

type ApiResponse = {
  records: LearningRecord[]
  total: number
  page: number
  totalPages: number
}

const TRIGGER_OPTIONS = [
  'approved_edited',
  'rewritten',
  'pd_submitted',
  'resolved',
  'unresolved',
  'resubmitted',
] as const

const TRIGGER_COLORS: Record<string, string> = {
  approved_edited: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  rewritten: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  pd_submitted: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  unresolved: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  resubmitted: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

export const AiLearningTab = () => {
  const { t } = useI18n()
  const [records, setRecords] = useState<LearningRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [triggerFilter, setTriggerFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (triggerFilter) params.set('trigger', triggerFilter)
      const res = await fetch(`/api/ai/learning-records?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json() as ApiResponse
      setRecords(data.records)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [page, triggerFilter])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const handleFilterChange = (trigger: string) => {
    setTriggerFilter(trigger)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-th-text">
              {t('settings.aiLearning.title' as Parameters<typeof t>[0])}
            </h2>
            <span className="text-sm text-th-text-muted">{total} records</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-th-text-muted">
            {t('settings.aiLearning.description' as Parameters<typeof t>[0])}
          </p>

          {/* Trigger filter */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleFilterChange('')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                triggerFilter === ''
                  ? 'bg-th-accent text-white'
                  : 'bg-th-bg-secondary text-th-text-secondary hover:bg-th-bg-tertiary'
              }`}
            >
              {t('settings.aiLearning.allTriggers' as Parameters<typeof t>[0])}
            </button>
            {TRIGGER_OPTIONS.map((tr) => (
              <button
                key={tr}
                onClick={() => handleFilterChange(tr)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  triggerFilter === tr
                    ? 'bg-th-accent text-white'
                    : 'bg-th-bg-secondary text-th-text-secondary hover:bg-th-bg-tertiary'
                }`}
              >
                {t(`settings.aiLearning.triggers.${tr}` as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>

          {/* Records list */}
          {loading ? (
            <p className="py-8 text-center text-sm text-th-text-muted">{t('common.loading')}</p>
          ) : records.length === 0 ? (
            <p className="py-8 text-center text-sm text-th-text-muted">
              {t('settings.aiLearning.noRecords' as Parameters<typeof t>[0])}
            </p>
          ) : (
            <div className="space-y-3">
              {records.map((record) => {
                const isExpanded = expandedId === record.id
                return (
                  <div
                    key={record.id}
                    className="rounded-lg border border-th-border bg-th-bg-secondary"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${TRIGGER_COLORS[record.trigger] ?? 'bg-gray-100 text-gray-700'}`}>
                        {t(`settings.aiLearning.triggers.${record.trigger}` as Parameters<typeof t>[0])}
                      </span>
                      {record.violation_type && (
                        <span className="text-xs text-th-text-muted">{record.violation_type}</span>
                      )}
                      {record.reports?.draft_title && (
                        <span className="min-w-0 flex-1 truncate text-sm text-th-text-secondary">
                          {record.reports.draft_title}
                        </span>
                      )}
                      <span className="shrink-0 text-xs text-th-text-muted">
                        {new Date(record.created_at).toLocaleDateString()}
                      </span>
                      {record.outcome && (
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
                          record.outcome === 'success'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {record.outcome}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-th-text-muted" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-th-text-muted" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-th-border px-4 py-4 space-y-4">
                        {/* Feedback */}
                        {record.feedback && (
                          <div>
                            <p className="text-xs font-medium text-th-text-tertiary mb-1">
                              {t('settings.aiLearning.feedback' as Parameters<typeof t>[0])}
                            </p>
                            <p className="text-sm text-th-text-secondary">{record.feedback}</p>
                          </div>
                        )}

                        {/* Original vs Final Draft diff */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {record.original_draft && (
                            <div>
                              <p className="text-xs font-medium text-th-text-tertiary mb-1">
                                {t('settings.aiLearning.originalDraft' as Parameters<typeof t>[0])}
                              </p>
                              <div className="max-h-48 overflow-y-auto rounded-lg bg-th-bg-tertiary p-3 text-xs text-th-text-secondary whitespace-pre-wrap">
                                {record.original_draft}
                              </div>
                            </div>
                          )}
                          {record.final_draft && (
                            <div>
                              <p className="text-xs font-medium text-th-text-tertiary mb-1">
                                {t('settings.aiLearning.finalDraft' as Parameters<typeof t>[0])}
                              </p>
                              <div className="max-h-48 overflow-y-auto rounded-lg bg-th-bg-tertiary p-3 text-xs text-th-text-secondary whitespace-pre-wrap">
                                {record.final_draft}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Report link */}
                        {record.report_id && (
                          <a
                            href={`/reports/${record.report_id}`}
                            className="inline-block text-xs text-th-accent-text hover:underline"
                          >
                            View Report →
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ←
              </Button>
              <span className="flex items-center text-sm text-th-text-muted">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
