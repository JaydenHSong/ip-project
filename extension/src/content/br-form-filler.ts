// BR (Brand Registry) "Contact brand support" 폼 자동 채우기 content script
// ISOLATED world에서 실행
//
// 역할 분담:
//   이 스크립트 (ISOLATED world): 메뉴 네비게이션 + chrome.runtime 메시지 + 토스트
//   Service Worker → chrome.scripting.executeScript(MAIN world): 폼 채우기
//
// 이유:
//   Shadow DOM 내부 iframe의 contentDocument는 ISOLATED world에서 접근 불가
//   chrome.scripting.executeScript({ world: 'MAIN' })는 CSP 무관하게 MAIN world 실행 보장

import { BR_MENU_TEXT } from '@shared/br-report-config'
import type { BrReportMessage, BrReportResultMessage, BrFillFormData, BrFillFormResult } from '@shared/messages'
import {
  LOGIN_DETECT_SELECTOR,
  DESC_LABEL_TEXT,
  URL_LABEL_PREFIX,
  STOREFRONT_LABEL_PREFIX,
  POLICY_URL_LABEL_PREFIX,
  ASIN_LABEL_PREFIX,
  ORDER_ID_LABEL_PREFIX,
  SEND_BUTTON_TEXT,
} from './br-selectors'

// --- 유틸 ---

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms + Math.random() * 150))

const MENU_WAIT = 1500

// --- 토스트 ---

const showToast = (message: string, type: 'success' | 'warning' | 'error'): void => {
  const toast = document.createElement('div')
  toast.textContent = `\u{1F6E1}\uFE0F Sentinel BR: ${message}`
  const bgColor = type === 'success' ? '#16a34a' : type === 'warning' ? '#d97706' : '#dc2626'
  Object.assign(toast.style, {
    position: 'fixed', top: '16px', right: '16px', padding: '12px 20px',
    borderRadius: '8px', fontSize: '14px', fontWeight: '500', zIndex: '99999',
    color: '#fff', backgroundColor: bgColor, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'opacity 0.3s',
  })
  document.body.appendChild(toast)
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300) }, 5000)
}

// --- Service Worker에 결과 전달 ---

const sendResult = (result: BrReportResultMessage): void => {
  chrome.runtime.sendMessage(result).catch(() => {})
}

// --- 메뉴 네비게이션 (메인 프레임 일반 DOM — ISOLATED world에서 접근 가능) ---

const findMenuItemByText = (text: string): HTMLElement | null => {
  const items = document.querySelectorAll<HTMLElement>('li.cu-tree-browseTree-ctExpander-type')
  for (const item of items) {
    if (item.textContent?.trim() === text) return item
  }
  return null
}

const expandParentMenu = async (): Promise<boolean> => {
  const targetItems = ['Other policy violations', 'Incorrect variation', 'Product review violation', 'Product not as described']
  if (targetItems.some((text) => findMenuItemByText(text) !== null)) return true

  // kat-expander shadowRoot 클릭 — ISOLATED world에서도 open shadowRoot 접근 가능
  const expanders = document.querySelectorAll<HTMLElement>('kat-expander.cu-tree-browseTree-ctExpander-category')
  for (const expander of expanders) {
    if (expander.textContent?.includes('Report a store policy violation')) {
      const headerBtn = expander.shadowRoot?.querySelector<HTMLElement>('button.header')
      if (headerBtn) {
        headerBtn.click()
        await sleep(MENU_WAIT)
        return targetItems.some((text) => findMenuItemByText(text) !== null)
      }
    }
  }

  // 폴백: li 직접 클릭
  const items = document.querySelectorAll<HTMLElement>('li.cu-tree-browseTree-ctExpander-type')
  for (const item of items) {
    if (item.textContent?.trim()?.includes('Report a store policy violation')) {
      item.click()
      await sleep(MENU_WAIT)
      return targetItems.some((text) => findMenuItemByText(text) !== null)
    }
  }

  return false
}

const navigateToFormType = async (menuText: string): Promise<boolean> => {
  const expanded = await expandParentMenu()
  if (!expanded) return false

  const target = findMenuItemByText(menuText)
  if (!target) return false

  const link = target.querySelector('a')
  if (link) { link.click() } else { target.click() }
  await sleep(MENU_WAIT)
  return true
}

// --- Service Worker에 MAIN world 폼 채우기 위임 ---

const requestFillForm = async (data: BrFillFormData): Promise<BrFillFormResult> => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'BR_FILL_FORM', data }, (response: unknown) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message ?? 'sendMessage failed' })
        return
      }
      resolve((response as BrFillFormResult) ?? { success: false, error: 'No response' })
    })
  })
}

// --- 메인 실행 ---

