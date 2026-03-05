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
import type { ChatNotifier } from '../notifications/google-chat.js'
import type { VisionAnalyzer } from '../ai/vision-analyzer.js'
import { generatePersona } from '../anti-bot/persona.js'
import { loadSuccessRanges } from '../anti-bot/persona-ranges.js'
import { humanBehavior } from '../anti-bot/human-behavior.js'
import { navigateToHome, performSearch, scrapeSearchPage, goToNextPage } from '../scraper/search-page.js'
import { scrapeDetailPage, clickIntoProduct } from '../scraper/detail-page.js'
import { captureScreenshot } from '../scraper/screenshot.js'
import { selectClickTargets } from './click-strategy.js'
import { log } from '../logger.js'

const createJobProcessor = (
  config: CrawlerConfig,
  sentinelClient: SentinelClient,
  chatNotifier: ChatNotifier,
  vision: VisionAnalyzer | null,
) => {
  return async (job: Job<CrawlJobData>): Promise<CrawlResult> => {
    const { campaignId, keyword, marketplace, maxPages } = job.data
    const startTime = Date.now()
    const mp = marketplace as Marketplace

    // AI 학습 결과에서 성공 범위 로드 → 동적 페르소나 생성
    const successRanges = await loadSuccessRanges(sentinelClient)
    const persona = generatePersona(undefined, successRanges)
    log('info', 'jobs', `Starting crawl: "${keyword}" (${marketplace}, ${maxPages}p, persona: ${persona.name})`, {
      campaignId,
    })

    let browser: Browser | null = null
    let totalFound = 0
    let totalSent = 0
    let duplicates = 0
    let errors = 0
    let retryCount = 0
    let spigenSkipped = 0
    let lastPageNum = 0

    try {
      browser = await chromium.connectOverCDP(config.browserWs)

      let context = browser.contexts()[0] ?? await browser.newContext()
      let page = context.pages()[0] ?? await context.newPage()

      // ─── 1: Home ───
      const homeStatus = await navigateToHome(page, mp, persona, vision)
      if (homeStatus === 'blocked') {
        // Browser API handles anti-bot, retry with fresh page
        await page.close()
        page = await context.newPage()

        const retryHome = await navigateToHome(page, mp, persona, vision)
        if (retryHome === 'blocked') {
          throw new Error('CAPTCHA_DETECTED')
        }
      }

      // ─── 2: Search ───
      await performSearch(page, keyword, persona, vision)

      // ─── 3: Page loop ───
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        lastPageNum = pageNum
        try {
          const searchResults = await scrapeSearchPage(page, mp, keyword, pageNum, persona, vision)
          totalFound += searchResults.length

          // Spigen 자사 제품 필터링
          const nonSpigenResults = searchResults.filter(r => !r.isSpigen)
          const pageSpigenCount = searchResults.length - nonSpigenResults.length
          spigenSkipped += pageSpigenCount

          if (pageSpigenCount > 0) {
            log('info', 'jobs', `Skipped ${pageSpigenCount} Spigen products on page ${pageNum}`, { campaignId })
          }

          // 스마트 클릭: 랜덤 셔플로 선택
          const clickTargets = selectClickTargets(nonSpigenResults, persona)

          const listings: CrawlerListingRequest[] = []

          for (const target of clickTargets) {
            const result = nonSpigenResults[target.index]!

            try {
              await humanBehavior.delay(
                persona.navigation.backToNextClickDelayMin,
                persona.navigation.backToNextClickDelayMax,
              )

              // 원본 searchResults에서의 인덱스를 찾아 클릭
              const originalIndex = searchResults.findIndex(r => r.asin === result.asin)
              const clicked = await clickIntoProduct(page, originalIndex, persona)

              if (!clicked) {
                const { MARKETPLACE_DOMAINS } = await import('../types/index.js')
                const domain = MARKETPLACE_DOMAINS[mp]
                await page.goto(`https://${domain}/dp/${result.asin}`, {
                  waitUntil: 'domcontentloaded',
                  timeout: 60_000,
                })
              }

              const detail = await scrapeDetailPage(page, mp, result.asin, persona, vision)

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

              if (persona.navigation.useBackButton) {
                await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15_000 })
              } else {
                await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15_000 })
              }

            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error)

              if (errorMsg === 'CAPTCHA_DETECTED') {
                retryCount++

                sentinelClient.submitLog({
                  type: 'captcha',
                  campaign_id: campaignId,
                  keyword,
                  marketplace,
                  asin: result.asin,
                  message: `CAPTCHA detected, retrying with fresh page (retry ${retryCount})`,
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

                // Browser API: fresh page for new session
                await page.close()
                page = await context.newPage()

                await navigateToHome(page, mp, persona, vision)
                await performSearch(page, keyword, persona, vision)

                log('warn', 'jobs', `CAPTCHA detected, retrying with fresh page (retry ${retryCount})`, {
                  campaignId,
                  asin: result.asin,
                })
                break
              }

              log('warn', 'jobs', `Failed to scrape detail for ${result.asin}: ${errorMsg}`, {
                campaignId,
                asin: result.asin,
              })
              errors++

              try {
                await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10_000 })
              } catch {
                await navigateToHome(page, mp, persona, vision)
                await performSearch(page, keyword, persona, vision)
              }
            }
          }

          // Batch submit
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

          // Next page
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

      // Browser API: close handled in finally
    } catch (fatalError) {
      const fatalMsg = fatalError instanceof Error ? fatalError.message : String(fatalError)
      log('error', 'jobs', `Crawl failed fatally: ${fatalMsg}`, { campaignId })

      sentinelClient.submitLog({
        type: 'crawl_error',
        campaign_id: campaignId,
        keyword,
        marketplace,
        message: fatalMsg,
        error_code: fatalMsg.includes('Timeout') ? 'TIMEOUT' :
          fatalMsg.includes('CAPTCHA') ? 'CAPTCHA' : 'FATAL_ERROR',
        errors: errors + 1,
        captchas: retryCount,
        duration_ms: Date.now() - startTime,
      }).catch(() => {})

      errors++
    } finally {
      if (browser) await browser.close()
    }

    const duration = Date.now() - startTime
    const result: CrawlResult = {
      campaignId,
      totalFound,
      totalSent,
      duplicates,
      errors,
      duration,
      spigenSkipped,
      pagesCrawled: lastPageNum,
      personaName: persona.name,
    }

    // Campaign result update (fire-and-forget)
    sentinelClient.updateCampaignResult(campaignId, {
      found: totalFound,
      sent: totalSent,
      duplicates,
      errors,
      spigen_skipped: spigenSkipped,
      pages_crawled: lastPageNum,
      violations_suspected: 0,
      duration_ms: duration,
      persona_name: persona.name,
      success: errors === 0 || totalSent > 0,
    }).catch(() => {})

    // Google Chat
    if (errors === 0 || totalSent > 0) {
      await chatNotifier.notifyCrawlComplete(keyword, result)
    } else {
      await chatNotifier.notifyCrawlFailed(keyword, `${errors} errors, 0 listings sent`)
    }

    // Crawl complete log (persona config for AI learning)
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
      message: JSON.stringify({
        persona: persona.name,
        typing: persona.typing.charDelayMin + '-' + persona.typing.charDelayMax,
        scroll: persona.scroll.pixelsPerStepMin + '-' + persona.scroll.pixelsPerStepMax,
        dwell: persona.dwell.detailPageDwellMin + '-' + persona.dwell.detailPageDwellMax,
        nav_products_per_page: persona.navigation.productsToViewPerPage,
        spigen_skipped: spigenSkipped,
        success: errors === 0,
      }),
    })

    log('info', 'jobs', `Crawl completed: ${totalFound} found, ${totalSent} sent, ${duplicates} dup, ${errors} err, ${spigenSkipped} spigen (persona: ${persona.name})`, {
      campaignId,
      duration,
    })

    return result
  }
}

export { createJobProcessor }
