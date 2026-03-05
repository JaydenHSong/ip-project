import type { Page } from 'playwright'
import type { Marketplace, SearchResult } from '../types/index.js'
import { MARKETPLACE_DOMAINS } from '../types/index.js'
import { SEARCH_SELECTORS } from './selectors.js'
import { humanBehavior } from '../anti-bot/human-behavior.js'
import { captureScreenshot } from './screenshot.js'
import type { CrawlPersona } from '../anti-bot/persona.js'
import type { VisionAnalyzer } from '../ai/vision-analyzer.js'
import { isSpigenProduct } from '../anti-bot/persona-ranges.js'
import { log } from '../logger.js'

const SEARCH_BAR_SELECTOR = '#twotabsearchtextbox'
const SEARCH_BUTTON_SELECTOR = '#nav-search-submit-button'

// ─── 홈페이지 접속 + AI 상태 확인 ───

const navigateToHome = async (
  page: Page,
  marketplace: Marketplace,
  persona: CrawlPersona,
  vision: VisionAnalyzer | null,
): Promise<'ok' | 'blocked'> => {
  const domain = MARKETPLACE_DOMAINS[marketplace]
  log('info', 'search-page', `Navigating to Amazon homepage: ${domain}`)

  await page.goto(`https://${domain}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })

  // 쿠키 배너 처리 (있으면 수락)
  try {
    const cookieBtn = await page.$('#sp-cc-accept, [data-action="sp-cc-accept"]')
    if (cookieBtn) {
      await humanBehavior.delay(500, 1500)
      await cookieBtn.click()
      await humanBehavior.delay(300, 800)
    }
  } catch {
    // 쿠키 배너 없으면 무시
  }

  // CAPTCHA / 봇 차단 체크
  if (await detectBlock(page)) {
    if (vision) {
      const screenshot = await captureScreenshot(page, 1280, 800)
      const status = await vision.analyzePageStatus(screenshot)
      log('warn', 'search-page', `AI detected: ${status.status} — ${status.description}`)
      return 'blocked'
    }
    return 'blocked'
  }

  // 홈에서 사람처럼 잠시 둘러보기
  await humanBehavior.delay(
    persona.navigation.homeToSearchDelayMin,
    persona.navigation.homeToSearchDelayMax,
  )

  return 'ok'
}

// ─── 검색창에 키워드 타이핑 + 검색 실행 ───

const performSearch = async (
  page: Page,
  keyword: string,
  persona: CrawlPersona,
  vision: VisionAnalyzer | null,
): Promise<void> => {
  // 1차: CSS 셀렉터로 검색창 찾기
  let searchBar = await page.$(SEARCH_BAR_SELECTOR)

  // 2차: AI fallback으로 검색창 찾기
  if (!searchBar && vision) {
    log('warn', 'search-page', 'Search bar selector failed, using AI vision')
    const screenshot = await captureScreenshot(page, 1280, 800)
    const location = await vision.findSearchBar(screenshot)

    if (location.found) {
      const viewport = page.viewportSize()
      if (viewport) {
        const x = (location.approximate_location.x_percent / 100) * viewport.width
        const y = (location.approximate_location.y_percent / 100) * viewport.height
        await humanBehavior.moveMouseToCoords(page, x, y)
        await page.mouse.click(x, y)
        await humanBehavior.delay(300, 800)

        // 클릭 후 직접 타이핑
        await humanBehavior.typeWithPersona(page, ':focus', keyword, persona.typing)
        await page.keyboard.press('Enter')
        await page.waitForLoadState('domcontentloaded', { timeout: 60_000 })
        return
      }
    }

    // AI로도 못 찾으면 URL 이동 (최후 수단)
    log('warn', 'search-page', 'AI could not find search bar, falling back to URL navigation')
    const url = buildSearchUrl(page.url().includes('amazon') ? page.url().split('/')[2]! : 'www.amazon.com', keyword, 1)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    return
  }

  if (!searchBar) {
    // Vision 없으면 바로 URL fallback
    log('warn', 'search-page', 'Search bar not found, falling back to URL navigation')
    const domain = new URL(page.url()).hostname
    const url = buildSearchUrl(domain, keyword, 1)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    return
  }

  // 마우스를 검색창으로 이동
  await humanBehavior.moveMouse(page, SEARCH_BAR_SELECTOR)
  await humanBehavior.delay(200, 500)

  // 검색창 클릭 → 기존 내용 삭제 → 타이핑
  await searchBar.click({ clickCount: 3 }) // 기존 텍스트 전체 선택
  await humanBehavior.delay(100, 300)

  // 페르소나 기반 타이핑
  await humanBehavior.typeWithPersona(page, SEARCH_BAR_SELECTOR, keyword, persona.typing)
  await humanBehavior.delay(300, 800)

  // Enter 또는 검색 버튼 클릭 (랜덤)
  if (Math.random() < 0.7) {
    await page.keyboard.press('Enter')
  } else {
    const searchBtn = await page.$(SEARCH_BUTTON_SELECTOR)
    if (searchBtn) {
      await humanBehavior.moveMouse(page, SEARCH_BUTTON_SELECTOR)
      await humanBehavior.delay(100, 300)
      await searchBtn.click()
    } else {
      await page.keyboard.press('Enter')
    }
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 60_000 })
}

// ─── 검색 URL 생성 (fallback용) ───

const buildSearchUrl = (
  domain: string,
  keyword: string,
  pageNumber: number,
): string => {
  const params = new URLSearchParams({
    k: keyword,
    page: String(pageNumber),
  })
  return `https://${domain}/s?${params.toString()}`
}

// ─── CAPTCHA/차단 감지 ───

const detectBlock = async (page: Page): Promise<boolean> => {
  const captcha = await page.$(SEARCH_SELECTORS.captcha)
  if (captcha) return true

  const title = await page.title()
  if (title.includes('Sorry') || title.includes('Robot Check') || title.includes('CAPTCHA')) return true

  // URL로 차단 감지 (아마존이 리다이렉트하는 경우)
  const url = page.url()
  if (url.includes('/errors/validateCaptcha') || url.includes('/ap/captcha')) return true

  return false
}

// ─── 검색 결과 파싱 (셀렉터 + AI fallback) ───

const scrapeSearchPage = async (
  page: Page,
  _marketplace: Marketplace,
  keyword: string,
  pageNumber: number,
  persona: CrawlPersona,
  vision: VisionAnalyzer | null,
): Promise<SearchResult[]> => {
  log('info', 'search-page', `Parsing search results page ${pageNumber}`, { campaignId: keyword })

  // 차단 감지
  if (await detectBlock(page)) {
    if (vision) {
      const screenshot = await captureScreenshot(page, 1280, 800)
      const status = await vision.analyzePageStatus(screenshot)
      log('warn', 'search-page', `AI page status: ${status.status} — ${status.description}`)
      if (status.recommendation === 'retry_proxy') {
        throw new Error('CAPTCHA_DETECTED')
      }
    } else {
      throw new Error('CAPTCHA_DETECTED')
    }
  }

  // 검색 결과 없음 체크
  const noResults = await page.$(SEARCH_SELECTORS.noResults)
  if (noResults) {
    log('info', 'search-page', `No results for "${keyword}" on page ${pageNumber}`)
    return []
  }

  // 사람처럼 스크롤 (페르소나 기반)
  await humanBehavior.delay(
    persona.navigation.searchToClickDelayMin,
    persona.navigation.searchToClickDelayMax,
  )
  await humanBehavior.scrollWithPersona(page, 0.3, persona.scroll)
  await humanBehavior.delay(300, 800)
  await humanBehavior.scrollWithPersona(page, 0.6, persona.scroll)

  // 1차: CSS 셀렉터로 결과 추출
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

      // brand 추출 ("by Brand" 텍스트)
      const brandEl = await item.$('.a-size-base-plus.a-color-base, .a-row .a-size-base:not(.a-price)')
      const brandText = brandEl ? (await brandEl.textContent())?.trim().replace(/^by\s+/i, '') ?? null : null

      // seller 추출 (일부 검색 결과에 표시됨)
      const sellerEl = await item.$('.a-size-small .a-color-secondary')
      const sellerText = sellerEl ? (await sellerEl.textContent())?.trim() ?? null : null

      results.push({
        asin,
        title,
        price,
        imageUrl,
        sponsored,
        pageNumber,
        positionInPage: i + 1,
        sellerName: sellerText,
        brand: brandText,
        isSpigen: isSpigenProduct(title, brandText, sellerText),
      })
    } catch {
      log('warn', 'search-page', `Failed to parse search result at position ${i + 1}`, {
        campaignId: keyword,
      })
    }
  }

  // 2차: 셀렉터 결과가 부족하면 AI fallback
  if (results.length === 0 && vision) {
    log('warn', 'search-page', 'No results from selectors, using AI vision fallback')
    const screenshot = await captureScreenshot(page, 1280, 800)
    const aiResults = await vision.analyzeSearchResults(screenshot)

    if (aiResults.page_status === 'captcha' || aiResults.page_status === 'blocked') {
      throw new Error('CAPTCHA_DETECTED')
    }

    for (const product of aiResults.products) {
      if (!product.asin) continue
      results.push({
        asin: product.asin,
        title: product.title,
        price: product.price,
        imageUrl: null,
        sponsored: product.is_sponsored,
        pageNumber,
        positionInPage: product.position,
        sellerName: null,
        brand: null,
        isSpigen: isSpigenProduct(product.title, null, null),
      })
    }

    log('info', 'search-page', `AI fallback found ${results.length} results`)
  }

  log('info', 'search-page', `Found ${results.length} results on page ${pageNumber}`, {
    campaignId: keyword,
  })

  return results
}

