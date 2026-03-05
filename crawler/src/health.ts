import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import { chromium } from 'playwright'
import type { Queue } from 'bullmq'
import type { CrawlJobData, Marketplace, ProxyConfig } from './types/index.js'
import { MARKETPLACE_DOMAINS } from './types/index.js'
import { generateFingerprint } from './anti-bot/fingerprint.js'
import { createStealthContext } from './anti-bot/stealth.js'
import { generatePersona } from './anti-bot/persona.js'
import { scrapeDetailPage, buildDetailUrl } from './scraper/detail-page.js'
import { captureScreenshot } from './scraper/screenshot.js'
import { humanBehavior } from './anti-bot/human-behavior.js'
import type { VisionAnalyzer } from './ai/vision-analyzer.js'
import { log } from './logger.js'

type HealthStatus = {
  status: 'ok' | 'degraded' | 'error'
  uptime: number
  redis: boolean
  worker: boolean
  timestamp: string
}

type HealthCheckFn = () => HealthStatus

type HealthServerOptions = {
  port: number
  getStatus: HealthCheckFn
  queue?: Queue<CrawlJobData>
  serviceToken?: string
  proxyConfig?: ProxyConfig
  vision?: VisionAnalyzer | null
}

const parseBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })

const createHealthServer = (options: HealthServerOptions): Server => {
  const { port, getStatus, serviceToken } = options

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname

    // Health check
    if (pathname === '/health' && req.method === 'GET') {
      const status = getStatus()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(status))
      return
    }

    // Trigger campaign crawl — POST /trigger
    if (pathname === '/trigger' && req.method === 'POST') {
      // Auth check
      const authHeader = req.headers['authorization']
      if (serviceToken && authHeader !== `Bearer ${serviceToken}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Unauthorized' }))
        return
      }

      const queue = options.queue
      if (!queue) {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Queue not available' }))
        return
      }

      try {
        const body = await parseBody(req)
        const data = JSON.parse(body) as {
          campaignId: string
          keyword: string
          marketplace: string
          maxPages: number
        }

        if (!data.campaignId || !data.keyword || !data.marketplace) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing required fields: campaignId, keyword, marketplace' }))
          return
        }

        const jobData: CrawlJobData = {
          campaignId: data.campaignId,
          keyword: data.keyword,
          marketplace: data.marketplace,
          maxPages: data.maxPages || 3,
        }

        const job = await queue.add(`force-run-${data.campaignId}`, jobData, {
          priority: 1,
        })

        log('info', 'trigger', `Force-run job added for campaign ${data.campaignId} (jobId: ${job.id})`, {
          campaignId: data.campaignId,
        })

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, jobId: job.id }))
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log('error', 'trigger', `Failed to add force-run job: ${message}`)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: message }))
      }
      return
    }

    // Fetch single ASIN detail — POST /fetch
    if (pathname === '/fetch' && req.method === 'POST') {
      const authHeader = req.headers['authorization']
      if (serviceToken && authHeader !== `Bearer ${serviceToken}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Unauthorized' }))
        return
      }

      try {
        const body = await parseBody(req)
        const data = JSON.parse(body) as { asin: string; marketplace: string }

        if (!data.asin || !data.marketplace) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing required fields: asin, marketplace' }))
          return
        }

        const mp = data.marketplace as Marketplace
        if (!(mp in MARKETPLACE_DOMAINS)) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: `Invalid marketplace: ${data.marketplace}` }))
          return
        }

        log('info', 'fetch', `Fetching ASIN ${data.asin} (${mp})`)

        const browser = await chromium.launch({ headless: true })
        try {
          const fingerprint = generateFingerprint(mp)
          const persona = generatePersona()
          const context = await createStealthContext(browser, fingerprint, options.proxyConfig)
          const page = await context.newPage()

          // 홈 접속 → 상품 URL로 이동 (단건 ASIN 조회는 직접 이동 허용)
          const detailUrl = buildDetailUrl(mp, data.asin)
          await page.goto(`https://${MARKETPLACE_DOMAINS[mp]}`, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
          })
          await humanBehavior.delay(1000, 3000)
          await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })

          const listing = await scrapeDetailPage(page, mp, data.asin, persona, options.vision ?? undefined)
          const screenshotBase64 = await captureScreenshot(page, 1280, 800)

          const domain = MARKETPLACE_DOMAINS[mp]
          const url = `https://${domain}/dp/${data.asin}`

          await context.close()

          log('info', 'fetch', `Fetched ASIN ${data.asin}: "${listing.title.slice(0, 50)}..."`)

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            success: true,
            listing,
            screenshot_base64: screenshotBase64,
            url,
          }))
        } finally {
          await browser.close()
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log('error', 'fetch', `Fetch failed: ${message}`)
        const status = message === 'CAPTCHA_DETECTED' ? 503 : 500
        res.writeHead(status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: message }))
      }
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
