import { createServer, type Server } from 'node:http'
import { log } from './logger.js'

type HealthStatus = {
  status: 'ok' | 'degraded' | 'error'
  uptime: number
  redis: boolean
  worker: boolean
  timestamp: string
}

type HealthCheckFn = () => HealthStatus

const createHealthServer = (port: number, getStatus: HealthCheckFn): Server => {
  const server = createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      const status = getStatus()
      const statusCode = status.status === 'ok' ? 200 : status.status === 'degraded' ? 200 : 503

      res.writeHead(statusCode, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(status))
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  })

  server.listen(port, () => {
    log('info', 'health', `Health check server listening on :${port}/health`)
  })

  return server
}

export { createHealthServer }
export type { HealthStatus, HealthCheckFn }
