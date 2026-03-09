import { loadConfig } from './config.js'
import { createSentinelClient } from './api/sentinel-client.js'
import { createChatNotifier } from './notifications/google-chat.js'
import { createCrawlQueue, createCrawlWorker } from './scheduler/queue.js'
import { createJobProcessor } from './scheduler/jobs.js'
import { startScheduler } from './scheduler/scheduler.js'
import { createScSubmitQueue, createScSubmitWorker } from './sc-submit/queue.js'
import { processScSubmitJob } from './sc-submit/worker.js'
import { startScScheduler } from './sc-submit/scheduler.js'
import { startResubmitScheduler } from './sc-submit/resubmit-scheduler.js'
import { createBrSubmitQueue, createBrSubmitWorker } from './br-submit/queue.js'
import { processBrSubmitJob, closeBrBrowser } from './br-submit/worker.js'
import { startBrScheduler } from './br-submit/scheduler.js'
import { createBrMonitorQueue, createBrMonitorWorker } from './br-monitor/queue.js'
import { processBrMonitorJob, closeMonitorBrowser, setMonitorNotifier } from './br-monitor/worker.js'
import { startBrMonitorScheduler } from './br-monitor/scheduler.js'
import { createBrReplyQueue, createBrReplyWorker } from './br-reply/queue.js'
import { processBrReplyJob, setBrowserPageAccessor } from './br-reply/worker.js'
import { startBrReplyScheduler } from './br-reply/scheduler.js'
import { createHealthServer } from './health.js'
import { createVisionAnalyzer } from './ai/vision-analyzer.js'
import { log } from './logger.js'

const HEALTH_PORT = Number(process.env['PORT'] || '8080')
const startTime = Date.now()

// ─── Health state (헬스체크는 프로세스가 살아있는 한 항상 응답) ───
let redisConnected = false
let workerRunning = false
let initError: string | null = null

// 1. Health Check Server — 즉시 시작
// Queue reference for trigger endpoint
let crawlQueue: ReturnType<typeof createCrawlQueue> | null = null

// Browser API WebSocket URL for /fetch endpoint
const earlyBrowserWs = process.env['BRIGHTDATA_BROWSER_WS']

// AI Vision for /fetch endpoint (loaded early)
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

log('info', 'main', `Health server started on port ${HEALTH_PORT}`)

// 2. 나머지 초기화 (실패해도 프로세스는 살려둠)
const init = async (): Promise<void> => {
  log('info', 'main', 'Loading configuration...')
  const config = loadConfig()
  log('info', 'main', 'Configuration loaded successfully')

  const sentinelClient = createSentinelClient(config.sentinelApiUrl, config.serviceToken)

  const chatNotifier = createChatNotifier(config.googleChatWebhookUrl)

  // AI Vision (fetchVision과 동일 인스턴스 재사용)
  const vision = fetchVision
  if (vision) {
    log('info', 'main', 'AI Vision enabled (fallback mode)')
  } else {
    log('warn', 'main', 'AI Vision disabled — selector-only mode')
  }

  const redisUrl = config.redis.url
  log('info', 'main', `Connecting to Redis...`)
  const queue = createCrawlQueue(redisUrl)
  crawlQueue = queue
  const jobProcessor = createJobProcessor(config, sentinelClient, chatNotifier, vision)
  const worker = createCrawlWorker(redisUrl, jobProcessor, config.concurrency)

  worker.on('error', () => { workerRunning = false })
  worker.on('ready', () => { workerRunning = true; redisConnected = true })

  const schedulerInterval = await startScheduler(queue, sentinelClient)

  // SC Submit Queue + Worker + Schedulers
  const scQueue = createScSubmitQueue(redisUrl)
  const scWorker = createScSubmitWorker(redisUrl, async (job) => {
    const result = await processScSubmitJob(job)
    // Report result to Sentinel Web API
    await sentinelClient.reportScResult(result).catch((err) => {
      log('error', 'main', `Failed to report SC result: ${err instanceof Error ? err.message : String(err)}`)
    })
    return result
  })
  const scSchedulerInterval = startScScheduler(scQueue, sentinelClient)
  const resubmitSchedulerInterval = startResubmitScheduler(scQueue, sentinelClient)

  log('info', 'main', 'SC submit queue + worker + schedulers started')

  // BR Submit Queue + Worker + Scheduler
  const brQueue = createBrSubmitQueue(redisUrl)
  const brWorker = createBrSubmitWorker(redisUrl, async (job) => {
    const result = await processBrSubmitJob(job)
    await sentinelClient.reportBrResult(result).catch((err) => {
      log('error', 'main', `Failed to report BR result: ${err instanceof Error ? err.message : String(err)}`)
    })
    return result
  })
  const brSchedulerInterval = startBrScheduler(brQueue, sentinelClient)

  log('info', 'main', 'BR submit queue + worker + scheduler started')

  // BR Monitor Queue + Worker + Scheduler
  setMonitorNotifier(async (msg) => {
    if (config.googleChatWebhookUrl) {
      await chatNotifier.notifyMessage(msg).catch(() => {})
    }
  })
  const brMonitorQueue = createBrMonitorQueue(redisUrl)
  const brMonitorWorker = createBrMonitorWorker(redisUrl, async (job) => {
    await processBrMonitorJob(job, async (result) => {
      await sentinelClient.reportBrMonitorResult(result).catch((err) => {
        log('error', 'main', `Failed to report BR monitor result: ${err instanceof Error ? err.message : String(err)}`)
      })
    })
  })
  const brMonitorSchedulerInterval = startBrMonitorScheduler(brMonitorQueue, sentinelClient)

  log('info', 'main', 'BR monitor queue + worker + scheduler started')

  // BR Reply Queue + Worker + Scheduler (Browser 3 공유)
  // br-monitor의 ensureMonitorBrowser/ensureLoggedIn을 공유
  const { ensureMonitorBrowser, ensureLoggedIn: monitorEnsureLoggedIn } = await import('./br-monitor/worker.js')
  setBrowserPageAccessor(async () => {
    const { page } = await ensureMonitorBrowser()
    return { page, ensureLoggedIn: monitorEnsureLoggedIn }
  })
  const brReplyQueue = createBrReplyQueue(redisUrl)
  const brReplyWorker = createBrReplyWorker(redisUrl, async (job) => {
    await processBrReplyJob(job, async (result) => {
      await sentinelClient.reportBrReplyResult(result).catch((err) => {
        log('error', 'main', `Failed to report BR reply result: ${err instanceof Error ? err.message : String(err)}`)
      })
    })
  })
  const brReplySchedulerInterval = startBrReplyScheduler(brReplyQueue, sentinelClient)

  log('info', 'main', 'BR reply queue + worker + scheduler started')

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
    clearInterval(scSchedulerInterval)
    clearInterval(resubmitSchedulerInterval)
    clearInterval(brSchedulerInterval)
    clearInterval(brMonitorSchedulerInterval)
    clearInterval(brReplySchedulerInterval)
    healthServer.close()
    await brReplyWorker.close()
    await brReplyQueue.close()
    await closeMonitorBrowser()
    await brMonitorWorker.close()
    await brMonitorQueue.close()
    await closeBrBrowser()
    await brWorker.close()
    await brQueue.close()
    await scWorker.close()
    await scQueue.close()
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
