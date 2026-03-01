import { loadConfig } from './config.js'
import { createSentinelClient } from './api/sentinel-client.js'
import { createProxyManager } from './anti-bot/proxy.js'
import { createChatNotifier } from './notifications/google-chat.js'
import { createCrawlQueue, createCrawlWorker } from './scheduler/queue.js'
import { createJobProcessor } from './scheduler/jobs.js'
import { startScheduler } from './scheduler/scheduler.js'
import { log } from './logger.js'

const PROXY_POOL_SIZE = 5

const main = async (): Promise<void> => {
  // 1. 환경 변수 검증
  log('info', 'main', 'Loading configuration...')
  const config = loadConfig()
  log('info', 'main', 'Configuration loaded successfully')

  // 2. Sentinel API Client 생성
  const sentinelClient = createSentinelClient(config.sentinelApiUrl, config.serviceToken)

  // 3. Proxy Manager 생성
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

  // 4. Google Chat Notifier 생성
  const chatNotifier = createChatNotifier(config.googleChatWebhookUrl)

  // 5. BullMQ Queue + Worker 생성 (Redis URL 문자열 전달)
  const redisUrl = config.redis.url
  const queue = createCrawlQueue(redisUrl)
  const jobProcessor = createJobProcessor(config, sentinelClient, proxyManager, chatNotifier)
  const worker = createCrawlWorker(redisUrl, jobProcessor, config.concurrency)

  // 6. Scheduler 시작
  const schedulerInterval = await startScheduler(queue, sentinelClient)

  log('info', 'main', `Sentinel Crawler started (concurrency: ${config.concurrency})`)

  if (config.googleChatWebhookUrl) {
    await chatNotifier.notifyMessage('🚀 *[Sentinel Crawler]* 크롤러가 시작되었습니다.')
  }

  // 7. Graceful Shutdown
  const shutdown = async (signal: string): Promise<void> => {
    log('info', 'main', `Received ${signal}, shutting down gracefully...`)

    if (config.googleChatWebhookUrl) {
      await chatNotifier.notifyMessage('⏹ *[Sentinel Crawler]* 크롤러가 종료됩니다.')
    }

    clearInterval(schedulerInterval)

    // Worker 중지 (진행 중 잡 완료 대기)
    await worker.close()
    log('info', 'main', 'Worker stopped')

    // Queue 연결 종료
    await queue.close()
    log('info', 'main', 'Queue closed')

    log('info', 'main', 'Shutdown complete')
    process.exit(0)
  }

  process.on('SIGTERM', () => { shutdown('SIGTERM').catch(() => process.exit(1)) })
  process.on('SIGINT', () => { shutdown('SIGINT').catch(() => process.exit(1)) })
}

main().catch((error) => {
  log('error', 'main', `Fatal error: ${error instanceof Error ? error.message : String(error)}`, {
    error: error instanceof Error ? error.stack : String(error),
  })
  process.exit(1)
})
