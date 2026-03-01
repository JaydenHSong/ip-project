import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const SEARCH_KEYWORD = 'iPhone 17 Spigen case'
const MAX_PRODUCTS = 3
const OUTPUT_DIR = join(import.meta.dirname ?? '.', '..', 'crawl-results')

type ProductResult = {
  rank: number
  asin: string
  title: string
  price: string
  rating: string
  reviewCount: string
  seller: string
  brand: string
  imageUrl: string
  url: string
  isPrime: boolean
  isSponsored: boolean
  // 상세 페이지
  description: string
  bulletPoints: string[]
  detailImages: string[]
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 500))

const main = async (): Promise<void> => {
  mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log(`\n🔍 Amazon 검색: "${SEARCH_KEYWORD}"`)
  console.log('─'.repeat(50))

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
  })

  // 강화된 Stealth 설정
  await context.addInitScript(() => {
    // navigator.webdriver 숨기기
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })

    // chrome.runtime 위장
    const win = window as unknown as Record<string, unknown>
    win['chrome'] = {
      runtime: { connect: () => {}, sendMessage: () => {} },
    }

    // navigator.plugins 위장
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' },
      ],
    })

    // navigator.languages 위장
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    })

    // permissions.query 위장
    const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions)
    window.navigator.permissions.query = (parameters: PermissionDescriptor) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: 'denied' } as PermissionStatus)
      }
      return originalQuery(parameters)
    }

    // WebGL 렌더러 위장
    const getParameter = WebGLRenderingContext.prototype.getParameter
    WebGLRenderingContext.prototype.getParameter = function (parameter: number) {
      if (parameter === 37445) return 'Intel Inc.'
      if (parameter === 37446) return 'Intel Iris OpenGL Engine'
      return getParameter.call(this, parameter)
    }
  })

  const page = await context.newPage()

  // 1. 먼저 Amazon 메인 방문 (쿠키 세팅)
  console.log('\n📡 Amazon.com 메인 방문 (쿠키 세팅)...')
  await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await delay(2000)

  // 2. 검색바에 키워드 입력 + 검색 (사람처럼)
  console.log(`🔎 검색: "${SEARCH_KEYWORD}"`)
  const searchInput = await page.$('#twotabsearchtextbox')
  if (searchInput) {
    await searchInput.click()
    await delay(300)
    // 사람처럼 한 글자씩 타이핑
    for (const char of SEARCH_KEYWORD) {
      await page.keyboard.type(char, { delay: 50 + Math.random() * 80 })
    }
    await delay(500)
    await page.keyboard.press('Enter')
  } else {
    // 검색바 없으면 URL 직접 접근
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(SEARCH_KEYWORD)}`
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  }

  await page.waitForLoadState('domcontentloaded')
  await delay(3000)

  // 검색 결과 스크린샷
  await page.screenshot({
    path: join(OUTPUT_DIR, 'search-results.png'),
    fullPage: false,
  })
  console.log('📸 검색 결과 스크린샷 저장됨')

  // 3. 검색 결과 파싱 (2026 아마존 DOM 구조 대응)
  const products = await page.evaluate((max: number) => {
    const results: Array<{
      asin: string
      title: string
      price: string
      rating: string
      reviewCount: string
      url: string
      imageUrl: string
      isPrime: boolean
      isSponsored: boolean
    }> = []

    const items = document.querySelectorAll('[data-component-type="s-search-result"]')

    for (const item of items) {
      if (results.length >= max) break

      const asin = item.getAttribute('data-asin') ?? ''
      if (!asin) continue

      // 타이틀: [data-cy="title-recipe"] 안에 브랜드(h2) + 제품명(a.a-text-normal)
      const brand = item.querySelector('h2')?.textContent?.trim() ?? ''
      const titleRecipe = item.querySelector('[data-cy="title-recipe"]')
      const titleLink = titleRecipe?.querySelector('a.a-link-normal') as HTMLAnchorElement | null
      const productName = titleLink?.querySelector('.a-text-normal')?.textContent?.trim() ??
        titleLink?.textContent?.trim() ?? ''
      // 브랜드 + 제품명 결합
      const title = productName ? `${brand} ${productName}`.trim() : brand
      if (!title || title.length < 3) continue

      // URL: title-recipe 안의 a 태그 href
      let url = ''
      if (titleLink) {
        const rawHref = titleLink.getAttribute('href') ?? ''
        url = rawHref.startsWith('http') ? rawHref : `https://www.amazon.com${rawHref}`
        // 쿼리파라미터 정리 — /dp/ASIN까지만 추출
        const dpMatch = url.match(/(\/dp\/[A-Z0-9]{10})/)
        if (dpMatch) {
          url = `https://www.amazon.com${dpMatch[1]}`
        }
      }
      // URL 없으면 ASIN으로 구성
      if (!url) url = `https://www.amazon.com/dp/${asin}`

      // 가격: .a-offscreen (화면 읽기용 전체 가격)
      const offscreenPrice = item.querySelector('.a-price .a-offscreen')
      const priceWhole = item.querySelector('.a-price .a-price-whole')?.textContent?.trim() ?? ''
      const priceFraction = item.querySelector('.a-price .a-price-fraction')?.textContent?.trim() ?? ''
      let price = offscreenPrice?.textContent?.trim() ?? ''
      if (!price && priceWhole) {
        price = `$${priceWhole}${priceFraction}`
      }
      if (!price) price = 'N/A'

      // 평점: .a-icon-alt 텍스트
      const ratingEl = item.querySelector('.a-icon-alt')
      const rating = ratingEl?.textContent?.trim() ?? 'N/A'

      // 리뷰 수: "(335.3K)" 같은 형태 — a 태그 중 괄호 포함 숫자
      let reviewCount = 'N/A'
      const allLinks = item.querySelectorAll('a')
      for (const el of allLinks) {
        const text = el.textContent?.trim() ?? ''
        // "(335.3K)" 또는 "(1,234)" 형태 매칭
        const match = text.match(/^\(?([\d,.]+[KkMm]?)\)?$/)
        if (match && text.includes('(')) {
          reviewCount = text.replace(/[()]/g, '')
          break
        }
      }

      // 이미지
      const imgEl = item.querySelector('.s-image') as HTMLImageElement | null
      const imageUrl = imgEl?.src ?? ''

      // Prime
      const isPrime = !!item.querySelector('.a-icon-prime, [data-a-badge-type="prime"]')

      // Sponsored
      const isSponsored = !!item.querySelector('.puis-label-popover') ||
        (item.querySelector('.a-row .a-color-secondary')?.textContent?.includes('Sponsored') ?? false)

      results.push({ asin, title, price, rating, reviewCount, url, imageUrl, isPrime, isSponsored })
    }

    return results
  }, MAX_PRODUCTS)

  console.log(`\n✅ ${products.length}개 제품 파싱 완료\n`)

  // 5. 각 제품 상세 페이지
  const detailResults: ProductResult[] = []

  for (let i = 0; i < products.length; i++) {
    const product = products[i]!
    console.log(`\n${'═'.repeat(70)}`)
    console.log(`📦 [${i + 1}/${products.length}] ${product.title.substring(0, 100)}`)
    console.log(`${'═'.repeat(70)}`)
    console.log(`🔗 ASIN: ${product.asin}`)
    console.log(`🌐 URL: ${product.url.substring(0, 80)}...`)
    console.log(`💲 가격: ${product.price}`)
    console.log(`⭐ 평점: ${product.rating}`)
    console.log(`📝 리뷰: ${product.reviewCount}`)
    console.log(`🏷️ Prime: ${product.isPrime ? 'Yes' : 'No'}`)
    console.log(`📢 Sponsored: ${product.isSponsored ? 'Yes' : 'No'}`)

    // 상세 페이지 — 검색 결과에서 링크 클릭 (더 자연스러움)
    await delay(2000 + Math.random() * 2000)

    // 새 탭 대신 같은 페이지에서 navigate
    const detailUrl = `https://www.amazon.com/dp/${product.asin}`
    console.log(`\n🔗 상세 페이지 이동: /dp/${product.asin}`)

    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await delay(2000)

    // "Continue shopping" 봇 감지 페이지 체크 + 우회
    const isBlocked = await page.evaluate(() => {
      const body = document.body.textContent ?? ''
      return body.includes('Click the button below to continue shopping') ||
        body.includes('Sorry, we just need to make sure') ||
        !!document.querySelector('#captchacharacters')
    })

    let detailData = {
      seller: 'N/A',
      brand: 'N/A',
      description: '',
      bulletPoints: [] as string[],
      detailImages: [] as string[],
    }

    if (isBlocked) {
      console.log('⚠️ 봇 감지됨 — "Continue shopping" 버튼 클릭 시도...')

      // Continue shopping 버튼 클릭
      const continueBtn = await page.$('a:has-text("Continue shopping"), input[type="submit"]')
      if (continueBtn) {
        await continueBtn.click()
        await delay(3000)
        await page.waitForLoadState('domcontentloaded')
      }

      // 재접근
      const stillBlocked = await page.evaluate(() => {
        return (document.body.textContent ?? '').includes('Click the button below to continue shopping')
      })

      if (stillBlocked) {
        console.log('❌ 여전히 차단됨 — 뒤로 가서 검색 결과에서 직접 클릭 시도')
        // 검색 결과로 돌아가기
        await page.goBack()
        await delay(2000)

        // 해당 ASIN 아이템의 링크를 직접 클릭
        const itemLink = await page.$(`[data-asin="${product.asin}"] h2 a`)
        if (itemLink) {
          console.log('🖱️ 검색 결과에서 직접 클릭...')
          await itemLink.click()
          await page.waitForLoadState('domcontentloaded')
          await delay(3000)

          const blockedAgain = await page.evaluate(() => {
            return (document.body.textContent ?? '').includes('Click the button below to continue shopping') ||
              (document.body.textContent ?? '').includes('Robot Check')
          })

          if (!blockedAgain) {
            console.log('✅ 클릭으로 접근 성공!')
            detailData = await extractDetailData(page)
          } else {
            console.log('❌ 클릭으로도 차단됨 — 프록시 없이는 한계')
          }
        }
      } else {
        console.log('✅ Continue shopping으로 차단 우회 성공!')
        // 다시 상세 페이지 이동
        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await delay(2000)
        detailData = await extractDetailData(page)
      }
    } else {
      console.log('✅ 상세 페이지 접근 성공!')
      detailData = await extractDetailData(page)
    }

    // 상세 페이지 스크린샷
    const screenshotPath = `product-${i + 1}-${product.asin}.png`
    await page.screenshot({
      path: join(OUTPUT_DIR, screenshotPath),
      fullPage: false,
    })
    console.log(`📸 스크린샷: crawl-results/${screenshotPath}`)

    if (detailData.seller !== 'N/A') {
      console.log(`🏪 판매자: ${detailData.seller}`)
      console.log(`🏷️ 브랜드: ${detailData.brand}`)
      console.log(`📄 설명: ${detailData.description.substring(0, 80)}...`)
      console.log(`📋 불릿: ${detailData.bulletPoints.length}개`)
      console.log(`🖼️ 이미지: ${detailData.detailImages.length}개`)
    }

    detailResults.push({
      rank: i + 1,
      ...product,
      ...detailData,
    })
  }

  // 6. 결과 JSON 저장
  const resultJson = {
    keyword: SEARCH_KEYWORD,
    crawledAt: new Date().toISOString(),
    marketplace: 'amazon.com (US)',
    totalProducts: detailResults.length,
    products: detailResults,
  }

  writeFileSync(
    join(OUTPUT_DIR, 'results.json'),
    JSON.stringify(resultJson, null, 2),
    'utf-8',
  )

  // 7. 요약
  console.log(`\n\n${'━'.repeat(70)}`)
  console.log(`📊 크롤링 결과: "${SEARCH_KEYWORD}"`)
  console.log(`${'━'.repeat(70)}`)
  for (const p of detailResults) {
    console.log(`\n  ${p.rank}. [${p.asin}] ${p.title.substring(0, 60)}`)
    console.log(`     💲 ${p.price}  ⭐ ${p.rating}  📝 ${p.reviewCount}건`)
    console.log(`     🏪 ${p.seller}  🏷️ ${p.brand}`)
    console.log(`     🔗 ${p.url.substring(0, 70)}`)
    console.log(`     📄 설명: ${p.description ? p.description.substring(0, 50) + '...' : '(차단됨)'}`)
  }
  console.log(`\n${'━'.repeat(70)}`)
  console.log(`📁 crawl-results/ 에 저장 완료`)

  await browser.close()
  console.log('\n✅ 크롤링 완료!')
}

