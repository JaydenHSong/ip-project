import type { Page } from 'playwright'
import type { Marketplace, ListingDetail } from '../types/index.js'
import { MARKETPLACE_DOMAINS } from '../types/index.js'
import { DETAIL_SELECTORS } from './selectors.js'
import { humanBehavior } from '../anti-bot/human-behavior.js'
import { log } from '../logger.js'

// 상세 URL 생성
const buildDetailUrl = (marketplace: Marketplace, asin: string): string => {
  const domain = MARKETPLACE_DOMAINS[marketplace]
  return `https://${domain}/dp/${asin}`
}

// 안전한 텍스트 추출 (셀렉터 실패 시 null)
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

// 가격 파싱 (문자열 → 숫자)
const parsePrice = (priceText: string | null): number | null => {
  if (!priceText) return null
  const cleaned = priceText.replace(/[^0-9.]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? null : parsed
}

// 리뷰 수 파싱 ("1,234 ratings" → 1234)
const parseReviewCount = (text: string | null): number | null => {
  if (!text) return null
  const cleaned = text.replace(/[^0-9]/g, '')
  const parsed = parseInt(cleaned, 10)
  return isNaN(parsed) ? null : parsed
}

// 평점 파싱 ("4.5 out of 5 stars" → 4.5)
const parseRating = (text: string | null): number | null => {
  if (!text) return null
  const match = text.match(/(\d+\.?\d*)/)
  if (!match) return null
  return parseFloat(match[1]!)
}

// 리스팅 상세 페이지 파싱
const scrapeDetailPage = async (
  page: Page,
  marketplace: Marketplace,
  asin: string,
): Promise<ListingDetail> => {
  const url = buildDetailUrl(marketplace, asin)
  log('info', 'detail-page', `Navigating to detail page`, { asin })

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })

  // CAPTCHA 감지
  const captcha = await page.$(DETAIL_SELECTORS.captcha)
  if (captcha) {
    throw new Error('CAPTCHA_DETECTED')
  }

  // 사람처럼 스크롤
  await humanBehavior.delay(500, 1500)
  await humanBehavior.scrollPage(page, 0.3)
  await humanBehavior.delay(300, 600)

  // 제목
  const title = (await safeText(page, DETAIL_SELECTORS.title)) ?? ''

  // 가격
  const priceText = await safeText(page, DETAIL_SELECTORS.price)
  const priceAmount = parsePrice(priceText)
  const priceCurrency = marketplace === 'US' || marketplace === 'CA' || marketplace === 'AU' ? 'USD' :
    marketplace === 'UK' ? 'GBP' :
    marketplace === 'JP' ? 'JPY' : 'EUR'

  // 설명
  const description = await safeText(page, DETAIL_SELECTORS.description)

  // 불릿 포인트
  const bulletEls = await page.$$(DETAIL_SELECTORS.bulletPoints)
  const bulletPoints: string[] = []
  for (const el of bulletEls) {
    const text = await el.textContent()
    if (text?.trim()) {
      bulletPoints.push(text.trim())
    }
  }

  // 이미지
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

  // 셀러
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

  // 브랜드
  const brandRaw = await safeText(page, DETAIL_SELECTORS.brand)
  const brand = brandRaw?.replace(/^(Visit the |Brand: |by )/, '').trim() ?? null

  // 카테고리
  const categoryEls = await page.$$(DETAIL_SELECTORS.category)
  let category: string | null = null
  if (categoryEls.length > 0) {
    const lastCategory = categoryEls[categoryEls.length - 1]!
    category = (await lastCategory.textContent())?.trim() ?? null
  }

  // 평점 + 리뷰 수
  const ratingText = await safeText(page, DETAIL_SELECTORS.rating)
  const rating = parseRating(ratingText)

  const reviewCountText = await safeText(page, DETAIL_SELECTORS.reviewCount)
  const reviewCount = parseReviewCount(reviewCountText)

  await humanBehavior.scrollPage(page, 0.5)

  log('info', 'detail-page', `Scraped detail page: "${title.slice(0, 50)}..."`, { asin })

  return {
    asin,
    title,
    description,
    bulletPoints,
    images,
    priceAmount,
    priceCurrency,
    sellerName,
    sellerId,
    brand,
    category,
    rating,
    reviewCount,
  }
}

export { scrapeDetailPage, buildDetailUrl }
