import { chromium } from 'playwright'

const main = async (): Promise<void> => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
  })
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })

  const page = await context.newPage()

  // Amazon 메인 → 검색
  await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await new Promise(r => setTimeout(r, 2000))

  const searchInput = await page.$('#twotabsearchtextbox')
  if (searchInput) {
    await searchInput.click()
    await page.keyboard.type('iPhone 17 Spigen case', { delay: 60 })
    await new Promise(r => setTimeout(r, 500))
    await page.keyboard.press('Enter')
  }
  await page.waitForLoadState('domcontentloaded')
  await new Promise(r => setTimeout(r, 3000))

  // 첫 번째 검색 결과 아이템의 전체 HTML 구조 덤프
  const domInfo = await page.evaluate(() => {
    const item = document.querySelector('[data-component-type="s-search-result"]')
    if (!item) return 'NO ITEM FOUND'

    // 아이템 내 모든 a 태그 href 확인
    const allLinks: Array<{ text: string; href: string; classes: string }> = []
    item.querySelectorAll('a').forEach(a => {
      const text = a.textContent?.trim().substring(0, 80) ?? ''
      const href = a.getAttribute('href')?.substring(0, 100) ?? ''
      const classes = a.className
      if (href && href.length > 1) {
        allLinks.push({ text, href, classes })
      }
    })

    // 타이틀 후보 요소들 확인
    const titleCandidates: Record<string, string> = {}
    const selectors = [
      'h2', 'h2 a', 'h2 a span', 'h2 span',
      '.a-size-medium', '.a-size-base-plus',
      '.a-text-normal', '.s-title-instructions-style',
      '[data-cy="title-recipe"]', '[data-cy="title-recipe"] a',
      '.puis-padding-right-small a.a-link-normal',
      '.s-product-image-container + div a',
      '.a-section .a-link-normal .a-text-normal',
      'a.a-link-normal[href*="/dp/"] .a-text-normal',
      'a.a-link-normal[href*="/dp/"]',
    ]
    for (const sel of selectors) {
      const el = item.querySelector(sel)
      titleCandidates[sel] = el?.textContent?.trim().substring(0, 120) ?? '(not found)'
    }

    // 전체 텍스트
    const fullText = item.textContent?.replace(/\s+/g, ' ').trim().substring(0, 500) ?? ''

    return {
      asin: item.getAttribute('data-asin'),
      outerHtmlLength: item.outerHTML.length,
      allLinks: allLinks.slice(0, 10),
      titleCandidates,
      fullText,
    }
  })

  console.log(JSON.stringify(domInfo, null, 2))

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
