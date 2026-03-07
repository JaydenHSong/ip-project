// Content Script 엔트리
// 아마존 상품 페이지에서 DOM 파싱 + 플로팅 버튼 삽입 + 패시브 수집

import { parseAmazonPage } from './parser'
import { createFloatingButton } from './floating-button'
import { executeFrontReport, isAmazonLoggedIn } from './front-auto-reporter'
import type { FrontReportMessage } from '@shared/messages'
import type { PassivePageData } from '@shared/types'

// 중복 주입 방어 — 동적 주입 시 이미 등록된 리스너 중복 방지
const SENTINEL_INJECTED = '__sentinel_content_injected__'

// chrome.runtime 연결 상태 확인 — extension reload 후 끊어진 연결 감지
const isRuntimeConnected = (): boolean => {
  try {
    return !!chrome.runtime?.id
  } catch {
    return false
  }
}

// 안전한 메시지 전송 — 연결 끊김 시 무시
const safeSendMessage = (message: unknown): void => {
  if (!isRuntimeConnected()) return
  try {
    chrome.runtime.sendMessage(message, () => {
      // chrome.runtime.lastError 소비 (콘솔 에러 방지)
      void chrome.runtime.lastError
    })
  } catch {
    // Extension context invalidated — 무시
  }
}

const registerMessageListener = (): void => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_PAGE_DATA') {
      try {
        const data = parseAmazonPage()
        sendResponse({ success: !!data, data })
      } catch {
        sendResponse({ success: false, data: null })
      }
      return true
    }

    // Front-end auto-report: Service Worker triggers this after SC backend starts
    if (message.type === 'EXECUTE_FRONT_REPORT') {
      const msg = message as FrontReportMessage
      executeFrontReport(msg.violationCode, {
        asin: msg.asin,
        sellerName: msg.sellerName,
        brandName: msg.brandName,
        aiDetails: msg.aiDetails,
        listingTitle: msg.listingTitle,
        marketplace: msg.marketplace,
      }).then((result) => {
        safeSendMessage({
          type: 'FRONT_REPORT_RESULT',
          reportId: msg.reportId,
          success: result.success,
          durationMs: result.durationMs,
          error: result.error,
        })
        sendResponse(result)
      })
      return true // async
    }

    // Check Amazon login status
    if (message.type === 'CHECK_AMAZON_LOGIN') {
      sendResponse({ loggedIn: isAmazonLoggedIn() })
      return true
    }

    return true
  })
}

if ((window as Record<string, unknown>)[SENTINEL_INJECTED]) {
  // 이미 주입됨 — 리스너만 재등록 (extension reload 대비)
  registerMessageListener()
} else {
  ;(window as Record<string, unknown>)[SENTINEL_INJECTED] = true

  const init = (): void => {
    registerMessageListener()

    const pageData = parseAmazonPage()
    if (!pageData) return

    // 플로팅 버튼 삽입
    createFloatingButton()

    // 패시브 수집: idle 타임에 텍스트 데이터만 Service Worker로 전달
    requestIdleCallback(() => {
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
      safeSendMessage({ type: 'PASSIVE_PAGE_DATA', data: passiveData })
    })
  }

  // DOM 로드 완료 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
}
