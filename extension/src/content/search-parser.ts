// 아마존 검색 결과 페이지 DOM 파서
// /s?k=... 페이지에서 리스팅 목록 일괄 파싱

import { MARKETPLACE_MAP } from '@shared/constants'
import type { PassiveSearchData, PassiveSearchItem } from '@shared/types'

const parsePrice = (el: Element): { amount: number | null; currency: string } => {
  const text = el.querySelector('.a-price .a-offscreen')?.textContent?.trim()
  if (!text) return { amount: null, currency: 'USD' }
  const cleaned = text.replace(/[^\d.,]/g, '')
  const amount = parseFloat(cleaned.replace(/,/g, ''))
  const currency = text.startsWith('$') ? 'USD'
    : text.startsWith('£') ? 'GBP'
    : text.startsWith('¥') ? 'JPY'
    : text.includes('€') ? 'EUR'
    : 'USD'
  return { amount: isNaN(amount) ? null : amount, currency }
}

const parseRating = (el: Element): number | null => {
  const text = el.querySelector('.a-icon-alt')?.textContent
  const match = text?.match(/([\d.]+)\s+out of/)
  return match ? parseFloat(match[1]) : null
}

const parseReviewCount = (el: Element): number | null => {
  const link = el.querySelector('a[href*="#customerReviews"], a[href*="Reviews"] span.a-size-base')
  const text = link?.textContent?.trim()
  if (!text) return null
  const cleaned = text.replace(/[(),]/g, '').trim()
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? null : num
}

export const parseAmazonSearchPage = (): PassiveSearchData | null => {
  const params = new URLSearchParams(window.location.search)
  const searchTerm = params.get('k')
  if (!searchTerm) return null

  const marketplace = MARKETPLACE_MAP[window.location.hostname] ?? 'US'
  const containers = document.querySelectorAll('div[data-component-type="s-search-result"]')
  if (containers.length === 0) return null

  const items: PassiveSearchItem[] = []

  containers.forEach((container) => {
    const asin = container.getAttribute('data-asin')
    if (!asin || asin.length !== 10) return

    const title = container.querySelector('h2 a span')?.textContent?.trim() ?? ''
    if (!title) return

    const { amount, currency } = parsePrice(container)
    const brand = container.querySelector('.a-row .a-size-base-plus')?.textContent?.trim()
      ?? container.querySelector('h2')?.closest('.a-section')?.querySelector('.a-row:first-child .a-size-base')?.textContent?.trim()
      ?? null
    const rating = parseRating(container)
    const reviewCount = parseReviewCount(container)
    const isSponsored = container.querySelector('.puis-label-popover-default, .s-label-popover-default') !== null
      || (container.textContent?.includes('Sponsored') ?? false)

    items.push({
      asin,
      title,
      price_amount: amount,
      price_currency: currency,
      brand,
      rating,
      review_count: reviewCount,
      is_sponsored: isSponsored,
      marketplace,
    })
  })

  if (items.length === 0) return null

  const pageEl = document.querySelector('.s-pagination-selected')
  const pageNumber = pageEl ? parseInt(pageEl.textContent?.trim() ?? '1', 10) : 1

  return {
    search_term: searchTerm,
    url: window.location.href,
    marketplace,
    items,
    page_number: isNaN(pageNumber) ? 1 : pageNumber,
  }
}
