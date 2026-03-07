'use client'

import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

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

export const SystemStatusWidget = () => {
  const { t } = useI18n()
  const [data, setData] = useState<SystemStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/system/status')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as SystemStatusResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const getStatusLabel = (status: ComponentStatus): string => {
    const statusMap: Record<ComponentStatus, string> = {
      connected: t('settings.systemStatus.connected' as Parameters<typeof t>[0]),
      degraded: t('settings.systemStatus.degraded' as Parameters<typeof t>[0]),
      error: t('settings.systemStatus.error' as Parameters<typeof t>[0]),
    }
    return statusMap[status]
  }

  if (loading && !data) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex animate-pulse items-center justify-between rounded-lg border border-th-border bg-th-bg-secondary px-3 py-2.5">
            <div className="h-4 w-20 rounded bg-th-bg-hover" />
            <div className="h-5 w-16 rounded bg-th-bg-hover" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
        <span className="text-sm text-red-400">{error}</span>
        <Button variant="outline" size="sm" onClick={fetchStatus}>
          {t('settings.systemStatus.refresh' as Parameters<typeof t>[0])}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {data && (
          <span className="text-xs text-th-text-muted">
            {new Date(data.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
        <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
          {loading ? '...' : t('settings.systemStatus.refresh' as Parameters<typeof t>[0])}
        </Button>
      </div>
      <div className="space-y-2">
        {data?.components.map((component) => (
          <div key={component.name} className="flex items-center justify-between rounded-lg border border-th-border bg-th-bg-secondary px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium capitalize text-th-text">{component.name}</span>
              {component.latency !== undefined && (
                <span className="text-xs text-th-text-muted">{component.latency}ms</span>
              )}
            </div>
            <Badge variant={STATUS_BADGE_VARIANT[component.status]} dot>
              {getStatusLabel(component.status)}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
