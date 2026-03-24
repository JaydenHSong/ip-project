'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Button } from '@/components/ui/Button'
import { ChevronDown, Brain, BookOpen, TrendingUp, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

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
  'resolved',
  'unresolved',
  'resubmitted',
] as const

const TRIGGER_COLORS: Record<string, string> = {
  approved_edited: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  rewritten: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
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

  const triggerCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of records) {
      counts[r.trigger] = (counts[r.trigger] ?? 0) + 1
    }
    return counts
  }, [records])

  const successRate = useMemo(() => {
    const withOutcome = records.filter((r) => r.outcome)
    if (withOutcome.length === 0) return null
    const successes = withOutcome.filter((r) => r.outcome === 'success').length
    return Math.round((successes / withOutcome.length) * 100)
  }, [records])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-th-text">
            {t('settings.aiLearning.title' as Parameters<typeof t>[0])}
          </h2>
          <p className="mt-0.5 text-sm text-th-text-muted">
            {t('settings.aiLearning.description' as Parameters<typeof t>[0])}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-th-border bg-surface-card px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-th-accent" />
            <p className="text-xs text-th-text-muted">Total Records</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-th-text">{total}</p>
        </div>
        <div className="rounded-xl border border-th-border bg-surface-card px-4 py-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-st-success-text" />
            <p className="text-xs text-th-text-muted">Success Rate</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-th-text">
            {successRate !== null ? `${successRate}%` : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-th-border bg-surface-card px-4 py-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            <p className="text-xs text-th-text-muted">This Page</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-th-text">{records.length}</p>
        </div>
      </div>

      {/* Trigger filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => handleFilterChange('')}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            triggerFilter === ''
              ? 'bg-th-accent text-white'
              : 'bg-th-bg-secondary text-th-text-secondary hover:bg-th-bg-tertiary',
          )}
        >
          {t('settings.aiLearning.allTriggers' as Parameters<typeof t>[0])}
        </button>
        {TRIGGER_OPTIONS.map((tr) => (
          <button
            key={tr}
            onClick={() => handleFilterChange(tr)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              triggerFilter === tr
                ? 'bg-th-accent text-white'
                : 'bg-th-bg-secondary text-th-text-secondary hover:bg-th-bg-tertiary',
            )}
          >
            {t(`settings.aiLearning.triggers.${tr}` as Parameters<typeof t>[0])}
            {triggerCounts[tr] ? ` (${triggerCounts[tr]})` : ''}
          </button>
        ))}
      </div>

      {/* Records list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-th-bg-secondary" />)}
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-th-border bg-th-bg-secondary/50 px-4 py-12 text-center">
          <Brain className="mx-auto h-10 w-10 text-th-text-muted opacity-40" />
          <p className="mt-3 text-sm text-th-text-muted">
            {t('settings.aiLearning.noRecords' as Parameters<typeof t>[0])}
          </p>
          <p className="mt-1 text-xs text-th-text-muted">
            Learning records are created when reports are edited, approved, or resolved.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((record) => {
            const isExpanded = expandedId === record.id
            return (
              <div
                key={record.id}
                className={cn(
                  'overflow-hidden rounded-xl border transition-colors',
                  isExpanded ? 'border-th-accent/40 bg-th-accent/[0.02]' : 'border-th-border bg-surface-card',
                )}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-th-bg-hover/50"
                >
                  <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', TRIGGER_COLORS[record.trigger] ?? 'bg-gray-100 text-gray-700')}>
                    {t(`settings.aiLearning.triggers.${record.trigger}` as Parameters<typeof t>[0])}
                  </span>
                  {record.violation_type && (
                    <span className="shrink-0 rounded bg-th-bg-tertiary px-1.5 py-0.5 font-mono text-[10px] text-th-text-muted">
                      {record.violation_type}
                    </span>
                  )}
                  {record.reports?.draft_title && (
                    <span className="min-w-0 flex-1 truncate text-sm text-th-text-secondary">
                      {record.reports.draft_title}
                    </span>
                  )}
                  {!record.reports?.draft_title && <span className="flex-1" />}
                  {record.outcome && (
                    <span className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                      record.outcome === 'success'
                        ? 'bg-st-success-bg text-st-success-text'
                        : 'bg-th-bg-tertiary text-th-text-muted',
                    )}>
                      {record.outcome}
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-th-text-muted">
                    {new Date(record.created_at).toLocaleDateString('en-CA')}
                  </span>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-th-text-muted transition-transform', isExpanded && 'rotate-180')} />
                </button>

                {isExpanded && (
                  <div className="border-t border-th-border px-4 pb-4 pt-3 space-y-4">
                    {record.feedback && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-th-text-tertiary">
                          {t('settings.aiLearning.feedback' as Parameters<typeof t>[0])}
                        </p>
                        <p className="text-sm text-th-text-secondary">{record.feedback}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {record.original_draft && (
                        <div>
                          <p className="mb-1 text-xs font-medium text-th-text-tertiary">
                            {t('settings.aiLearning.originalDraft' as Parameters<typeof t>[0])}
                          </p>
                          <div className="max-h-48 overflow-y-auto rounded-lg bg-th-bg-tertiary p-3 text-xs text-th-text-secondary whitespace-pre-wrap">
                            {record.original_draft}
                          </div>
                        </div>
                      )}
                      {record.final_draft && (
                        <div>
                          <p className="mb-1 text-xs font-medium text-th-text-tertiary">
                            {t('settings.aiLearning.finalDraft' as Parameters<typeof t>[0])}
                          </p>
                          <div className="max-h-48 overflow-y-auto rounded-lg bg-th-bg-tertiary p-3 text-xs text-th-text-secondary whitespace-pre-wrap">
                            {record.final_draft}
                          </div>
                        </div>
                      )}
                    </div>

                    {record.report_id && (
                      <a
                        href={`/ip/reports/${record.report_id}`}
                        className="inline-flex items-center gap-1 text-xs text-th-accent-text hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Report
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
    </div>
  )
}
