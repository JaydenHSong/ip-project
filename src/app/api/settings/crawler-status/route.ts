import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'

type CrawlerHealthResponse = {
  status: 'ok' | 'degraded' | 'error'
  uptime: number
  redis: boolean
  worker: boolean
  timestamp: string
}

type CrawlerStatusResponse = {
  connected: boolean
  status: 'ok' | 'degraded' | 'error' | 'disconnected'
  uptime: number | null
  redis: boolean | null
  worker: boolean | null
  timestamp: string | null
  url: string | null
  error?: string
}

// GET /api/settings/crawler-status — Crawler health proxy
export const GET = withAuth(async () => {
  const crawlerUrl = process.env.CRAWLER_HEALTH_URL

  if (!crawlerUrl) {
    return NextResponse.json<CrawlerStatusResponse>({
      connected: false,
      status: 'disconnected',
      uptime: null,
      redis: null,
      worker: null,
      timestamp: null,
      url: null,
      error: 'CRAWLER_HEALTH_URL not configured',
    })
  }

  try {
    const res = await fetch(`${crawlerUrl}/health`, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json<CrawlerStatusResponse>({
        connected: false,
        status: 'error',
        uptime: null,
        redis: null,
        worker: null,
        timestamp: null,
        url: new URL(crawlerUrl).hostname,
        error: `HTTP ${res.status}`,
      })
    }

    const data = await res.json() as CrawlerHealthResponse

    return NextResponse.json<CrawlerStatusResponse>({
      connected: true,
      status: data.status,
      uptime: data.uptime,
      redis: data.redis,
      worker: data.worker,
      timestamp: data.timestamp,
      url: new URL(crawlerUrl).hostname,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed'

    return NextResponse.json<CrawlerStatusResponse>({
      connected: false,
      status: 'error',
      uptime: null,
      redis: null,
      worker: null,
      timestamp: null,
      url: new URL(crawlerUrl).hostname,
      error: message,
    })
  }
}, ['owner', 'admin'])