const executeBrReport = async (msg: BrReportMessage): Promise<void> => {
  const start = Date.now()
  const elapsed = (): number => Date.now() - start

  // 1. 로그인 감지
  const loggedIn = document.querySelector(LOGIN_DETECT_SELECTOR)
  if (!loggedIn) {
    showToast('BR에 로그인하세요.', 'warning')
    sendResult({ type: 'BR_REPORT_RESULT', reportId: msg.reportId, success: false, durationMs: elapsed(), error: 'BR login not detected' })
    return
  }

  // 2. 메뉴 네비게이션
  const menuText = BR_MENU_TEXT[msg.violationType]
  const navigated = await navigateToFormType(menuText)
  if (!navigated) {
    showToast(`메뉴 "${menuText}"를 찾을 수 없습니다.`, 'error')
    sendResult({ type: 'BR_REPORT_RESULT', reportId: msg.reportId, success: false, durationMs: elapsed(), error: `Menu item not found: ${menuText}` })
    return
  }

  // 3. dry-run 체크
  const storage = await chrome.storage.local.get(['br_dry_run'])
  const dryRun = (storage.br_dry_run as boolean) ?? false

  // 4. 폼 채우기 데이터 준비
  const fillData: BrFillFormData = {
    descLabelPrefix: DESC_LABEL_TEXT[msg.violationType],
    description: msg.description,
    urlLabelPrefix: URL_LABEL_PREFIX,
    productUrls: msg.productUrls.slice(0, 10).join('\n'),
    dryRun,
    sendButtonText: SEND_BUTTON_TEXT,
  }

  if (msg.sellerStorefrontUrl && (msg.violationType === 'other_policy' || msg.violationType === 'product_not_as_described')) {
    fillData.sellerStorefrontUrl = msg.sellerStorefrontUrl
    fillData.storefrontLabelPrefix = STOREFRONT_LABEL_PREFIX
  }
  if (msg.policyUrl && (msg.violationType === 'other_policy' || msg.violationType === 'product_not_as_described')) {
    fillData.policyUrl = msg.policyUrl
    fillData.policyUrlLabelPrefix = POLICY_URL_LABEL_PREFIX
  }
  if (msg.asins && msg.asins.length > 0 && msg.violationType === 'product_review') {
    fillData.asins = msg.asins.slice(0, 10).join(', ')
    fillData.asinLabelPrefix = ASIN_LABEL_PREFIX
  }
  if (msg.orderId && msg.violationType === 'product_review') {
    fillData.orderId = msg.orderId
    fillData.orderIdLabelPrefix = ORDER_ID_LABEL_PREFIX
  }

  // 5. Service Worker에 MAIN world 폼 채우기 위임
  showToast('폼 채우기 중...', 'warning')
  const result = await requestFillForm(fillData)

  if (!result.success) {
    showToast(`폼 채우기 실패: ${result.error}`, 'error')
    sendResult({ type: 'BR_REPORT_RESULT', reportId: msg.reportId, success: false, durationMs: elapsed(), error: result.error ?? 'Fill failed' })
    return
  }

  const requiredMissed = (result.missed ?? []).filter((f: string) => f === 'description' || f === 'urls')
  if (requiredMissed.length > 0) {
    showToast(`필수 필드 누락: ${requiredMissed.join(', ')}`, 'error')
    sendResult({ type: 'BR_REPORT_RESULT', reportId: msg.reportId, success: false, durationMs: elapsed(), error: `Required fields missed: ${requiredMissed.join(', ')}` })
    return
  }

  const label = dryRun
    ? `폼 채우기 완료 (dry-run). Filled: ${(result.filled ?? []).join(', ')}`
    : 'BR 신고 제출 완료!'
  showToast(label, 'success')

  sendResult({
    type: 'BR_REPORT_RESULT',
    reportId: msg.reportId,
    success: true,
    durationMs: elapsed(),
  })
}

// --- 메시지 리스너 (Service Worker → content script) ---

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
    const msg = message as { type?: string }
    if (msg.type === 'EXECUTE_BR_REPORT') {
      executeBrReport(msg as BrReportMessage)
      sendResponse({ received: true })
    }
    return false
  },
)

// --- 테스트 모드 ---
if (new URLSearchParams(window.location.search).get('test') === '1') {
  const runTest = async (): Promise<void> => {
    await chrome.storage.local.set({ br_dry_run: true })
    showToast('BR 테스트 모드 시작... (3초 후 실행)', 'warning')
    await sleep(3000)

    await executeBrReport({
      type: 'EXECUTE_BR_REPORT',
      reportId: 'test-001',
      violationType: 'other_policy',
      description: '[TEST] This seller is violating Amazon policy by using prohibited keywords in the product listing.',
      productUrls: ['https://www.amazon.com/dp/B0TEST1234'],
      sellerStorefrontUrl: 'https://www.amazon.com/sp?seller=A1EXAMPLE',
      policyUrl: 'https://sellercentral.amazon.com/help/hub/reference/G200164330',
    })
  }
  runTest()
}
