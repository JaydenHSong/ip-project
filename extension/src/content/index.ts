// Content Script 엔트리
// 아마존 상품 페이지에서 DOM 파싱 + 플로팅 버튼 삽입 + 패시브 수집

import { parseAmazonPage } from './parser'
import { createFloatingButton } from './floating-button'
import type { PassivePageData } from '@shared/types'

const init = (): void => {
  const pageData = parseAmazonPage()
  if (!pageData) return

  // 플로팅 버튼 삽입
  createFloatingButton()

  // Service Worker에서 요청 시 페이지 데이터 응답
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_PAGE_DATA') {
      const data = parseAmazonPage()
      sendResponse({ success: true, data })
    }
    return true // 비동기 응답 허용
  })

  // 패시브 수집: idle 타임에 텍스트 데이터만 Service Worker로 전달
  requestIdleCallback(() => {
    try {
      const passiveData: PassivePageData = {
        asin: pageData.asin,
        title: pageData.title,
        seller_name: pageData.seller_name,
        seller_id: pageData.seller_id,
        price_amount: pageData.price_amount,
        price_currency: pageData.price_currency,
        bullet_points: pageData.bullet_points,
        brand: pageData.brand,
        rating: pageData.rating,
        review_count: pageData.review_count,
        url: pageData.url,
        marketplace: pageData.marketplace,
      }
      chrome.runtime.sendMessage({ type: 'PASSIVE_PAGE_DATA', data: passiveData })
    } catch {
      // 패시브 수집 실패 시 무시
    }
  })
}

// DOM 로드 완료 후 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
