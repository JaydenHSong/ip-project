import { loadConfig } from './config.js'
import { createSentinelClient } from './api/sentinel-client.js'
import { createProxyManager } from './anti-bot/proxy.js'
import { createChatNotifier } from './notifications/google-chat.js'
import { createCrawlQueue, createCrawlWorker } from './scheduler/queue.js'
import { createJobProcessor } from './scheduler/jobs.js'
import { startScheduler } from './scheduler/scheduler.js'
import { createHealthServer } from './health.js'
import { log } from './logger.js'

const PROXY_POOL_SIZE = 5
const HEALTH_PORT = Number(process.env['PORT'] || '8080')
const startTime = Date.now()

// ─── Health state (헬스체크는 프로세스가 살아있는 한 항상 응답) ───
let redisConnected = false
let workerRunning = false
let initError: string | null = null

// 1. Health Check Server — 즉시 시작
// Queue reference for trigger endpoint
let crawlQueue: ReturnType<typeof createCrawlQueue> | null = null

// Proxy config for /fetch endpoint (loaded early, before full init)
const proxyHost = process.env['BRIGHTDATA_PROXY_HOST']
const proxyPort = Number(process.env['BRIGHTDATA_PROXY_PORT'] || '33335')
const proxyUser = process.env['BRIGHTDATA_PROXY_USER']
const proxyPass = process.env['BRIGHTDATA_PROXY_PASS']
const fetchProxyConfig = proxyHost && proxyUser && proxyPass
  ? { host: proxyHost, port: proxyPort, username: proxyUser, password: proxyPass, protocol: 'http' as const }
  : undefined

const healthServer = createHealthServer({
  port: HEALTH_PORT,
  getStatus: () => ({
    status: initError ? 'error' : redisConnected && workerRunning ? 'ok' : 'degraded',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    redis: redisConnected,
    worker: workerRunning,
    timestamp: new Date().toISOString(),
    ...(initError ? { error: initError } : {}),
  }),
  get queue() { return crawlQueue ?? undefined },
  serviceToken: process.env['CRAWLER_SERVICE_TOKEN'],
  proxyConfig: fetchProxyConfig,
})

log('info', 'main', `Health server started on port ${HEALTH_PORT}`)

// 2. 나머지 초기화 (실패해도 프로세스는 살려둠)
const init = async (): Promise<void> => {
  log('info', 'main', 'Loading configuration...')
  const config = loadConfig()
  log('info', 'main', 'Configuration loaded successfully')

  const sentinelClient = createSentinelClient(config.sentinelApiUrl, config.serviceToken)

  const proxyManager = createProxyManager(
    {
      host: config.proxy.host,
      port: config.proxy.port,
      username: config.proxy.username,
      password: config.proxy.password,
      protocol: 'http',
    },
    PROXY_POOL_SIZE,
  )

  const chatNotifier = createChatNotifier(config.googleChatWebhookUrl)

  const redisUrl = config.redis.url
  log('info', 'main', `Connecting to Redis...`)
  const queue = createCrawlQueue(redisUrl)
  crawlQueue = queue
  const jobProcessor = createJobProcessor(config, sentinelClient, proxyManager, chatNotifier)
  const worker = createCrawlWorker(redisUrl, jobProcessor, config.concurrency)

  worker.on('error', () => { workerRunning = false })
  worker.on('ready', () => { workerRunning = true; redisConnected = true })

  const schedulerInterval = await startScheduler(queue, sentinelClient)

  redisConnected = true
  workerRunning = true

  log('info', 'main', `Sentinel Crawler started (concurrency: ${config.concurrency})`)

  if (config.googleChatWebhookUrl) {
    await chatNotifier.notifyMessage('🚀 *[Sentinel Crawler]* 크롤러가 시작되었습니다.')
  }

  // Graceful Shutdown
  const shutdown = async (signal: string): Promise<void> => {
    log('info', 'main', `Received ${signal}, shutting down gracefully...`)

    if (config.googleChatWebhookUrl) {
      await chatNotifier.notifyMessage('⏹ *[Sentinel Crawler]* 크롤러가 종료됩니다.')
    }

    clearInterval(schedulerInterval)
    healthServer.close()
    await worker.close()
    await queue.close()
    log('info', 'main', 'Shutdown complete')
    process.exit(0)
  }

  process.on('SIGTERM', () => { shutdown('SIGTERM').catch(() => process.exit(1)) })
  process.on('SIGINT', () => { shutdown('SIGINT').catch(() => process.exit(1)) })
}

init().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error)
  initError = msg
  log('error', 'main', `Init failed (health server still running): ${msg}`, {
    error: error instanceof Error ? error.stack : String(error),
  })
  // 프로세스 종료 안 함 — 헬스체크 서버는 계속 응답
})
