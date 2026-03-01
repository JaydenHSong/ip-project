import { chromium, type Browser } from 'playwright'
import type { Job } from 'bullmq'
import type {
  CrawlJobData,
  CrawlResult,
  CrawlerListingRequest,
  Marketplace,
} from '../types/index.js'
import type { CrawlerConfig } from '../config.js'
import type { SentinelClient } from '../api/sentinel-client.js'
import type { ProxyManager } from '../anti-bot/proxy.js'
import type { ChatNotifier } from '../notifications/google-chat.js'
import { generateFingerprint } from '../anti-bot/fingerprint.js'
import { createStealthContext } from '../anti-bot/stealth.js'
import { humanBehavior } from '../anti-bot/human-behavior.js'
import { scrapeSearchPage, hasNextPage } from '../scraper/search-page.js'
import { scrapeDetailPage } from '../scraper/detail-page.js'
import { captureScreenshot } from '../scraper/screenshot.js'
import { log } from '../logger.js'

// 캠페인 1건 크롤링 잡 프로세서
const createJobProcessor = (
  config: CrawlerConfig,
  sentinelClient: SentinelClient,
  proxyManager: ProxyManager,
  chatNotifier: ChatNotifier,
) => {
  return async (job: Job<CrawlJobData>): Promise<CrawlResult> => {
    const { campaignId, keyword, marketplace, maxPages } = job.data
    const startTime = Date.now()
    const mp = marketplace as Marketplace

    log('info', 'jobs', `Starting crawl job: "${keyword}" (${marketplace}, ${maxPages} pages)`, {
      campaignId,
    })

    let browser: Browser | null = null
    let totalFound = 0
    let totalSent = 0
    let duplicates = 0
    let errors = 0

    try {
      browser = await chromium.launch({ headless: true })

      // 프록시 가져오기
      let proxyConfig = proxyManager.getNextProxy()
      let retryCount = 0

      // Stealth 브라우저 컨텍스트 생성
      const fingerprint = generateFingerprint(mp)
      let context = await createStealthContext(
        browser,
        fingerprint,
        proxyConfig ?? undefined,
      )
      let page = await context.newPage()

      // 검색 결과 페이지 순회
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          const searchResults = await scrapeSearchPage(page, mp, keyword, pageNum)
          totalFound += searchResults.length

          // 각 ASIN 상세 페이지 방문
          const listings: CrawlerListingRequest[] = []

          for (const result of searchResults) {
            try {
              // 사람 행동: 페이지 간 딜레이
              await humanBehavior.delay(config.detailDelayMin, config.detailDelayMax)

              const detail = await scrapeDetailPage(page, mp, result.asin)

              // 스크린샷 캡처
              const screenshot = await captureScreenshot(
                page,
                config.screenshotWidth,
                config.screenshotHeight,
              )

              listings.push({
                asin: detail.asin,
                marketplace,
                title: detail.title,
                description: detail.description ?? undefined,
                bullet_points: detail.bulletPoints.length > 0 ? detail.bulletPoints : undefined,
                images: detail.images.map((img) => ({ url: img.url, position: img.position })),
                price_amount: detail.priceAmount ?? undefined,
                price_currency: detail.priceCurrency,
                seller_name: detail.sellerName ?? undefined,
                seller_id: detail.sellerId ?? undefined,
                brand: detail.brand ?? undefined,
                category: detail.category ?? undefined,
                rating: detail.rating ?? undefined,
                review_count: detail.reviewCount ?? undefined,
                source_campaign_id: campaignId,
                screenshot_base64: screenshot,
              })
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error)

              if (errorMsg === 'CAPTCHA_DETECTED') {
                // CAPTCHA 감지 → 프록시 교체
                if (proxyConfig) proxyManager.reportFailure(proxyConfig)
                retryCount++

                if (retryCount >= config.maxRetries) {
                  log('error', 'jobs', `Max retries reached for "${keyword}"`, { campaignId })
                  throw new Error('MAX_RETRIES_EXCEEDED')
                }

                // 새 프록시로 컨텍스트 재생성
                proxyConfig = proxyManager.getNextProxy()
                await context.close()
                const newFingerprint = generateFingerprint(mp)
                context = await createStealthContext(
                  browser,
                  newFingerprint,
                  proxyConfig ?? undefined,
                )
                page = await context.newPage()
                log('warn', 'jobs', `CAPTCHA detected, switching proxy (retry ${retryCount})`, {
                  campaignId,
                  asin: result.asin,
                })
                continue
              }

              // 다른 에러는 스킵
              log('warn', 'jobs', `Failed to scrape detail for ${result.asin}: ${errorMsg}`, {
                campaignId,
                asin: result.asin,
              })
              errors++
            }
          }

          // 배치 전송
          if (listings.length > 0) {
            try {
              const batchResult = await sentinelClient.submitBatch(listings)
              totalSent += batchResult.created
              duplicates += batchResult.duplicates
              errors += batchResult.errors.length
            } catch (error) {
              log('error', 'jobs', `Failed to submit batch: ${error instanceof Error ? error.message : String(error)}`, {
                campaignId,
              })
              errors += listings.length
            }
          }

          // 프록시 성공 보고
          if (proxyConfig) proxyManager.reportSuccess(proxyConfig)

          // 다음 페이지 존재 확인
          if (pageNum < maxPages) {
            const canContinue = await hasNextPage(page)
            if (!canContinue) {
              log('info', 'jobs', `No more pages after page ${pageNum}`, { campaignId })
              break
            }
            // 페이지 간 딜레이
            await humanBehavior.delay(config.pageDelayMin, config.pageDelayMax)
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          if (errorMsg === 'MAX_RETRIES_EXCEEDED') throw error
          log('error', 'jobs', `Error on search page ${pageNum}: ${errorMsg}`, { campaignId })
          errors++
        }
      }

      await context.close()
    } finally {
      if (browser) await browser.close()
    }

    const duration = Date.now() - startTime
    const result: CrawlResult = { campaignId, totalFound, totalSent, duplicates, errors, duration }

    // Google Chat 알림
    if (errors === 0 || totalSent > 0) {
      await chatNotifier.notifyCrawlComplete(keyword, result)
    } else {
      await chatNotifier.notifyCrawlFailed(keyword, `${errors} errors, 0 listings sent`)
    }

    log('info', 'jobs', `Crawl job completed: ${totalFound} found, ${totalSent} sent, ${duplicates} dup, ${errors} err`, {
      campaignId,
      duration,
    })

    return result
  }
}

export { createJobProcessor }
