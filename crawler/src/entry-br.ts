// Entry point: sentinel-br (BR Submit + Monitor + Reply)
// SENTINEL_SERVICE=br

import { loadConfig } from './config.js'
import { createSentinelClient } from './api/sentinel-client.js'
import { createChatNotifier } from './notifications/google-chat.js'
import { createBrSubmitQueue, createBrSubmitWorker } from './br-submit/queue.js'
import { processBrSubmitJob, closeBrBrowser, submitSessionManager, setSubmitNotifier } from './br-submit/worker.js'
import { startBrScheduler } from './br-submit/scheduler.js'
import { createBrMonitorQueue, createBrMonitorWorker } from './br-monitor/queue.js'
import { processBrMonitorJob, closeMonitorBrowser, setMonitorNotifier, checkAndKeepalive, monitorSessionManager, setMonitorSessionNotifier } from './br-monitor/worker.js'
import { startBrMonitorScheduler } from './br-monitor/scheduler.js'
import { createBrReplyQueue, createBrReplyWorker } from './br-reply/queue.js'
import { processBrReplyJob, setBrowserPageAccessor } from './br-reply/worker.js'
import { startBrReplyScheduler } from './br-reply/scheduler.js'
import { createHealthServer } from './health.js'
import { createHeartbeatMonitor } from './heartbeat.js'
import { log } from './logger.js'

const HEALTH_PORT = Number(process.env['PORT'] || '8080')
const startTime = Date.now()

let redisConnected = false
let workerRunning = false
let initError: string | null = null

const healthServer = createHealthServer({
  port: HEALTH_PORT,
  getStatus: () => ({
    status: initError ? 'error' : redisConnected && workerRunning ? 'ok' : 'degraded',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    redis: redisConnected,
    worker: workerRunning,
    timestamp: new Date().toISOString(),
    brSession: {
      submit: submitSessionManager.getStatus(),
      monitor: monitorSessionManager.getStatus(),
    },
    ...(initError ? { error: initError } : {}),
  }),
  serviceToken: process.env['CRAWLER_SERVICE_TOKEN'],
})

log('info', 'main', `[sentinel-br] Health server started on port ${HEALTH_PORT}`)

const init = async (): Promise<void> => {
  const config = loadConfig('br')
  const sentinelClient = createSentinelClient(config.sentinelApiUrl, config.serviceToken)
  const chatNotifier = createChatNotifier(config.googleChatWebhookUrl)

  const redisUrl = config.redis.url

  // Session notifiers (CAPTCHA/세션 만료 알림용)
  if (config.googleChatWebhookUrl) {
    const sessionNotify = async (msg: string) => { await chatNotifier.notifyMessage(msg).catch(() => {}) }
    setSubmitNotifier(sessionNotify)
    setMonitorSessionNotifier(sessionNotify)
  }

  // BR Submit
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

  // BR Monitor
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
    }, sentinelClient.verifyReportExists, sentinelClient)
  })
  const brMonitorSchedulerInterval = startBrMonitorScheduler(brMonitorQueue, sentinelClient)
  log('info', 'main', 'BR monitor queue + worker + scheduler started')

  // Session keepalive — monitor 주기 완료 후 체크
  brMonitorWorker.on('completed', async () => {
    try {
      const { ensureMonitorBrowser: getMonBrowser } = await import('./br-monitor/worker.js')
      const { page } = await getMonBrowser()
      await checkAndKeepalive(page)
    } catch (err) {
      log('warn', 'main', `Keepalive check failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  // BR Reply (Monitor 브라우저 공유)
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

  log('info', 'main', '[sentinel-br] Started')

  if (config.googleChatWebhookUrl) {
    await chatNotifier.notifyMessage('🚀 *[sentinel-br]* BR 서비스가 시작되었습니다.')
  }

  // Worker error alerts
  const workerAlertHandler = (workerName: string) => (error: Error) => {
    log('error', 'main', `${workerName} error: ${error.message}`)
    if (config.googleChatWebhookUrl) {
      chatNotifier.notifyMessage(
        `🚨 *[sentinel-br]* ${workerName} 에러\n원인: ${error.message}\n시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'America/Los_Angeles' })}`
      ).catch(() => {})
    }
  }

  brWorker.on('error', workerAlertHandler('BR Submit Worker'))
  brMonitorWorker.on('error', workerAlertHandler('BR Monitor Worker'))
  brReplyWorker.on('error', workerAlertHandler('BR Reply Worker'))

  // Heartbeat
  const heartbeat = createHeartbeatMonitor(config.googleChatWebhookUrl, [
    'BR Submit Worker',
    'BR Monitor Worker',
    'BR Reply Worker',
  ])
  brWorker.on('completed', () => { heartbeat.recordActivity('BR Submit Worker') })
  brMonitorWorker.on('completed', () => { heartbeat.recordActivity('BR Monitor Worker') })
  brReplyWorker.on('completed', () => { heartbeat.recordActivity('BR Reply Worker') })

  // Daily Report
  const sendDailyReport = async (): Promise<void> => {
    if (!config.googleChatWebhookUrl) return
    try {
      const queues = [
        { name: 'BR Submit', q: brQueue },
        { name: 'BR Monitor', q: brMonitorQueue },
        { name: 'BR Reply', q: brReplyQueue },
      ]
      const lines = [
        '📊 *[sentinel-br]* Daily Report',
        `${new Date().toLocaleDateString('ko-KR', { timeZone: 'America/Los_Angeles' })} (PST)`,
        '',
      ]
      for (const { name, q } of queues) {
        const counts = await q.getJobCounts('completed', 'failed', 'waiting', 'active', 'delayed')
        lines.push(`*${name}*: ✅${counts.completed ?? 0} ❌${counts.failed ?? 0} ⏳${counts.waiting ?? 0} 🔄${counts.active ?? 0} ⏱${counts.delayed ?? 0}`)
      }
      lines.push('', `Uptime: ${Math.floor((Date.now() - startTime) / 3600000)}h`)
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
    log('info', 'main', `[sentinel-br] ${signal}, shutting down...`)
    if (config.googleChatWebhookUrl) {
      await chatNotifier.notifyMessage('⏹ *[sentinel-br]* BR 서비스가 종료됩니다.')
    }
    heartbeat.stop()
    clearInterval(dailyReportInterval)
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
    log('info', 'main', '[sentinel-br] Shutdown complete')
    process.exit(0)
  }

  process.on('SIGTERM', () => { shutdown('SIGTERM').catch(() => process.exit(1)) })
  process.on('SIGINT', () => { shutdown('SIGINT').catch(() => process.exit(1)) })
}

init().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error)
  initError = msg
  log('error', 'main', `[sentinel-br] Init failed: ${msg}`)
  const webhookUrl = process.env['GOOGLE_CHAT_WEBHOOK_URL']
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ text: `🔥 *[sentinel-br]* 초기화 실패!\n원인: ${msg}` }),
    }).catch(() => {})
  }
})
