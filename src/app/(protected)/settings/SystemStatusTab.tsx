'use client'

import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

type ComponentStatus = 'connected' | 'degraded' | 'error'

type SystemComponent = {
  name: string
  status: ComponentStatus
  latency?: number
  details?: Record<string, string>
}

type SystemStatusResponse = {
  components: SystemComponent[]
  timestamp: string
}

const STATUS_BADGE_VARIANT = {
  connected: 'success',
  degraded: 'warning',
  error: 'danger',
} as const

const COMPONENT_ICONS: Record<string, string> = {
  crawler: 'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z',
  ai: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z',
  database: 'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125',
}

export const SystemStatusTab = () => {
  const { t } = useI18n()
  const [data, setData] = useState<SystemStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/system/status')
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const json = await res.json() as SystemStatusResponse
      setData(json)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const getComponentLabel = (name: string): string => {
    const labelMap: Record<string, string> = {
      crawler: t('settings.systemStatus.crawler' as Parameters<typeof t>[0]),
      ai: t('settings.systemStatus.aiEngine' as Parameters<typeof t>[0]),
      database: t('settings.systemStatus.database' as Parameters<typeof t>[0]),
    }
    return labelMap[name] ?? name
  }

  const getStatusLabel = (status: ComponentStatus): string => {
    const statusMap: Record<ComponentStatus, string> = {
      connected: t('settings.systemStatus.connected' as Parameters<typeof t>[0]),
      degraded: t('settings.systemStatus.degraded' as Parameters<typeof t>[0]),
      error: t('settings.systemStatus.error' as Parameters<typeof t>[0]),
    }
    return statusMap[status]
  }

  const formatTimestamp = (iso: string): string => {
    const date = new Date(iso)
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-th-text">
          {t('settings.systemStatus.title' as Parameters<typeof t>[0])}
        </h3>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs text-th-text-muted">
              {t('settings.systemStatus.lastChecked' as Parameters<typeof t>[0])}: {formatTimestamp(data.timestamp)}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={loading}
          >
            {loading ? '...' : t('settings.systemStatus.refresh' as Parameters<typeof t>[0])}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent>
                <div className="animate-pulse space-y-3">
                  <div className="h-5 w-24 rounded bg-th-bg-secondary" />
                  <div className="h-6 w-20 rounded bg-th-bg-secondary" />
                  <div className="h-4 w-32 rounded bg-th-bg-secondary" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Status Cards */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          {data.components.map((component) => (
            <Card key={component.name}>
              <CardContent>
                <div className="space-y-4">
                  {/* Component name + icon */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-th-bg-secondary">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-5 w-5 text-th-text-muted"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d={COMPONENT_ICONS[component.name] ?? COMPONENT_ICONS.database}
                        />
                      </svg>
                    </div>
                    <h4 className="text-sm font-medium text-th-text">
                      {getComponentLabel(component.name)}
                    </h4>
                  </div>

                  {/* Status badge */}
                  <Badge
                    variant={STATUS_BADGE_VARIANT[component.status]}
                    dot
                  >
                    {getStatusLabel(component.status)}
                  </Badge>

                  {/* Latency */}
                  {component.latency !== undefined && (
                    <div className="text-xs text-th-text-muted">
                      {t('settings.systemStatus.latency' as Parameters<typeof t>[0])}: {component.latency}ms
                    </div>
                  )}

                  {/* Details */}
                  {component.details && Object.keys(component.details).length > 0 && (
                    <div className="space-y-1 border-t border-th-border pt-3">
                      {Object.entries(component.details).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="capitalize text-th-text-muted">{key}</span>
                          <span className="text-th-text">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
