import type { Page } from 'playwright'
import type { Marketplace, SearchResult } from '../types/index.js'
import { MARKETPLACE_DOMAINS } from '../types/index.js'
import { SEARCH_SELECTORS } from './selectors.js'
import { humanBehavior } from '../anti-bot/human-behavior.js'
import { log } from '../logger.js'

// 검색 URL 생성
const buildSearchUrl = (
  marketplace: Marketplace,
  keyword: string,
  pageNumber: number,
): string => {
  const domain = MARKETPLACE_DOMAINS[marketplace]
  const params = new URLSearchParams({
    k: keyword,
    page: String(pageNumber),
  })
  return `https://${domain}/s?${params.toString()}`
}

// CAPTCHA/차단 감지
const detectBlock = async (page: Page): Promise<boolean> => {
  const captcha = await page.$(SEARCH_SELECTORS.captcha)
  if (captcha) return true

  // HTTP 503 Service Unavailable 체크
  const title = await page.title()
  if (title.includes('Sorry') || title.includes('Robot Check')) return true

  return false
}

// 검색 결과 페이지 파싱
const scrapeSearchPage = async (
  page: Page,
  marketplace: Marketplace,
  keyword: string,
  pageNumber: number,
): Promise<SearchResult[]> => {
  const url = buildSearchUrl(marketplace, keyword, pageNumber)
  log('info', 'search-page', `Navigating to search page ${pageNumber}`, { campaignId: keyword })

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })

  // 차단 감지
  if (await detectBlock(page)) {
    throw new Error('CAPTCHA_DETECTED')
  }

  // 검색 결과 없음 체크
  const noResults = await page.$(SEARCH_SELECTORS.noResults)
  if (noResults) {
    log('info', 'search-page', `No results for "${keyword}" on page ${pageNumber}`)
    return []
  }

  // 사람처럼 스크롤
  await humanBehavior.delay(500, 1500)
  await humanBehavior.scrollPage(page, 0.3)
  await humanBehavior.delay(300, 800)
  await humanBehavior.scrollPage(page, 0.6)

  // 검색 결과 아이템 추출
  const items = await page.$$(SEARCH_SELECTORS.resultItems)
  const results: SearchResult[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!

    try {
      const asin = await item.getAttribute('data-asin')
      if (!asin || asin.trim() === '') continue

      const titleEl = await item.$(SEARCH_SELECTORS.title)
      const title = titleEl ? (await titleEl.textContent())?.trim() ?? '' : ''

      const priceEl = await item.$(SEARCH_SELECTORS.price)
      const price = priceEl ? (await priceEl.textContent())?.trim() ?? null : null

      const imageEl = await item.$(SEARCH_SELECTORS.image)
      const imageUrl = imageEl ? await imageEl.getAttribute('src') : null

      const sponsoredEl = await item.$(SEARCH_SELECTORS.sponsored)
      const sponsored = sponsoredEl !== null

      results.push({
        asin,
        title,
        price,
        imageUrl,
        sponsored,
        pageNumber,
        positionInPage: i + 1,
      })
    } catch {
      log('warn', 'search-page', `Failed to parse search result at position ${i + 1}`, {
        campaignId: keyword,
      })
    }
  }

  log('info', 'search-page', `Found ${results.length} results on page ${pageNumber}`, {
    campaignId: keyword,
  })

  return results
}

// 다음 페이지 존재 여부
const hasNextPage = async (page: Page): Promise<boolean> => {
  const nextButton = await page.$(SEARCH_SELECTORS.nextPage)
  if (!nextButton) return false

  const isDisabled = await nextButton.getAttribute('aria-disabled')
  return isDisabled !== 'true'
}

export { scrapeSearchPage, buildSearchUrl, detectBlock, hasNextPage }
