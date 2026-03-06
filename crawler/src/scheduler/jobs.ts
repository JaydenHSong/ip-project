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
import { preScanSearchResults, thumbnailVisionScan } from '../ai/pre-scanner.js'
import { scanViolation } from '../ai/violation-scanner.js'
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
    log('info', 'jobs', `Starting crawl V2: "${keyword}" (${marketplace}, ${maxPages}p, persona: ${persona.name})`, {
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
    let preScanTotal = 0
    let suspectCount = 0
    let violationCount = 0

    try {
      browser = await chromium.connectOverCDP(config.browserWs)

      let context = await browser.newContext()
      let page = await context.newPage()

      // ─── 1: Home ───
      const homeStatus = await navigateToHome(page, mp, persona, vision)
      if (homeStatus === 'blocked') {
        await page.close()
        page = await context.newPage()

        const retryHome = await navigateToHome(page, mp, persona, vision)
        if (retryHome === 'blocked') {
          throw new Error('CAPTCHA_DETECTED')
        }
      }

      // ─── 2: Search ───
      await performSearch(page, keyword, persona, vision)

      // ─── 3: Page loop (V2) ───
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

          // ─── V2: 1차 스캔 (검색 결과에서 사전 필터링) ───
          preScanSearchResults(nonSpigenResults)
          preScanTotal += nonSpigenResults.length

          // 선택적: 썸네일 AI 비전 스캔
          if (vision) {
            const pageSuspects = nonSpigenResults.filter(r => r.preScanResult?.isSuspect)
            // 키워드 매칭으로 의심 건이 없을 때만 Vision 사용 (비용 절약)
            if (pageSuspects.length === 0) {
              const screenshot = await captureScreenshot(page, 1280, 800)
              await thumbnailVisionScan(vision, screenshot, nonSpigenResults)
            }
          }

          const pageSuspectResults = nonSpigenResults.filter(r => r.preScanResult?.isSuspect)
          suspectCount += pageSuspectResults.length

          log('info', 'jobs', `Page ${pageNum}: ${nonSpigenResults.length} products, ${pageSuspectResults.length} suspects`, { campaignId })

          // ─── V2: 의심 건만 상세 진입 ───
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

              // innocent (봇 탐지 방지용)은 상세 수집만 하고 AI 분석/서버 전송 안 함
              if (target.reason === 'innocent') {
                log('info', 'jobs', `Innocent visit: ${result.asin} (decoy)`, { campaignId })
                if (persona.navigation.useBackButton) {
                  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15_000 })
                } else {
                  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15_000 })
                }
                continue
              }

              // ─── V2: 2차 AI 분석 (Haiku) ───
              let crawlerAiResult = null
              if (vision) {
                crawlerAiResult = await scanViolation(vision, detail, screenshot)

                if (!crawlerAiResult.is_violation) {
                  log('info', 'jobs', `Non-violation: ${result.asin} (confidence: ${crawlerAiResult.confidence})`, { campaignId })
                  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15_000 })
                  continue
                }

                violationCount++
                log('info', 'jobs', `Violation detected: ${result.asin} — ${crawlerAiResult.violation_types.join(', ')} (confidence: ${crawlerAiResult.confidence})`, { campaignId })
              }

              // ─── V2: 위반 건만 서버 전송 목록에 추가 ───
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
                crawler_ai_result: crawlerAiResult ?? undefined,
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

          // Batch submit (위반 건만)
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
      preScanTotal,
      suspectCount,
      violationCount,
    }

    // Campaign result update
    sentinelClient.updateCampaignResult(campaignId, {
      found: totalFound,
      sent: totalSent,
      duplicates,
      errors,
      spigen_skipped: spigenSkipped,
      pages_crawled: lastPageNum,
      violations_suspected: suspectCount,
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

    // Crawl complete log
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
        pre_scan_total: preScanTotal,
        suspect_count: suspectCount,
        violation_count: violationCount,
        success: errors === 0,
      }),
    })

    log('info', 'jobs', `Crawl V2 completed: ${totalFound} found, ${suspectCount} suspect, ${violationCount} violations, ${totalSent} sent, ${duplicates} dup, ${errors} err (persona: ${persona.name})`, {
      campaignId,
      duration,
    })

    return result
  }
}

export { createJobProcessor }
