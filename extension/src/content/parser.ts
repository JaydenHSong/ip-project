// 아마존 상품 페이지 DOM 파서
// 셀렉터를 별도 객체로 분리하여 Amazon DOM 변경 시 빠르게 대응

import { MARKETPLACE_MAP } from '@shared/constants'
import type { ParsedPageData } from '@shared/types'

const trySelectors = <T>(selectors: (() => T | null | undefined)[]): T | null => {
  for (const selector of selectors) {
    try {
      const result = selector()
      if (result !== null && result !== undefined && result !== '') return result
    } catch {
      // 셀렉터 실패 시 다음 시도
    }
  }
  return null
}

const SELECTORS = {
  asin: [
    () => document.querySelector<HTMLInputElement>('input[name="ASIN"]')?.value,
    () => window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/i)?.[1]?.toUpperCase(),
    () => window.location.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i)?.[1]?.toUpperCase(),
    () => window.location.pathname.match(/\/gp\/aw\/d\/([A-Z0-9]{10})/i)?.[1]?.toUpperCase(),
    () => window.location.href.match(/(?:[?&]|%3[Ff])asin=([A-Z0-9]{10})/i)?.[1]?.toUpperCase(),
    () => document.querySelector('[data-asin]')?.getAttribute('data-asin'),
    () => document.querySelector('[data-csa-c-asin]')?.getAttribute('data-csa-c-asin'),
  ],
  title: [
    () => document.querySelector('#productTitle')?.textContent?.trim(),
    () => document.querySelector('#title span')?.textContent?.trim(),
  ],
  sellerName: [
    () => document.querySelector('#sellerProfileTriggerId')?.textContent?.trim(),
    () => document.querySelector('#merchant-info a')?.textContent?.trim(),
    () => document.querySelector('#tabular-buybox .tabular-buybox-text a')?.textContent?.trim(),
  ],
  sellerId: [
    () => {
      const link = document.querySelector('#sellerProfileTriggerId')?.closest('a')
      return link?.getAttribute('href')?.match(/seller=([A-Z0-9]+)/)?.[1] ?? null
    },
  ],
  price: [
    () => document.querySelector('.a-price .a-offscreen')?.textContent?.trim(),
    () => document.querySelector('#priceblock_ourprice')?.textContent?.trim(),
    () => document.querySelector('.a-price-whole')?.textContent?.trim(),
  ],
  images: [
    () => {
      const imgs = document.querySelectorAll('#altImages img, #imgTagWrapperId img')
      return Array.from(imgs)
        .map((img) => (img as HTMLImageElement).src)
        .filter((src) => src && !src.includes('sprite') && !src.includes('grey-pixel'))
        .map((src) => src.replace(/\._[^.]+\./, '.'))
    },
  ],
  bulletPoints: [
    () => {
      const items = document.querySelectorAll('#feature-bullets li span.a-list-item')
      return Array.from(items)
        .map((el) => el.textContent?.trim())
        .filter((text): text is string => !!text && text.length > 1)
    },
  ],
  brand: [
    () => document.querySelector('#bylineInfo')?.textContent?.replace(/^(Visit the |Brand: )/, '').trim(),
    () => document.querySelector('.po-brand .po-break-word')?.textContent?.trim(),
  ],
  rating: [
    () => {
      const text = document.querySelector('#acrPopover .a-icon-alt')?.textContent
      const match = text?.match(/([\d.]+)\s+out of/)
      return match ? parseFloat(match[1]) : null
    },
  ],
  reviewCount: [
    () => {
      const text = document.querySelector('#acrCustomerReviewText')?.textContent
      const match = text?.match(/([\d,]+)/)
      return match ? parseInt(match[1].replace(/,/g, ''), 10) : null
    },
  ],
}

const parsePrice = (raw: string | null): { amount: number | null; currency: string } => {
  if (!raw) return { amount: null, currency: 'USD' }
  const cleaned = raw.replace(/[^\d.,]/g, '')
  const amount = parseFloat(cleaned.replace(/,/g, ''))
  const currency = raw.startsWith('$') ? 'USD'
    : raw.startsWith('£') ? 'GBP'
    : raw.startsWith('¥') ? 'JPY'
    : raw.includes('€') ? 'EUR'
    : 'USD'
  return { amount: isNaN(amount) ? null : amount, currency }
}

export const parseAmazonPage = (): ParsedPageData | null => {
  const asin = trySelectors(SELECTORS.asin)
  if (!asin) return null

  const title = trySelectors(SELECTORS.title) ?? ''
  const priceRaw = trySelectors(SELECTORS.price)
  const { amount, currency } = parsePrice(priceRaw)
  const marketplace = MARKETPLACE_MAP[window.location.hostname] ?? 'US'

  return {
    asin,
    title,
    seller_name: trySelectors(SELECTORS.sellerName),
    seller_id: trySelectors(SELECTORS.sellerId),
    price_amount: amount,
    price_currency: currency,
    images: trySelectors(SELECTORS.images) ?? [],
    bullet_points: trySelectors(SELECTORS.bulletPoints) ?? [],
    brand: trySelectors(SELECTORS.brand),
    rating: trySelectors(SELECTORS.rating),
    review_count: trySelectors(SELECTORS.reviewCount),
    url: window.location.href,
    marketplace,
  }
}
