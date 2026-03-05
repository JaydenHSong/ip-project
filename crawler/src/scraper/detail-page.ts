import type { Page } from 'playwright'
import type { Marketplace, ListingDetail } from '../types/index.js'
import { MARKETPLACE_DOMAINS } from '../types/index.js'
import { DETAIL_SELECTORS, SEARCH_SELECTORS } from './selectors.js'
import { humanBehavior } from '../anti-bot/human-behavior.js'
import { captureScreenshot } from './screenshot.js'
import type { CrawlPersona } from '../anti-bot/persona.js'
import type { VisionAnalyzer } from '../ai/vision-analyzer.js'
import { log } from '../logger.js'

// ─── 상세 URL 생성 (fallback용) ───

const buildDetailUrl = (marketplace: Marketplace, asin: string): string => {
  const domain = MARKETPLACE_DOMAINS[marketplace]
  return `https://${domain}/dp/${asin}`
}

// ─── 안전한 텍스트 추출 ───

const safeText = async (page: Page, selector: string): Promise<string | null> => {
  try {
    const el = await page.$(selector)
    if (!el) return null
    const text = await el.textContent()
    return text?.trim() ?? null
  } catch {
    return null
  }
}

// ─── 파싱 유틸 ───

const parsePrice = (priceText: string | null): number | null => {
  if (!priceText) return null
  const cleaned = priceText.replace(/[^0-9.]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? null : parsed
}

const parseReviewCount = (text: string | null): number | null => {
  if (!text) return null
  const cleaned = text.replace(/[^0-9]/g, '')
  const parsed = parseInt(cleaned, 10)
  return isNaN(parsed) ? null : parsed
}

const parseRating = (text: string | null): number | null => {
  if (!text) return null
  const match = text.match(/(\d+\.?\d*)/)
  if (!match) return null
  return parseFloat(match[1]!)
}

// ─── 셀렉터 기반 상세 파싱 ───

const parseDetailWithSelectors = async (
  page: Page,
  marketplace: Marketplace,
  asin: string,
): Promise<ListingDetail> => {
  const title = (await safeText(page, DETAIL_SELECTORS.title)) ?? ''
  const priceText = await safeText(page, DETAIL_SELECTORS.price)
  const priceAmount = parsePrice(priceText)
  const priceCurrency = marketplace === 'US' || marketplace === 'CA' || marketplace === 'AU' ? 'USD' :
    marketplace === 'UK' ? 'GBP' :
    marketplace === 'JP' ? 'JPY' : 'EUR'

  const description = await safeText(page, DETAIL_SELECTORS.description)

  const bulletEls = await page.$$(DETAIL_SELECTORS.bulletPoints)
  const bulletPoints: string[] = []
  for (const el of bulletEls) {
    const text = await el.textContent()
    if (text?.trim()) bulletPoints.push(text.trim())
  }

  const imageEls = await page.$$(DETAIL_SELECTORS.images)
  const images: ListingDetail['images'] = []
  const seenUrls = new Set<string>()
  for (let i = 0; i < imageEls.length; i++) {
    const src = await imageEls[i]!.getAttribute('src')
    if (src && !seenUrls.has(src) && !src.includes('sprite') && !src.includes('transparent')) {
      seenUrls.add(src)
      const alt = await imageEls[i]!.getAttribute('alt')
      images.push({ url: src, position: images.length + 1, alt: alt ?? undefined })
    }
  }

  const sellerName = await safeText(page, DETAIL_SELECTORS.sellerName)
  let sellerId: string | null = null
  try {
    const sellerLink = await page.$(DETAIL_SELECTORS.sellerId)
    if (sellerLink) {
      const href = await sellerLink.getAttribute('href')
      const match = href?.match(/seller=([A-Z0-9]+)/)
      sellerId = match?.[1] ?? null
    }
  } catch {
    // sellerId 추출 실패 시 무시
  }

  const brandRaw = await safeText(page, DETAIL_SELECTORS.brand)
  const brand = brandRaw?.replace(/^(Visit the |Brand: |by )/, '').trim() ?? null

  const categoryEls = await page.$$(DETAIL_SELECTORS.category)
  let category: string | null = null
  if (categoryEls.length > 0) {
    const lastCategory = categoryEls[categoryEls.length - 1]!
    category = (await lastCategory.textContent())?.trim() ?? null
  }

  const ratingText = await safeText(page, DETAIL_SELECTORS.rating)
  const rating = parseRating(ratingText)
  const reviewCountText = await safeText(page, DETAIL_SELECTORS.reviewCount)
  const reviewCount = parseReviewCount(reviewCountText)

  return {
    asin, title, description, bulletPoints, images,
    priceAmount, priceCurrency, sellerName, sellerId,
    brand, category, rating, reviewCount,
  }
}

// ─── 데이터 완성도 판단 ───

const isDataSufficient = (detail: ListingDetail): boolean => {
  if (!detail.title || detail.title.length < 5) return false
  if (detail.images.length === 0) return false
  return true
}

// ─── 상세 페이지 스크래핑 (셀렉터 + AI fallback) ───

const scrapeDetailPage = async (
  page: Page,
  marketplace: Marketplace,
  asin: string,
  persona?: CrawlPersona,
  vision?: VisionAnalyzer | null,
): Promise<ListingDetail> => {
  log('info', 'detail-page', `Scraping detail page`, { asin })

  // CAPTCHA 감지
  const captcha = await page.$(DETAIL_SELECTORS.captcha)
  if (captcha) {
    if (vision) {
      const screenshot = await captureScreenshot(page, 1280, 800)
      const status = await vision.analyzePageStatus(screenshot)
      log('warn', 'detail-page', `AI detected: ${status.status}`, { asin })
    }
    throw new Error('CAPTCHA_DETECTED')
  }

  // 페이지 내용 체크 (빈 페이지/차단 감지)
  const bodyLength = await page.evaluate(() => document.body.innerText.length)
  if (bodyLength < 100) {
    if (vision) {
      const screenshot = await captureScreenshot(page, 1280, 800)
      const status = await vision.analyzePageStatus(screenshot)
      log('warn', 'detail-page', `Thin page detected — AI says: ${status.status}`, { asin })
      if (status.recommendation === 'retry_proxy') throw new Error('CAPTCHA_DETECTED')
      if (status.recommendation === 'skip') throw new Error('PAGE_NOT_FOUND')
    }
    throw new Error('CAPTCHA_DETECTED')
  }

  // 사람처럼 행동 (페르소나가 있으면)
  if (persona) {
    await humanBehavior.browseDetailPage(page, persona)
  } else {
    await humanBehavior.delay(500, 1500)
    await humanBehavior.scrollPage(page, 0.3)
    await humanBehavior.delay(300, 600)
  }

  // 1차: CSS 셀렉터 파싱
  const detail = await parseDetailWithSelectors(page, marketplace, asin)

  // 데이터 충분하면 바로 반환
  if (isDataSufficient(detail)) {
    log('info', 'detail-page', `Scraped via selectors: "${detail.title.slice(0, 50)}..."`, { asin })
    return detail
  }

  // 2차: AI Vision fallback
  if (vision) {
    log('warn', 'detail-page', 'Selector data insufficient, using AI vision fallback', { asin })
    const screenshot = await captureScreenshot(page, 1280, 800)
    const aiDetail = await vision.analyzeDetailPage(screenshot)

    if (aiDetail.page_status !== 'normal') {
      if (aiDetail.page_status === 'captcha' || aiDetail.page_status === 'blocked') {
        throw new Error('CAPTCHA_DETECTED')
      }
      throw new Error('PAGE_NOT_FOUND')
    }

    // AI 결과로 빈 필드 보충 (셀렉터 결과 우선)
    const merged: ListingDetail = {
      asin,
      title: detail.title || aiDetail.title,
      description: detail.description ?? aiDetail.description_summary,
      bulletPoints: detail.bulletPoints.length > 0 ? detail.bulletPoints : aiDetail.bullet_points,
      images: detail.images, // 이미지 URL은 셀렉터에서만 가져옴 (AI는 URL 모름)
      priceAmount: detail.priceAmount ?? aiDetail.price_amount,
      priceCurrency: detail.priceCurrency,
      sellerName: detail.sellerName ?? aiDetail.seller_name,
      sellerId: detail.sellerId,
      brand: detail.brand ?? aiDetail.brand,
      category: detail.category,
      rating: detail.rating ?? aiDetail.rating,
      reviewCount: detail.reviewCount ?? aiDetail.review_count,
    }

    log('info', 'detail-page', `AI-merged detail: "${merged.title.slice(0, 50)}..."`, { asin })
    return merged
  }

  // Vision 없으면 부족한 데이터라도 반환
  log('warn', 'detail-page', `Returning incomplete data (no AI fallback): "${detail.title.slice(0, 50)}..."`, { asin })
  return detail
}

// ─── 검색 결과에서 상품 클릭하여 상세 진입 ───

const clickIntoProduct = async (
  page: Page,
  index: number,
  persona: CrawlPersona,
): Promise<boolean> => {
  const items = await page.$$(SEARCH_SELECTORS.resultItems)
  if (index >= items.length) return false

  const item = items[index]!

  // 상품 카드 위에서 머무르기 (페르소나 기반)
  await humanBehavior.delay(
    persona.dwell.searchResultDwellMin,
    persona.dwell.searchResultDwellMax,
  )

  // 이미지 클릭 vs 제목 클릭 (페르소나에 따라)
  const clickImage = Math.random() < persona.click.preferImage
  const clickTarget = clickImage
    ? await item.$('.s-image')
    : await item.$('h2 a')

  if (!clickTarget) {
    // fallback: 아무거나 클릭 가능한 것
    const fallback = await item.$('h2 a, .s-image, a')
    if (!fallback) return false
    await fallback.click()
  } else {
    // 호버 후 클릭 (페르소나에 따라)
    if (persona.click.hoverBeforeClick) {
      await clickTarget.hover()
      await humanBehavior.delay(300, 800)
    }
    await clickTarget.click()
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 })
  return true
}

export { scrapeDetailPage, clickIntoProduct, buildDetailUrl, isDataSufficient }
