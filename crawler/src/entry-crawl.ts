// Entry point: sentinel-crawl (Campaign crawling only)
// SENTINEL_SERVICE=crawl

import { loadConfig } from './config.js'
import { createSentinelClient } from './api/sentinel-client.js'
import { createChatNotifier } from './notifications/google-chat.js'
import { createCrawlQueue, createCrawlWorker } from './scheduler/queue.js'
import { createJobProcessor } from './scheduler/jobs.js'
import { startScheduler } from './scheduler/scheduler.js'
import { createHealthServer } from './health.js'
import { createHeartbeatMonitor } from './heartbeat.js'
import { createVisionAnalyzer } from './ai/vision-analyzer.js'
import { log } from './logger.js'

const HEALTH_PORT = Number(process.env['PORT'] || '8080')
const startTime = Date.now()

let redisConnected = false
let workerRunning = false
let initError: string | null = null
let crawlQueue: ReturnType<typeof createCrawlQueue> | null = null

const earlyBrowserWs = process.env['BRIGHTDATA_BROWSER_WS']
const earlyAnthropicKey = process.env['ANTHROPIC_API_KEY']
const earlyAiEnabled = process.env['AI_VISION_ENABLED'] !== 'false'
const fetchVision = earlyAnthropicKey && earlyAiEnabled
  ? createVisionAnalyzer(earlyAnthropicKey, process.env['AI_VISION_MODEL'])
  : null

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
  browserWs: earlyBrowserWs,
  vision: fetchVision,
})

log('info', 'main', `[sentinel-crawl] Health server started on port ${HEALTH_PORT}`)

const init = async (): Promise<void> => {
  const config = loadConfig('crawl')
  const sentinelClient = createSentinelClient(config.sentinelApiUrl, config.serviceToken)
  const chatNotifier = createChatNotifier(config.googleChatWebhookUrl)
  const vision = fetchVision

  if (vision) {
    log('info', 'main', 'AI Vision enabled')
  }

  const redisUrl = config.redis.url
  const queue = createCrawlQueue(redisUrl)
  crawlQueue = queue
  const jobProcessor = createJobProcessor(config, sentinelClient, chatNotifier, vision)
  const worker = createCrawlWorker(redisUrl, jobProcessor, config.concurrency)

  worker.on('error', () => { workerRunning = false })
  worker.on('ready', () => { workerRunning = true; redisConnected = true })

  const schedulerInterval = await startScheduler(queue, sentinelClient)

  redisConnected = true
  workerRunning = true

  log('info', 'main', `[sentinel-crawl] Started (concurrency: ${config.concurrency})`)

  if (config.googleChatWebhookUrl) {
    await chatNotifier.notifyMessage('🚀 *[sentinel-crawl]* 크롤 서비스가 시작되었습니다.')
  }

  // Worker error alert
  worker.on('error', (error: Error) => {
    log('error', 'main', `Crawl Worker error: ${error.message}`)
    if (config.googleChatWebhookUrl) {
      chatNotifier.notifyMessage(
        `🚨 *[sentinel-crawl]* Crawl Worker 에러\n원인: ${error.message}\n시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'America/Los_Angeles' })}`
      ).catch(() => {})
    }
  })

  // Heartbeat
  const heartbeat = createHeartbeatMonitor(config.googleChatWebhookUrl, ['Crawl Worker'])
  worker.on('completed', () => { heartbeat.recordActivity('Crawl Worker') })

  // Daily Report
  const sendDailyReport = async (): Promise<void> => {
    if (!config.googleChatWebhookUrl) return
    try {
      const counts = await queue.getJobCounts('completed', 'failed', 'waiting', 'active', 'delayed')
      const lines = [
        '📊 *[sentinel-crawl]* Daily Report',
        `${new Date().toLocaleDateString('ko-KR', { timeZone: 'America/Los_Angeles' })} (PST)`,
        '',
        `*Crawl*: ✅${counts.completed ?? 0} ❌${counts.failed ?? 0} ⏳${counts.waiting ?? 0} 🔄${counts.active ?? 0} ⏱${counts.delayed ?? 0}`,
        '',
        `Uptime: ${Math.floor((Date.now() - startTime) / 3600000)}h`,
      ]
      await chatNotifier.notifyMessage(lines.join('\n'))
    } catch (err) {
      log('error', 'main', `Daily report failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const dailyReportInterval = setInterval(async () => {
    const pstHour = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false })
    if (Number(pstHour) === 16) await sendDailyReport()
  }, 3600_000)

  // Graceful Shutdown
  const shutdown = async (signal: string): Promise<void> => {
    log('info', 'main', `[sentinel-crawl] ${signal}, shutting down...`)
    if (config.googleChatWebhookUrl) {
      await chatNotifier.notifyMessage('⏹ *[sentinel-crawl]* 크롤 서비스가 종료됩니다.')
    }
    heartbeat.stop()
    clearInterval(dailyReportInterval)
    clearInterval(schedulerInterval)
    healthServer.close()
    await worker.close()
    await queue.close()
    log('info', 'main', '[sentinel-crawl] Shutdown complete')
    process.exit(0)
  }

  process.on('SIGTERM', () => { shutdown('SIGTERM').catch(() => process.exit(1)) })
  process.on('SIGINT', () => { shutdown('SIGINT').catch(() => process.exit(1)) })
}

init().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error)
  initError = msg
  log('error', 'main', `[sentinel-crawl] Init failed: ${msg}`)
  const webhookUrl = process.env['GOOGLE_CHAT_WEBHOOK_URL']
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ text: `🔥 *[sentinel-crawl]* 초기화 실패!\n원인: ${msg}` }),
    }).catch(() => {})
  }
})
