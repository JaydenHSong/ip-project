'use client'

import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

type CrawlerLog = {
  id: string
  type: string
  campaign_id: string | null
  keyword: string | null
  marketplace: string | null
  pages_crawled: number | null
  listings_found: number | null
  listings_sent: number | null
  new_listings: number | null
  duplicates: number | null
  errors: number | null
  captchas: number | null
  proxy_rotations: number | null
  duration_ms: number | null
  message: string | null
  asin: string | null
  error_code: string | null
  created_at: string
}

type LogSummary = {
  total_crawls: number
  successful: number
  failed: number
  total_listings_found: number
  total_new_listings: number
  total_bans: number
  total_captchas: number
}

type LogsResponse = {
  logs: CrawlerLog[]
  summary: LogSummary
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const TYPE_STYLES: Record<string, { bg: string; label: string }> = {
  crawl_complete: { bg: 'bg-green-500/10 text-green-400', label: 'Complete' },
  crawl_error: { bg: 'bg-red-500/10 text-red-400', label: 'Error' },
  proxy_ban: { bg: 'bg-red-500/10 text-red-400', label: 'Ban' },
  captcha: { bg: 'bg-yellow-500/10 text-yellow-400', label: 'Captcha' },
  rate_limit: { bg: 'bg-yellow-500/10 text-yellow-400', label: 'Rate Limit' },
  api_error: { bg: 'bg-orange-500/10 text-orange-400', label: 'API Error' },
}

const DAYS_OPTIONS = [
  { value: 1, label: 'Today' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
]

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

const formatTime = (isoString: string): string => {
  const date = new Date(isoString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (isoString: string): string => {
  const date = new Date(isoString)
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export const CrawlerLogsDashboard = () => {
  const { t } = useI18n()
  const [data, setData] = useState<LogsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterDays, setFilterDays] = useState(7)
  const [page, setPage] = useState(1)

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        days: String(filterDays),
        page: String(page),
        limit: '50',
      })
      if (filterType) params.set('type', filterType)

      const res = await fetch(`/api/crawler/logs?${params}`)
      if (res.ok) {
        const json = await res.json() as LogsResponse
        setData(json)
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [filterType, filterDays, page])

  useEffect(() => {
    setLoading(true)
    fetchLogs()
  }, [fetchLogs])

  const handleRefresh = () => {
    setLoading(true)
    fetchLogs()
  }

  const summary = data?.summary
  const logs = data?.logs ?? []
  const pagination = data?.pagination

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-th-text">
            {t('settings.crawler.logs.title' as Parameters<typeof t>[0])}
          </h3>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            {loading ? '...' : t('settings.crawler.logs.refresh' as Parameters<typeof t>[0])}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <p className="text-xs text-blue-400">
                  {t('settings.crawler.logs.summary.crawls' as Parameters<typeof t>[0])}
                </p>
                <p className="text-xl font-bold text-blue-400">{summary.total_crawls}</p>
                <p className="text-xs text-blue-400/70">
                  {summary.successful} ok / {summary.failed} err
                </p>
              </div>
              <div className="rounded-lg bg-purple-500/10 p-3">
                <p className="text-xs text-purple-400">
                  {t('settings.crawler.logs.summary.listings' as Parameters<typeof t>[0])}
                </p>
                <p className="text-xl font-bold text-purple-400">{summary.total_listings_found}</p>
                <p className="text-xs text-purple-400/70">found</p>
              </div>
              <div className="rounded-lg bg-green-500/10 p-3">
                <p className="text-xs text-green-400">
                  {t('settings.crawler.logs.summary.newListings' as Parameters<typeof t>[0])}
                </p>
                <p className="text-xl font-bold text-green-400">{summary.total_new_listings}</p>
                <p className="text-xs text-green-400/70">new</p>
              </div>
              <div className={`rounded-lg p-3 ${summary.total_bans > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                <p className={`text-xs ${summary.total_bans > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {t('settings.crawler.logs.summary.bans' as Parameters<typeof t>[0])}
                </p>
                <p className={`text-xl font-bold ${summary.total_bans > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {summary.total_bans}
                </p>
                <p className={`text-xs ${summary.total_bans > 0 ? 'text-red-400/70' : 'text-green-400/70'}`}>
                  {summary.total_captchas} captcha
                </p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
              className="rounded-md border border-th-border bg-th-bg-secondary px-3 py-1.5 text-sm text-th-text"
            >
              <option value="">
                {t('settings.crawler.logs.filters.allTypes' as Parameters<typeof t>[0])}
              </option>
              {Object.keys(TYPE_STYLES).map((type) => (
                <option key={type} value={type}>
                  {t(`settings.crawler.logs.types.${type}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
            <select
              value={filterDays}
              onChange={(e) => { setFilterDays(Number(e.target.value)); setPage(1) }}
              className="rounded-md border border-th-border bg-th-bg-secondary px-3 py-1.5 text-sm text-th-text"
            >
              {DAYS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(`settings.crawler.logs.filters.${opt.value === 1 ? 'today' : `days${opt.value}`}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </div>

          {/* Log Table */}
          {loading && !data ? (
            <div className="text-th-text-muted">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-th-text-muted">
              {t('settings.crawler.logs.table.noLogs' as Parameters<typeof t>[0])}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-th-border text-left text-th-text-muted">
                      <th className="px-3 py-2">
                        {t('settings.crawler.logs.table.time' as Parameters<typeof t>[0])}
                      </th>
                      <th className="px-3 py-2">
                        {t('settings.crawler.logs.table.keyword' as Parameters<typeof t>[0])}
                      </th>
                      <th className="px-3 py-2">
                        {t('settings.crawler.logs.table.type' as Parameters<typeof t>[0])}
                      </th>
                      <th className="px-3 py-2 text-right">
                        {t('settings.crawler.logs.table.new' as Parameters<typeof t>[0])}
                      </th>
                      <th className="px-3 py-2 text-right">
                        {t('settings.crawler.logs.table.errors' as Parameters<typeof t>[0])}
                      </th>
                      <th className="px-3 py-2 text-right">
                        {t('settings.crawler.logs.table.duration' as Parameters<typeof t>[0])}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const style = TYPE_STYLES[log.type] ?? TYPE_STYLES.crawl_error
                      const isComplete = log.type === 'crawl_complete'
                      const isError = !isComplete

                      return (
                        <tr key={log.id} className="border-b border-th-border/50">
                          <td className="px-3 py-2 text-th-text-muted">
                            <div>{formatTime(log.created_at)}</div>
                            <div className="text-xs">{formatDate(log.created_at)}</div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-th-text">
                              {log.keyword ?? '-'}
                              {log.marketplace && (
                                <span className="ml-1 text-xs text-th-text-muted">({log.marketplace})</span>
                              )}
                            </div>
                            {isError && log.message && (
                              <div className="mt-0.5 text-xs text-red-400">
                                {log.message}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style.bg}`}>
                              {t(`settings.crawler.logs.types.${log.type}` as Parameters<typeof t>[0])}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-th-text-secondary">
                            {isComplete ? (log.new_listings ?? 0) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-th-text-secondary">
                            {isComplete ? (log.errors ?? 0) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-th-text-secondary">
                            {log.duration_ms ? formatDuration(log.duration_ms) : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-th-text-muted">
                    {pagination.total} logs
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Prev
                    </Button>
                    <span className="flex items-center text-sm text-th-text-muted">
                      {page} / {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
