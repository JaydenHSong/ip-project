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
import type { VisionAnalyzer } from '../ai/vision-analyzer.js'
import { generateFingerprint } from '../anti-bot/fingerprint.js'
import { createStealthContext } from '../anti-bot/stealth.js'
import { generatePersona } from '../anti-bot/persona.js'
import { humanBehavior } from '../anti-bot/human-behavior.js'
import { navigateToHome, performSearch, scrapeSearchPage, goToNextPage } from '../scraper/search-page.js'
import { scrapeDetailPage, clickIntoProduct } from '../scraper/detail-page.js'
import { captureScreenshot } from '../scraper/screenshot.js'
import { log } from '../logger.js'

// 캠페인 1건 크롤링 잡 프로세서
const createJobProcessor = (
  config: CrawlerConfig,
  sentinelClient: SentinelClient,
  proxyManager: ProxyManager,
  chatNotifier: ChatNotifier,
  vision: VisionAnalyzer | null,
) => {
  return async (job: Job<CrawlJobData>): Promise<CrawlResult> => {
    const { campaignId, keyword, marketplace, maxPages } = job.data
    const startTime = Date.now()
    const mp = marketplace as Marketplace

    // 세션별 랜덤 페르소나 생성
    const persona = generatePersona()
    log('info', 'jobs', `Starting crawl: "${keyword}" (${marketplace}, ${maxPages}p, persona: ${persona.name})`, {
      campaignId,
    })

    let browser: Browser | null = null
    let totalFound = 0
    let totalSent = 0
    let duplicates = 0
    let errors = 0
    let retryCount = 0

    try {
      browser = await chromium.launch({ headless: true })

      // 프록시 가져오기
      let proxyConfig = proxyManager.getNextProxy()

      // Stealth 브라우저 컨텍스트 생성
      const fingerprint = generateFingerprint(mp)
      let context = await createStealthContext(
        browser,
        fingerprint,
        proxyConfig ?? undefined,
      )
      let page = await context.newPage()

      // ─── 1단계: 홈페이지 접속 ───
      const homeStatus = await navigateToHome(page, mp, persona, vision)
      if (homeStatus === 'blocked') {
        // 프록시 교체 후 재시도
        if (proxyConfig) proxyManager.reportFailure(proxyConfig)
        proxyConfig = proxyManager.getNextProxy()
        await context.close()
        const newFingerprint = generateFingerprint(mp)
        context = await createStealthContext(browser, newFingerprint, proxyConfig ?? undefined)
        page = await context.newPage()

        const retryHome = await navigateToHome(page, mp, persona, vision)
        if (retryHome === 'blocked') {
          throw new Error('CAPTCHA_DETECTED')
        }
      }

      // ─── 2단계: 검색 실행 ───
      await performSearch(page, keyword, persona, vision)

      // ─── 3단계: 검색 결과 페이지 순회 ───
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          const searchResults = await scrapeSearchPage(page, mp, keyword, pageNum, persona, vision)
          totalFound += searchResults.length

          // 각 상품 상세 페이지 방문
          const listings: CrawlerListingRequest[] = []

          // 페르소나에 따라 볼 상품 수 결정
          const maxProductsToView = Math.min(
            searchResults.length,
            persona.navigation.productsToViewPerPage,
          )

          // 스폰서 상품 필터링 (페르소나에 따라)
          const productsToVisit: number[] = []
          for (let i = 0; i < searchResults.length && productsToVisit.length < maxProductsToView; i++) {
            const result = searchResults[i]!
            if (result.sponsored && Math.random() < persona.click.skipSponsoredProbability) {
              continue // 스폰서 건너뛰기
            }
            productsToVisit.push(i)
          }

          for (const productIndex of productsToVisit) {
            const result = searchResults[productIndex]!

            try {
              // 상품 클릭 딜레이 (사람처럼)
              await humanBehavior.delay(
                persona.navigation.backToNextClickDelayMin,
                persona.navigation.backToNextClickDelayMax,
              )

              // 검색 결과에서 상품 클릭하여 상세 진입
              const clicked = await clickIntoProduct(page, productIndex, persona)

              if (!clicked) {
                // 클릭 실패 → URL 직접 이동 (fallback)
                const { MARKETPLACE_DOMAINS } = await import('../types/index.js')
                const domain = MARKETPLACE_DOMAINS[mp]
                await page.goto(`https://${domain}/dp/${result.asin}`, {
                  waitUntil: 'domcontentloaded',
                  timeout: 30_000,
                })
              }

              // 상세 페이지 스크래핑
              const detail = await scrapeDetailPage(page, mp, result.asin, persona, vision)

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

              // 뒤로가기로 검색 결과 복귀
              if (persona.navigation.useBackButton) {
                await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15_000 })
              } else {
                // 뒤로가기 대신 검색 결과 URL로 (탭 유저 시뮬레이션)
                await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15_000 })
              }

            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error)

              if (errorMsg === 'CAPTCHA_DETECTED') {
                // CAPTCHA → 프록시 교체
                if (proxyConfig) proxyManager.reportFailure(proxyConfig)
                retryCount++

                sentinelClient.submitLog({
                  type: 'captcha',
                  campaign_id: campaignId,
                  keyword,
                  marketplace,
                  asin: result.asin,
                  message: `CAPTCHA detected, switching proxy (retry ${retryCount})`,
                }).catch(() => {})

                if (retryCount >= config.maxRetries) {
                  log('error', 'jobs', `Max retries reached for "${keyword}"`, { campaignId })
                  await sentinelClient.submitLog({
                    type: 'crawl_error',
                    campaign_id: campaignId,
                    keyword,
                    marketplace,
                    message: 'Max retries exceeded due to CAPTCHA',
                    error_code: 'MAX_RETRIES_EXCEEDED',
                    errors,
                    captchas: retryCount,
                    duration_ms: Date.now() - startTime,
                  })
                  throw new Error('MAX_RETRIES_EXCEEDED')
                }

                // 새 프록시 + 새 페르소나로 컨텍스트 재생성
                proxyConfig = proxyManager.getNextProxy()
                await context.close()
                const newFingerprint = generateFingerprint(mp)
                context = await createStealthContext(
                  browser,
                  newFingerprint,
                  proxyConfig ?? undefined,
                )
                page = await context.newPage()

                // 홈부터 다시 시작
                await navigateToHome(page, mp, persona, vision)
                await performSearch(page, keyword, persona, vision)

                log('warn', 'jobs', `CAPTCHA detected, switching proxy (retry ${retryCount})`, {
                  campaignId,
                  asin: result.asin,
                })
                break // 현재 페이지 결과 포기, 다음 페이지로
              }

              // 다른 에러는 스킵
              log('warn', 'jobs', `Failed to scrape detail for ${result.asin}: ${errorMsg}`, {
                campaignId,
                asin: result.asin,
              })
              errors++

              // 상세 페이지에서 에러 → 뒤로가기 시도
              try {
                await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10_000 })
              } catch {
                // goBack 실패 → 검색 재실행
                await navigateToHome(page, mp, persona, vision)
                await performSearch(page, keyword, persona, vision)
              }
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
              const batchErrorMsg = error instanceof Error ? error.message : String(error)
              log('error', 'jobs', `Failed to submit batch: ${batchErrorMsg}`, { campaignId })
              sentinelClient.submitLog({
                type: 'api_error',
                campaign_id: campaignId,
                keyword,
                marketplace,
                message: batchErrorMsg,
                error_code: 'BATCH_SUBMIT_FAILED',
              }).catch(() => {})
              errors += listings.length
            }
          }

          // 프록시 성공 보고
          if (proxyConfig) proxyManager.reportSuccess(proxyConfig)

          // 다음 페이지 이동 (클릭 방식)
          if (pageNum < maxPages) {
            const hasNext = await goToNextPage(page, persona, vision)
            if (!hasNext) {
              log('info', 'jobs', `No more pages after page ${pageNum}`, { campaignId })
              break
            }
            await humanBehavior.delay(
              persona.navigation.betweenPagesDelayMin,
              persona.navigation.betweenPagesDelayMax,
            )
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

    // 잡 완료 로그 전송
    await sentinelClient.submitLog({
      type: 'crawl_complete',
      campaign_id: campaignId,
      keyword,
      marketplace,
      listings_found: totalFound,
      listings_sent: totalSent,
      new_listings: totalSent,
      duplicates,
      errors,
      captchas: retryCount,
      proxy_rotations: retryCount,
      duration_ms: duration,
    })

    log('info', 'jobs', `Crawl completed: ${totalFound} found, ${totalSent} sent, ${duplicates} dup, ${errors} err (persona: ${persona.name})`, {
      campaignId,
      duration,
    })

    return result
  }
}

export { createJobProcessor }