// 상세 페이지 데이터 추출 함수
async function extractDetailData(page: import('playwright').Page) {
  return await page.evaluate(() => {
    // 판매자
    const sellerEl = document.querySelector('#sellerProfileTriggerId') ??
      document.querySelector('#merchant-info a') ??
      document.querySelector('#tabular-buybox .tabular-buybox-text[tabular-attribute-name="Sold by"] span') ??
      document.querySelector('#buybox-tabular .tabular-buybox-text span')
    let seller = sellerEl?.textContent?.trim() ?? ''
    // "Sold by" 텍스트 안의 값 추출
    if (!seller) {
      const soldByEl = document.querySelector('#aod-offer-soldBy .a-fixed-left-grid-col.a-col-right')
      seller = soldByEl?.textContent?.trim() ?? 'Amazon.com'
    }
    if (!seller) seller = 'Amazon.com'

    // 브랜드
    const brandEl = document.querySelector('#bylineInfo')
    let brand = brandEl?.textContent?.trim() ?? 'N/A'
    brand = brand.replace(/^(Visit the |Brand: |by |Store: )/, '').replace(/ Store$/, '').trim()

    // 설명
    const descEl = document.querySelector('#productDescription p') ??
      document.querySelector('#productDescription')
    const description = descEl?.textContent?.trim() ?? ''

    // 불릿 포인트
    const bulletEls = document.querySelectorAll('#feature-bullets li span.a-list-item')
    const bulletPoints: string[] = []
    for (const el of bulletEls) {
      const text = el.textContent?.trim()
      if (text && text.length > 5 && !text.includes('Make sure this fits')) {
        bulletPoints.push(text)
      }
    }

    // 이미지
    const detailImages: string[] = []
    const mainImg = document.querySelector('#landingImage') as HTMLImageElement | null
    if (mainImg?.src) detailImages.push(mainImg.src)
    const altImgs = document.querySelectorAll('#altImages .a-button-thumbnail img')
    for (const img of altImgs) {
      const src = (img as HTMLImageElement).src
      if (src && !src.includes('sprite') && !src.includes('transparent') && !detailImages.includes(src)) {
        // 썸네일 → 풀사이즈 변환
        const fullSrc = src.replace(/\._.*_\./, '._AC_SL1500_.')
        detailImages.push(fullSrc)
      }
    }

    return { seller, brand, description, bulletPoints, detailImages }
  })
}

main().catch((e) => {
  console.error('❌ 에러:', e)
  process.exit(1)
})
