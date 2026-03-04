'use client'

import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CrawlerLogsDashboard } from './CrawlerLogsDashboard'

type CrawlerSettingsProps = {
  isAdmin?: boolean
}

type CrawlerStatus = {
  connected: boolean
  status: 'ok' | 'degraded' | 'error' | 'disconnected'
  uptime: number | null
  redis: boolean | null
  worker: boolean | null
  timestamp: string | null
  url: string | null
  error?: string
}

const formatUptime = (seconds: number): string => {
  if (seconds < 60) return '< 1m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const STATUS_STYLES: Record<CrawlerStatus['status'], { dot: string; bg: string }> = {
  ok: { dot: 'bg-green-500', bg: 'bg-green-500/10 text-green-400' },
  degraded: { dot: 'bg-yellow-500', bg: 'bg-yellow-500/10 text-yellow-400' },
  error: { dot: 'bg-red-500', bg: 'bg-red-500/10 text-red-400' },
  disconnected: { dot: 'bg-gray-400', bg: 'bg-gray-500/10 text-gray-400' },
}

export const CrawlerSettings = ({ isAdmin }: CrawlerSettingsProps) => {
  const { t } = useI18n()
  const [status, setStatus] = useState<CrawlerStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/crawler-status')
      const data = await res.json() as CrawlerStatus
      setStatus(data)
    } catch {
      setStatus({
        connected: false,
        status: 'error',
        uptime: null,
        redis: null,
        worker: null,
        timestamp: null,
        url: null,
        error: 'Failed to fetch status',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleRefresh = async () => {
    setLoading(true)
    await fetchStatus()
  }

  const style = status ? STATUS_STYLES[status.status] : STATUS_STYLES.disconnected
  const statusLabel = status
    ? t(`settings.crawler.status.${status.status}` as Parameters<typeof t>[0])
    : ''

  return (
    <div className="space-y-6">
      {/* Crawler Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-th-text">
              {t('settings.crawler.status.title' as Parameters<typeof t>[0])}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? '...' : t('settings.crawler.status.refresh' as Parameters<typeof t>[0])}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !status ? (
            <div className="text-th-text-muted">Loading...</div>
          ) : status ? (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${style.bg}`}>
                  <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                  {statusLabel}
                </span>
                {status.uptime !== null && (
                  <span className="text-sm text-th-text-muted">
                    {t('settings.crawler.status.uptime' as Parameters<typeof t>[0])}: {formatUptime(status.uptime)}
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {status.url && (
                  <div>
                    <span className="text-th-text-muted">{t('settings.crawler.status.url' as Parameters<typeof t>[0])}</span>
                    <p className="font-mono text-th-text">{status.url}</p>
                  </div>
                )}
                {status.redis !== null && (
                  <div>
                    <span className="text-th-text-muted">{t('settings.crawler.status.redis' as Parameters<typeof t>[0])}</span>
                    <p className="text-th-text">{status.redis ? '✓ Connected' : '✗ Disconnected'}</p>
                  </div>
                )}
                {status.worker !== null && (
                  <div>
                    <span className="text-th-text-muted">{t('settings.crawler.status.worker' as Parameters<typeof t>[0])}</span>
                    <p className="text-th-text">{status.worker ? '✓ Running' : '✗ Stopped'}</p>
                  </div>
                )}
              </div>

              {/* Error message */}
              {status.error && (
                <p className="text-sm text-red-400">{status.error}</p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Crawler Logs Dashboard */}
      <CrawlerLogsDashboard />

    </div>
  )
}
