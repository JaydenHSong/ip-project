import { chromium, type Page } from 'playwright'
import { config } from './config.js'

const MARKETPLACE_DOMAINS: Record<string, string> = {
  US: 'www.amazon.com',
  UK: 'www.amazon.co.uk',
  JP: 'www.amazon.co.jp',
  DE: 'www.amazon.de',
  FR: 'www.amazon.fr',
  IT: 'www.amazon.it',
  ES: 'www.amazon.es',
  CA: 'www.amazon.ca',
  MX: 'www.amazon.com.mx',
  AU: 'www.amazon.com.au',
}

const SELECTORS = {
  title: '#productTitle',
  price: '.a-price .a-offscreen',
  description: '#productDescription',
  bulletPoints: '#feature-bullets li span',
  images: '#imgTagWrapperId img, #altImages .a-button-thumbnail img',
  sellerName: '#sellerProfileTriggerId, #merchant-info a',
  sellerId: '#sellerProfileTriggerId',
  brand: '#bylineInfo',
  category: '#wayfinding-breadcrumbs_container li a',
  rating: '#acrPopover .a-size-base',
  reviewCount: '#acrCustomerReviewText',
  captcha: '#captchacharacters',
} as const

export type FetchResult = {
  title: string | null
  seller_name: string | null
  brand: string | null
  description: string | null
  bullet_points: string[]
  images: { url: string; position: number; alt?: string }[]
  price_amount: number | null
  price_currency: string
  rating: number | null
  review_count: number | null
  category: string | null
}

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

const parseNumber = (text: string | null, isFloat = false): number | null => {
  if (!text) return null
  const cleaned = text.replace(/[^0-9.]/g, '')
  const parsed = isFloat ? parseFloat(cleaned) : parseInt(cleaned, 10)
  return isNaN(parsed) ? null : parsed
}

export const fetchProductInfo = async (asin: string, marketplace: string): Promise<FetchResult> => {
  const domain = MARKETPLACE_DOMAINS[marketplace] ?? MARKETPLACE_DOMAINS['US']
  const url = `https://${domain}/dp/${asin}`

  console.log(`[scraper] Fetching ${asin} from ${domain}`)

  const browser = await chromium.connectOverCDP(config.browserWs)

  try {
    const context = browser.contexts()[0] ?? await browser.newContext()
    const page = await context.newPage()

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.gotoTimeout })

    // CAPTCHA 감지
    const captcha = await page.$(SELECTORS.captcha)
    if (captcha) {
      throw new Error('CAPTCHA_DETECTED')
    }

    // 빈 페이지 감지
    const bodyLength = await page.evaluate(() => document.body.innerText.length)
    if (bodyLength < 100) {
      throw new Error('PAGE_BLOCKED_OR_EMPTY')
    }

    // 자연스럽게 대기
    await page.waitForTimeout(1000 + Math.random() * 2000)

    // 파싱
    const title = await safeText(page, SELECTORS.title)
    const priceText = await safeText(page, SELECTORS.price)
    const priceCurrency = ['US', 'CA', 'AU'].includes(marketplace) ? 'USD' :
      marketplace === 'UK' ? 'GBP' : marketplace === 'JP' ? 'JPY' : 'EUR'

    const bulletEls = await page.$$(SELECTORS.bulletPoints)
    const bullet_points: string[] = []
    for (const el of bulletEls) {
      const text = await el.textContent()
      if (text?.trim()) bullet_points.push(text.trim())
    }

    const imageEls = await page.$$(SELECTORS.images)
    const images: FetchResult['images'] = []
    const seenUrls = new Set<string>()
    for (let i = 0; i < imageEls.length; i++) {
      const src = await imageEls[i]!.getAttribute('src')
      if (src && !seenUrls.has(src) && !src.includes('sprite') && !src.includes('transparent')) {
        seenUrls.add(src)
        const alt = await imageEls[i]!.getAttribute('alt')
        images.push({ url: src, position: images.length + 1, alt: alt ?? undefined })
      }
    }

    const sellerName = await safeText(page, SELECTORS.sellerName)
    const brandRaw = await safeText(page, SELECTORS.brand)
    const brand = brandRaw?.replace(/^(Visit the |Brand: |by )/, '').trim() ?? null

    const categoryEls = await page.$$(SELECTORS.category)
    let category: string | null = null
    if (categoryEls.length > 0) {
      const last = categoryEls[categoryEls.length - 1]!
      category = (await last.textContent())?.trim() ?? null
    }

    const description = await safeText(page, SELECTORS.description)
    const ratingText = await safeText(page, SELECTORS.rating)
    const reviewCountText = await safeText(page, SELECTORS.reviewCount)

    await page.close()

    console.log(`[scraper] Done: "${title?.slice(0, 50)}..."`)

    return {
      title,
      seller_name: sellerName,
      brand,
      description,
      bullet_points,
      images,
      price_amount: parseNumber(priceText, true),
      price_currency: priceCurrency,
      rating: parseNumber(ratingText?.match(/(\d+\.?\d*)/)?.[1] ?? null, true),
      review_count: parseNumber(reviewCountText),
      category,
    }
  } finally {
    await browser.close().catch(() => {})
  }
}
