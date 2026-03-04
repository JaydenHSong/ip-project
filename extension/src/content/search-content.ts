// 검색 결과 페이지 Content Script 엔트리
// /s?k=... 페이지에서 패시브 수집

import { parseAmazonSearchPage } from './search-parser'

const init = (): void => {
  requestIdleCallback(() => {
    try {
      const searchData = parseAmazonSearchPage()
      if (!searchData) return
      chrome.runtime.sendMessage({ type: 'PASSIVE_SEARCH_DATA', data: searchData })
    } catch {
      // 파싱 실패 시 무시
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
