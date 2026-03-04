import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { isDemoMode } from '@/lib/demo'
import { createClient } from '@/lib/supabase/server'

type SystemComponent = {
  name: string
  status: 'connected' | 'degraded' | 'error'
  latency?: number
  details?: Record<string, string>
}

type SystemStatusResponse = {
  components: SystemComponent[]
  timestamp: string
}

const checkCrawler = async (): Promise<SystemComponent> => {
  const crawlerUrl = process.env.CRAWLER_HEALTH_URL

  if (!crawlerUrl) {
    return {
      name: 'crawler',
      status: 'error',
      details: { reason: 'Not configured' },
    }
  }

  try {
    const start = Date.now()
    const res = await fetch(`${crawlerUrl}/health`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    const latency = Date.now() - start

    if (!res.ok) {
      return {
        name: 'crawler',
        status: 'error',
        latency,
        details: { reason: `HTTP ${res.status}` },
      }
    }

    const data = await res.json() as { status: string; redis?: boolean; worker?: boolean }

    if (data.status === 'degraded') {
      return {
        name: 'crawler',
        status: 'degraded',
        latency,
        details: {
          redis: data.redis ? 'OK' : 'Down',
          worker: data.worker ? 'OK' : 'Down',
        },
      }
    }

    return {
      name: 'crawler',
      status: 'connected',
      latency,
      details: {
        redis: data.redis ? 'OK' : 'Down',
        worker: data.worker ? 'OK' : 'Down',
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed'
    return {
      name: 'crawler',
      status: 'error',
      details: { reason: message },
    }
  }
}

const checkClaudeAI = (): SystemComponent => {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return {
      name: 'ai',
      status: 'error',
      details: { reason: 'Not configured' },
    }
  }

  return {
    name: 'ai',
    status: 'connected',
  }
}

const checkSupabase = async (): Promise<SystemComponent> => {
  try {
    const supabase = await createClient()
    const start = Date.now()

    const { error: selectError } = await supabase
      .from('system_configs')
      .select('id')
      .limit(1)

    const latency = Date.now() - start

    if (selectError) {
      return {
        name: 'database',
        status: latency < 3000 ? 'degraded' : 'error',
        latency,
        details: { reason: selectError.message },
      }
    }

    if (latency >= 3000) {
      return {
        name: 'database',
        status: 'error',
        latency,
      }
    }

    if (latency >= 1000) {
      return {
        name: 'database',
        status: 'degraded',
        latency,
      }
    }

    return {
      name: 'database',
      status: 'connected',
      latency,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed'
    return {
      name: 'database',
      status: 'error',
      details: { reason: message },
    }
  }
}

// GET /api/system/status — System health overview (Admin only)
export const GET = withAuth(async () => {
  if (isDemoMode()) {
    const mockResponse: SystemStatusResponse = {
      components: [
        { name: 'crawler', status: 'connected', latency: 45, details: { redis: 'OK', worker: 'OK' } },
        { name: 'ai', status: 'connected' },
        { name: 'database', status: 'connected', latency: 12 },
      ],
      timestamp: new Date().toISOString(),
    }
    return NextResponse.json(mockResponse)
  }

  const [crawler, database] = await Promise.all([
    checkCrawler(),
    checkSupabase(),
  ])

  const ai = checkClaudeAI()

  const response: SystemStatusResponse = {
    components: [crawler, ai, database],
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(response)
}, ['admin'])