// ─── 다음 페이지 이동 (클릭 방식) ───

const goToNextPage = async (
  page: Page,
  persona: CrawlPersona,
  vision: VisionAnalyzer | null,
): Promise<boolean> => {
  // 1차: CSS 셀렉터로 Next 버튼 찾기
  const nextButton = await page.$(SEARCH_SELECTORS.nextPage)

  if (nextButton) {
    const isDisabled = await nextButton.getAttribute('aria-disabled')
    if (isDisabled === 'true') return false

    // 페이지 하단까지 스크롤 (사람처럼)
    await humanBehavior.scrollWithPersona(page, 0.95, persona.scroll)
    await humanBehavior.delay(
      persona.navigation.betweenPagesDelayMin,
      persona.navigation.betweenPagesDelayMax,
    )

    // 마우스 이동 → 클릭
    await humanBehavior.moveMouse(page, SEARCH_SELECTORS.nextPage)
    await humanBehavior.delay(200, 500)
    await nextButton.click()
    await page.waitForLoadState('domcontentloaded', { timeout: 60_000 })
    return true
  }

  // 2차: AI fallback으로 Next 버튼 찾기
  if (vision) {
    log('warn', 'search-page', 'Next button selector failed, using AI vision')
    const screenshot = await captureScreenshot(page, 1280, 800)
    const location = await vision.findNextButton(screenshot)

    if (location.found && location.has_next) {
      const viewport = page.viewportSize()
      if (viewport) {
        const x = (location.approximate_location.x_percent / 100) * viewport.width
        const y = (location.approximate_location.y_percent / 100) * viewport.height
        await humanBehavior.moveMouseToCoords(page, x, y)
        await humanBehavior.delay(200, 500)
        await page.mouse.click(x, y)
        await page.waitForLoadState('domcontentloaded', { timeout: 60_000 })
        return true
      }
    }
  }

  return false
}

// ─── 기존 호환 (deprecated, 점진적 제거 예정) ───

const hasNextPage = async (page: Page): Promise<boolean> => {
  const nextButton = await page.$(SEARCH_SELECTORS.nextPage)
  if (!nextButton) return false
  const isDisabled = await nextButton.getAttribute('aria-disabled')
  return isDisabled !== 'true'
}

export {
  navigateToHome,
  performSearch,
  scrapeSearchPage,
  goToNextPage,
  hasNextPage,
  buildSearchUrl,
  detectBlock,
}
