import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import { chromium } from 'playwright'
import type { Queue } from 'bullmq'
import type { CrawlJobData, Marketplace, ProxyConfig } from './types/index.js'
import { MARKETPLACE_DOMAINS } from './types/index.js'
import { generateFingerprint } from './anti-bot/fingerprint.js'
import { createStealthContext } from './anti-bot/stealth.js'
import { generatePersona } from './anti-bot/persona.js'
import { scrapeDetailPage, buildDetailUrl } from './scraper/detail-page.js'
import { navigateToHome, performSearch, detectBlock } from './scraper/search-page.js'
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

    // Proxy connectivity test — GET /diag/proxy
    if (pathname === '/diag/proxy' && req.method === 'GET') {
      const authHeader = req.headers['authorization']
      if (serviceToken && authHeader !== `Bearer ${serviceToken}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Unauthorized' }))
        return
      }

      const proxyConf = options.proxyConfig
      if (!proxyConf) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'No proxy configured' }))
        return
      }

      const results: Record<string, unknown> = {
        proxy: `${proxyConf.host}:${proxyConf.port}`,
        username: proxyConf.username.slice(0, 20) + '...',
      }

      // Test 1: Direct fetch (no proxy) to httpbin
      try {
        const directRes = await fetch('https://httpbin.org/ip', {
          signal: AbortSignal.timeout(10_000),
        })
        const directData = await directRes.json() as { origin: string }
        results['direct_ip'] = directData.origin
      } catch (e) {
        results['direct_ip'] = `ERROR: ${e instanceof Error ? e.message : String(e)}`
      }

      // Test 2: Playwright with proxy to httpbin
      try {
        const testBrowser = await chromium.launch({
            headless: true,
            args: [
              '--disable-blink-features=AutomationControlled',
              '--disable-features=IsolateOrigins,site-per-process',
              '--disable-infobars',
              '--no-first-run',
              '--no-default-browser-check',
            ],
          })
        const fp = generateFingerprint('US')
        const ctx = await createStealthContext(testBrowser, fp, proxyConf)
        const p = await ctx.newPage()
        await p.goto('https://httpbin.org/ip', { timeout: 15_000 })
        const body = await p.textContent('body')
        results['proxy_ip'] = body?.trim()
        await ctx.close()
        await testBrowser.close()
      } catch (e) {
        results['proxy_ip'] = `ERROR: ${e instanceof Error ? e.message : String(e)}`
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(results, null, 2))
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

        const vision = options.vision ?? null
        const MAX_RETRIES = 2
        let lastError: string = ''

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          const browser = await chromium.launch({
            headless: true,
            args: [
              '--disable-blink-features=AutomationControlled',
              '--disable-features=IsolateOrigins,site-per-process',
              '--disable-infobars',
              '--no-first-run',
              '--no-default-browser-check',
            ],
          })
          try {
            const fingerprint = generateFingerprint(mp)
            const persona = generatePersona()
            // 재시도마다 새 세션 ID로 다른 IP 사용
            const proxyForAttempt = options.proxyConfig
              ? {
                  ...options.proxyConfig,
                  username: `${options.proxyConfig.username}-f${Math.random().toString(36).slice(2, 8)}`,
                }
              : undefined
            const context = await createStealthContext(browser, fingerprint, proxyForAttempt)
            const page = await context.newPage()

            const domain = MARKETPLACE_DOMAINS[mp]

            // ── 메인 크롤러와 동일한 접근 방식 사용 ──

            // 1단계: 홈 접속 (쿠키 배너 처리, 봇 차단 체크, 페르소나 기반 체류)
            const homeStatus = await navigateToHome(page, mp, persona, vision)
            if (homeStatus === 'blocked') {
              throw new Error('CAPTCHA_DETECTED')
            }

            // 2단계: 검색창에 ASIN 타이핑 → Enter (마우스 이동, 페르소나 타이핑, 랜덤 Enter/클릭)
            await performSearch(page, data.asin, persona, vision)

            // 3단계: 검색 결과 차단 체크
            if (await detectBlock(page)) {
              throw new Error('CAPTCHA_DETECTED')
            }

            // 4단계: 검색 결과 체류 (페르소나 기반)
            await humanBehavior.delay(
              persona.navigation.searchToClickDelayMin,
              persona.navigation.searchToClickDelayMax,
            )

            // 5단계: 검색 결과에서 해당 ASIN 클릭 (또는 fallback)
            const asinLink = await page.$(`[data-asin="${data.asin}"] h2 a, [data-asin="${data.asin}"] .s-image`)
            if (asinLink) {
              // 마우스를 상품 위로 이동 후 클릭 (사람처럼)
              if (persona.click.hoverBeforeClick) {
                const box = await asinLink.boundingBox()
                if (box) {
                  await humanBehavior.moveMouseToCoords(
                    page,
                    box.x + Math.random() * box.width,
                    box.y + Math.random() * box.height,
                  )
                  await humanBehavior.delay(200, 600)
                }
              }
              await asinLink.click()
              await page.waitForLoadState('domcontentloaded', { timeout: 60_000 })
            } else {
              // 검색 결과에 없으면 상세 URL로 이동 (검색 컨텍스트가 있으므로 덜 의심)
              const detailUrl = buildDetailUrl(mp, data.asin)
              await humanBehavior.delay(1000, 2000)
              await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 })
            }

            // 6단계: 상세 페이지 차단 체크
            if (await detectBlock(page)) {
              throw new Error('CAPTCHA_DETECTED')
            }

            // 7단계: 상세 페이지에서 사람처럼 행동 (이미지 갤러리 탐색, 리뷰 스크롤 등)
            await humanBehavior.browseDetailPage(page, persona)

            // 8단계: 스크래핑 + 스크린샷
            const listing = await scrapeDetailPage(page, mp, data.asin, persona, vision ?? undefined)
            const screenshotBase64 = await captureScreenshot(page, 1280, 800)

            const url = `https://${domain}/dp/${data.asin}`

            await context.close()
            await browser.close()

            log('info', 'fetch', `Fetched ASIN ${data.asin}: "${listing.title.slice(0, 50)}..." (attempt ${attempt + 1}, persona: ${persona.name})`)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              success: true,
              listing,
              screenshot_base64: screenshotBase64,
              url,
            }))
            return
          } catch (error) {
            await browser.close()
            lastError = error instanceof Error ? error.message : String(error)

            if (lastError === 'CAPTCHA_DETECTED' && attempt < MAX_RETRIES) {
              const waitSec = (attempt + 1) * 5
              log('warn', 'fetch', `CAPTCHA detected on attempt ${attempt + 1}, retrying in ${waitSec}s with new proxy session... (persona will regenerate)`, { asin: data.asin })
              await humanBehavior.delay(waitSec * 1000, waitSec * 1000 + 2000)
              continue
            }

            // 마지막 시도이거나 CAPTCHA가 아닌 에러
            break
          }
        }

        log('error', 'fetch', `Fetch failed after ${MAX_RETRIES + 1} attempts: ${lastError}`, { asin: data.asin })
        const status = lastError === 'CAPTCHA_DETECTED' ? 503 : 500
        res.writeHead(status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: lastError }))
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log('error', 'fetch', `Fetch failed: ${message}`)
        res.writeHead(500, { 'Content-Type': 'application/json' })
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
