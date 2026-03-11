// PD Follow-up Worker — PD 페이지 재방문 + 데이터 추출 + 스크린샷
import type { Job } from 'bullmq'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import type { PdFollowupJobData, PdFollowupTarget, PdFollowupResultData } from './types.js'
import type { Marketplace } from '../types/index.js'
import { scrapeDetailPage, buildDetailUrl } from '../scraper/detail-page.js'
import { captureScreenshot } from '../scraper/screenshot.js'
import { humanBehavior } from '../anti-bot/human-behavior.js'
import { log } from '../logger.js'

let browser: Browser | null = null

const ensureBrowser = async (): Promise<Browser> => {
  if (browser?.isConnected()) return browser

  const browserWs = process.env['BRIGHTDATA_BROWSER_WS']
  if (browserWs) {
    browser = await chromium.connectOverCDP(browserWs)
  } else {
    browser = await chromium.launch({ headless: true })
  }
  return browser
}

const buildUrl = (target: PdFollowupTarget): string => {
  if (target.url) return target.url
  return buildDetailUrl(target.marketplace as Marketplace, target.asin)
}

const visitTarget = async (
  page: Page,
  target: PdFollowupTarget,
): Promise<PdFollowupResultData> => {
  const url = buildUrl(target)
  log('info', 'pd-followup-worker', `Visiting ${target.asin} (${target.marketplace}) ${url}`)

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await humanBehavior.delay(1000, 2000)

    // 리스팅 삭제 감지 (Dog page / 404)
    const pageContent = await page.evaluate(() => document.body.innerText)
    const isRemoved = pageContent.includes('looking for something?') ||
      pageContent.includes('currently unavailable') ||
      pageContent.length < 100

    if (isRemoved) {
      const screenshot = await captureScreenshot(page, 1280, 800, 'evidence')
      return {
        reportId: target.reportId,
        screenshotUrl: `data:image/jpeg;base64,${screenshot}`,
        listingData: {},
        crawledAt: new Date().toISOString(),
        listingRemoved: true,
      }
    }

    // 상세 데이터 추출
    const detail = await scrapeDetailPage(
      page,
      target.marketplace as Marketplace,
      target.asin,
    )

    // 스크린샷 촬영
    const screenshot = await captureScreenshot(page, 1280, 800, 'evidence')

    return {
      reportId: target.reportId,
      screenshotUrl: `data:image/jpeg;base64,${screenshot}`,
      listingData: {
        title: detail.title,
        description: detail.description,
        price: detail.priceAmount ? `${detail.priceCurrency} ${detail.priceAmount}` : null,
        seller: detail.sellerName,
        images: detail.images.map((img) => img.url).join(','),
        brand: detail.brand,
        rating: detail.rating,
        reviewCount: detail.reviewCount,
      },
      crawledAt: new Date().toISOString(),
      listingRemoved: false,
    }
  } catch (error) {
    log('error', 'pd-followup-worker', `Failed to visit ${target.asin}: ${error instanceof Error ? error.message : String(error)}`)

    return {
      reportId: target.reportId,
      screenshotUrl: null,
      listingData: {},
      crawledAt: new Date().toISOString(),
      listingRemoved: false,
    }
  }
}

const processPdFollowupJob = async (
  job: Job<PdFollowupJobData>,
  reportResult: (result: PdFollowupResultData) => Promise<void>,
  verifyReportExists?: (id: string) => Promise<boolean>,
): Promise<void> => {
  const { targets } = job.data
  log('info', 'pd-followup-worker', `Processing ${targets.length} PD follow-up targets`)

  const b = await ensureBrowser()
  const context = await b.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })

  try {
    const page = await context.newPage()

    for (const target of targets) {
      try {
        // 삭제된 리포트 스킵
        if (verifyReportExists) {
          const exists = await verifyReportExists(target.reportId)
          if (!exists) {
            log('warn', 'pd-followup-worker', `Report ${target.reportId} no longer exists, skipping ${target.asin}`)
            continue
          }
        }

        const result = await visitTarget(page, target)
        await reportResult(result)
        log('info', 'pd-followup-worker', `Reported result for ${target.asin} (removed: ${result.listingRemoved})`)
      } catch (error) {
        log('error', 'pd-followup-worker', `Target ${target.asin} failed: ${error instanceof Error ? error.message : String(error)}`)
      }

      // 타겟 간 딜레이 (anti-bot)
      await humanBehavior.delay(3000, 8000)
    }
  } finally {
    await context.close()
  }

  log('info', 'pd-followup-worker', `Completed ${targets.length} PD follow-ups`)
}

const closePdFollowupBrowser = async (): Promise<void> => {
  if (browser) {
    await browser.close().catch(() => {})
    browser = null
  }
}

export { processPdFollowupJob, closePdFollowupBrowser }
