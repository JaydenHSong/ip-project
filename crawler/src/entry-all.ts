// Entry point: Legacy Monolith (all workers)
// SENTINEL_SERVICE=all (default, local dev & rollback)

import { loadConfig } from './config.js'
import { createSentinelClient } from './api/sentinel-client.js'
import { createChatNotifier } from './notifications/google-chat.js'
import { createCrawlQueue, createCrawlWorker } from './scheduler/queue.js'
import { createJobProcessor } from './scheduler/jobs.js'
import { startScheduler } from './scheduler/scheduler.js'
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
import { createHeartbeatMonitor } from './heartbeat.js'
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
  // 추가 에러 알림은 아래 workerAlertHandler에서 처리

  const schedulerInterval = await startScheduler(queue, sentinelClient)

  // BR Submit Queue + Worker + Scheduler
  const brQueue = createBrSubmitQueue(redisUrl)
  const brWorker = createBrSubmitWorker(redisUrl, async (job) => {
    const result = await processBrSubmitJob(job, sentinelClient)
    if (result.error === 'REPORT_DELETED') return result
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
    }, sentinelClient.verifyReportExists)
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
    }, sentinelClient.verifyReportExists)
  })
  const brReplySchedulerInterval = startBrReplyScheduler(brReplyQueue, sentinelClient)

  log('info', 'main', 'BR reply queue + worker + scheduler started')

  redisConnected = true
  workerRunning = true

  log('info', 'main', `Sentinel Crawler started (concurrency: ${config.concurrency})`)

  if (config.googleChatWebhookUrl) {
    await chatNotifier.notifyMessage('🚀 *[Sentinel Crawler]* 크롤러가 시작되었습니다.')
  }

  // ─── A1: Worker Down Alert (모든 워커 에러 → Google Chat 즉시 알림) ───
  const workerAlertHandler = (workerName: string) => (error: Error) => {
    log('error', 'main', `${workerName} error: ${error.message}`)
    if (config.googleChatWebhookUrl) {
      chatNotifier.notifyMessage(
        `🚨 *[Sentinel]* ${workerName} 에러 발생\n원인: ${error.message}\n시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'America/Los_Angeles' })}`
      ).catch(() => {})
    }
  }

  worker.on('error', workerAlertHandler('Crawl Worker'))
  brWorker.on('error', workerAlertHandler('BR Submit Worker'))
  brMonitorWorker.on('error', workerAlertHandler('BR Monitor Worker'))
  brReplyWorker.on('error', workerAlertHandler('BR Reply Worker'))
  // ─── A1 Heartbeat: 30s 간격으로 워커 활동 감지, 3회 연속 미활성 시 알림 ───
  const WORKER_NAMES = [
    'Crawl Worker',
    'BR Submit Worker',
    'BR Monitor Worker',
    'BR Reply Worker',
  ] as const

  const heartbeat = createHeartbeatMonitor(config.googleChatWebhookUrl, [...WORKER_NAMES])

  worker.on('completed', () => { heartbeat.recordActivity('Crawl Worker') })
  brWorker.on('completed', () => { heartbeat.recordActivity('BR Submit Worker') })
  brMonitorWorker.on('completed', () => { heartbeat.recordActivity('BR Monitor Worker') })
  brReplyWorker.on('completed', () => { heartbeat.recordActivity('BR Reply Worker') })
  log('info', 'main', 'Heartbeat monitor started (30s interval, alert after 3 misses)')

  // ─── A2: Daily Report (매일 09:00 KST = 16:00 PST 전날) ───
  const sendDailyReport = async (): Promise<void> => {
    if (!config.googleChatWebhookUrl) return

    try {
      const queues = [
        { name: 'Crawl', q: queue },
        { name: 'BR Submit', q: brQueue },
        { name: 'BR Monitor', q: brMonitorQueue },
        { name: 'BR Reply', q: brReplyQueue },
      ]

      const lines = ['📊 *[Sentinel]* Daily Report']
      const now = new Date()
      lines.push(`${now.toLocaleDateString('ko-KR', { timeZone: 'America/Los_Angeles' })} (PST)`)
      lines.push('')

      for (const { name, q } of queues) {
        const counts = await q.getJobCounts('completed', 'failed', 'waiting', 'active', 'delayed')
        lines.push(`*${name}*: ✅${counts.completed ?? 0} ❌${counts.failed ?? 0} ⏳${counts.waiting ?? 0} 🔄${counts.active ?? 0} ⏱${counts.delayed ?? 0}`)
      }

      lines.push('')
      lines.push(`Uptime: ${Math.floor((Date.now() - startTime) / 3600000)}h`)

      await chatNotifier.notifyMessage(lines.join('\n'))
      log('info', 'main', 'Daily report sent to Google Chat')
    } catch (err) {
      log('error', 'main', `Daily report failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 매 1시간마다 체크, 16:00 PST (= 09:00 KST) 이면 발송
  const dailyReportInterval = setInterval(async () => {
    const pstHour = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false })
    if (Number(pstHour) === 16) {
      await sendDailyReport()
    }
  }, 3600_000)

  // Graceful Shutdown
  const shutdown = async (signal: string): Promise<void> => {
    log('info', 'main', `Received ${signal}, shutting down gracefully...`)

    if (config.googleChatWebhookUrl) {
      await chatNotifier.notifyMessage('⏹ *[Sentinel Crawler]* 크롤러가 종료됩니다.')
    }

    heartbeat.stop()
    clearInterval(dailyReportInterval)
    clearInterval(schedulerInterval)
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
  // Init 실패 시 Google Chat 알림 (환경변수 직접 참조)
  const webhookUrl = process.env['GOOGLE_CHAT_WEBHOOK_URL']
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ text: `🔥 *[Sentinel]* 크롤러 초기화 실패!\n원인: ${msg}` }),
    }).catch(() => {})
  }
  // 프로세스 종료 안 함 — 헬스체크 서버는 계속 응답
})
