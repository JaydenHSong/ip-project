// Content Script 엔트리
// 아마존 상품 페이지에서 DOM 파싱 + 플로팅 버튼 삽입

import { parseAmazonPage } from './parser'
import { createFloatingButton } from './floating-button'

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
}

// DOM 로드 완료 후 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
