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

    // 삭제된 캠페인 체크 — 존재하지 않으면 즉시 스킵
    const campaignExists = await sentinelClient.verifyCampaignExists(campaignId)
    if (!campaignExists) {
      log('warn', 'jobs', `Campaign ${campaignId} no longer exists, skipping crawl`, { campaignId })
      return {
        campaignId, totalFound: 0, totalSent: 0, duplicates: 0, errors: 0,
        duration: 0, spigenSkipped: 0, pagesCrawled: 0, personaName: 'skipped',
        preScanTotal: 0, suspectCount: 0, violationCount: 0,
      }
    }

    // AI 학습 결과에서 성공 범위 로드 → 동적 페르소나 생성
    const successRanges = await loadSuccessRanges(sentinelClient)
    const persona = generatePersona(undefined, successRanges)
    log('info', 'jobs', `Starting crawl V3: "${keyword}" (${marketplace}, ${maxPages}p, persona: ${persona.name})`, {
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
      try {
        browser = await chromium.connectOverCDP(config.browserWs, { timeout: config.cdpConnectTimeout })
      } catch (cdpError) {
        log('warn', 'jobs', `CDP connection failed, using local headless: ${cdpError instanceof Error ? cdpError.message : String(cdpError)}`, { campaignId })
        browser = await chromium.launch({ headless: true })
      }

      let context = await browser.newContext()
      let page = await context.newPage()

      // ─── 1: Home ───
      const homeStatus = await navigateToHome(page, mp, persona, vision, config.gotoTimeout)
      if (homeStatus === 'blocked') {
        await page.close()
        page = await context.newPage()

        const retryHome = await navigateToHome(page, mp, persona, vision, config.gotoTimeout)
        if (retryHome === 'blocked') {
          throw new Error('CAPTCHA_DETECTED')
        }
      }

      // ─── 2: Search ───
      await performSearch(page, keyword, persona, vision, config.gotoTimeout)

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

          // ─── V3: 1차 스캔 — 4가지 핵심 위반 탐지 ───
          preScanSearchResults(nonSpigenResults)
          preScanTotal += nonSpigenResults.length

          // V3: 썸네일 Vision 항상 실행 (이미지 정책 위반 탐지)
          if (vision) {
            const screenshot = await captureScreenshot(page, 1024, 640, 'scan')
            await thumbnailVisionScan(vision, screenshot, nonSpigenResults)
          }

          const pageSuspectResults = nonSpigenResults.filter(r => r.preScanResult?.isSuspect)
          suspectCount += pageSuspectResults.length

          log('info', 'jobs', `Page ${pageNum}: ${nonSpigenResults.length} products, ${pageSuspectResults.length} suspects`, { campaignId })

          // ─── V3: suspect/innocent 분리 ───
          const { suspects, innocents } = selectClickTargets(nonSpigenResults, persona)

          const listings: CrawlerListingRequest[] = []

          // ─── V3 Phase 2: 위반 확정 건만 상세 진입 (증거 수집) ───
          for (const target of suspects) {
            const result = nonSpigenResults[target.index]!

            try {
              await humanBehavior.delay(
                persona.navigation.backToNextClickDelayMin,
                persona.navigation.backToNextClickDelayMax,
              )

              const originalIndex = searchResults.findIndex(r => r.asin === result.asin)
              const clicked = await clickIntoProduct(page, originalIndex, persona)

              if (!clicked) {
                const { MARKETPLACE_DOMAINS } = await import('../types/index.js')
                const domain = MARKETPLACE_DOMAINS[mp]
                await page.goto(`https://${domain}/dp/${result.asin}`, {
                  waitUntil: 'domcontentloaded',
                  timeout: config.gotoTimeout,
                })
              }

              const detail = await scrapeDetailPage(page, mp, result.asin, persona, vision)

              const screenshot = await captureScreenshot(
                page,
                config.screenshotWidth,
                config.screenshotHeight,
                'evidence',
              )

              violationCount++
              log('info', 'jobs', `Violation: ${result.asin} — ${result.preScanResult?.suspectReasons.join(', ')} (score: ${result.preScanResult?.score})`, { campaignId })

              // V3: 1차에서 이미 확정, crawlerAiResult는 preScanResult에서 변환
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
                crawler_ai_result: {
                  is_violation: true,
                  violation_types: result.preScanResult?.suspectReasons ?? [],
                  confidence: result.preScanResult?.score ?? 0,
                  reasons: result.preScanResult?.suspectReasons ?? [],
                  evidence_summary: 'Detected in search page scan',
                },
              })

              await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15_000 })

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

                await navigateToHome(page, mp, persona, vision, config.gotoTimeout)
                await performSearch(page, keyword, persona, vision, config.gotoTimeout)

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
                await navigateToHome(page, mp, persona, vision, config.gotoTimeout)
                await performSearch(page, keyword, persona, vision, config.gotoTimeout)
              }
            }
          }

          // ─── V3: Innocent visit — 이미지 차단 상태로 가볍게 방문 ───
          for (const inn of innocents) {
            const innResult = nonSpigenResults[inn.index]!
            try {
              await humanBehavior.delay(
                persona.navigation.backToNextClickDelayMin,
                persona.navigation.backToNextClickDelayMax,
              )
              // 이미지 차단하여 bandwidth 절감
              await page.route('**/*.{png,jpg,jpeg,webp,gif,svg,ico}', (route) => route.abort())
              const originalIndex = searchResults.findIndex(r => r.asin === innResult.asin)
              await clickIntoProduct(page, originalIndex, persona)
              await humanBehavior.delay(persona.dwell.detailPageDwellMin, persona.dwell.detailPageDwellMax)
              await page.unrouteAll()
              await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15_000 })
              log('info', 'jobs', `Innocent visit: ${innResult.asin} (decoy, images blocked)`, { campaignId })
            } catch {
              try {
                await page.unrouteAll()
                await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10_000 })
              } catch {
                await navigateToHome(page, mp, persona, vision, config.gotoTimeout)
                await performSearch(page, keyword, persona, vision, config.gotoTimeout)
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
            const hasNext = await goToNextPage(page, persona, vision, config.gotoTimeout)
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

    log('info', 'jobs', `Crawl V3 completed: ${totalFound} found, ${suspectCount} suspect, ${violationCount} violations, ${totalSent} sent, ${duplicates} dup, ${errors} err (persona: ${persona.name})`, {
      campaignId,
      duration,
    })

    return result
  }
}

export { createJobProcessor }
