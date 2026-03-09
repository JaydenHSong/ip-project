// BR (Brand Registry) "Contact brand support" 폼 자동 채우기 content script
// brandregistry.amazon.com/cu/contact-us 페이지에서 실행
// 3-Track 신고 체계의 BR Track 담당
//
// 아키텍처: all_frames:true → 메인 프레임 + iframe 모두에서 실행
//   메인 프레임: 메뉴 네비게이션 → postMessage로 iframe에 데이터 전달
//   iframe: postMessage 수신 → 폼 채우기

import { BR_MENU_TEXT } from '@shared/br-report-config'
import type { BrReportMessage, BrReportResultMessage } from '@shared/messages'
import {
  TREE_ITEM_SELECTOR,
  TREE_ITEM_ACTIVE_CLASS,
  FORM_IFRAME_SELECTOR,
  LOGIN_DETECT_SELECTOR,
  DESC_LABEL_TEXT,
  URL_LABEL_PREFIX,
  STOREFRONT_LABEL_PREFIX,
  POLICY_URL_LABEL_PREFIX,
  ASIN_LABEL_PREFIX,
  ORDER_ID_LABEL_PREFIX,
  SEND_BUTTON_TEXT,
} from './br-selectors'

// --- 공통 ---

const SENTINEL_MSG_KEY = '__SENTINEL_BR_FILL__'

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms + Math.random() * 150))

const isInsideIframe = (): boolean => {
  try { return window !== window.top } catch { return true }
}

// ============================================================
// IFRAME 코드 — 폼 채우기 전담
// ============================================================

if (isInsideIframe()) {

  const STEP_DELAY = 300

  const setInputValue = (
    el: HTMLInputElement | HTMLTextAreaElement,
    value: string,
  ): void => {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    setter?.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  const findFieldByLabel = (
    labelPrefix: string,
  ): HTMLInputElement | HTMLTextAreaElement | null => {
    const labels = document.querySelectorAll('label')
    for (const label of labels) {
      const text = label.textContent?.trim() ?? ''
      if (!text.startsWith(labelPrefix)) continue

      // 1. label[for]
      const forId = label.getAttribute('for')
      if (forId) {
        const el = document.getElementById(forId)
        if (el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return el
      }

      // 2. label 내부
      const inner = label.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')
      if (inner) return inner

      // 3. 다음 형제들
      let sibling = label.nextElementSibling
      while (sibling) {
        if (sibling instanceof HTMLInputElement || sibling instanceof HTMLTextAreaElement) return sibling
        const nested = sibling.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')
        if (nested) return nested
        sibling = sibling.nextElementSibling
      }

      // 4. 부모 컨테이너
      const container = label.closest('div, section, fieldset')
      if (container) {
        const field = container.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')
        if (field) return field
      }
    }
    return null
  }

  const findSendButton = (): HTMLElement | null => {
    const buttons = document.querySelectorAll<HTMLElement>('button, input[type="submit"], span[role="button"]')
    for (const btn of buttons) {
      const text = btn.textContent?.trim() ?? ''
      if (text === SEND_BUTTON_TEXT || (btn as HTMLInputElement).value === SEND_BUTTON_TEXT) return btn
    }
    const katButtons = document.querySelectorAll<HTMLElement>('kat-button, KAT-BUTTON')
    for (const btn of katButtons) {
      if (btn.textContent?.trim() === SEND_BUTTON_TEXT) return btn
      const shadowBtn = btn.shadowRoot?.querySelector<HTMLElement>('button')
      if (shadowBtn?.textContent?.trim() === SEND_BUTTON_TEXT) return shadowBtn
    }
    return null
  }

  const fillForm = async (msg: BrReportMessage): Promise<{ filled: string[]; missed: string[] }> => {
    const filled: string[] = []
    const missed: string[] = []

    // Description
    const descPrefix = DESC_LABEL_TEXT[msg.violationType]
    const descField = findFieldByLabel(descPrefix)
    if (descField) { setInputValue(descField, msg.description); filled.push('description') }
    else { missed.push('description') }
    await sleep(STEP_DELAY)

    // URLs
    const urlField = findFieldByLabel(URL_LABEL_PREFIX)
    if (urlField) { setInputValue(urlField, msg.productUrls.slice(0, 10).join('\n')); filled.push('urls') }
    else { missed.push('urls') }
    await sleep(STEP_DELAY)

    // Seller storefront URL
    if (msg.sellerStorefrontUrl && (msg.violationType === 'other_policy' || msg.violationType === 'product_not_as_described')) {
      const f = findFieldByLabel(STOREFRONT_LABEL_PREFIX)
      if (f) { setInputValue(f, msg.sellerStorefrontUrl); filled.push('storefront_url') }
      else { missed.push('storefront_url') }
      await sleep(STEP_DELAY)
    }

    // Policy URL
    if (msg.policyUrl && (msg.violationType === 'other_policy' || msg.violationType === 'product_not_as_described')) {
      const f = findFieldByLabel(POLICY_URL_LABEL_PREFIX)
      if (f) { setInputValue(f, msg.policyUrl); filled.push('policy_url') }
      else { missed.push('policy_url') }
      await sleep(STEP_DELAY)
    }

    // ASINs (product_review only)
    if (msg.asins && msg.asins.length > 0 && msg.violationType === 'product_review') {
      const f = findFieldByLabel(ASIN_LABEL_PREFIX)
      if (f) { setInputValue(f, msg.asins.slice(0, 10).join(', ')); filled.push('asins') }
      else { missed.push('asins') }
      await sleep(STEP_DELAY)
    }

    // Order ID (product_review only)
    if (msg.orderId && msg.violationType === 'product_review') {
      const f = findFieldByLabel(ORDER_ID_LABEL_PREFIX)
      if (f) { setInputValue(f, msg.orderId); filled.push('order_id') }
      await sleep(STEP_DELAY)
    }

    return { filled, missed }
  }

  // iframe: postMessage 수신 → 폼 채우기
  window.addEventListener('message', async (event) => {
    const data = event.data
    if (!data || data.key !== SENTINEL_MSG_KEY) return

    const msg = data.payload as BrReportMessage
    const start = Date.now()

    const { filled, missed } = await fillForm(msg)

    const requiredMissed = missed.filter((f) => f === 'description' || f === 'urls')

    // dry-run 체크
    const storage = await chrome.storage.local.get(['br_dry_run'])
    const dryRun = (storage.br_dry_run as boolean) ?? false

    if (requiredMissed.length > 0) {
      // 결과를 메인 프레임으로 전달
      window.parent.postMessage({ key: SENTINEL_MSG_KEY + '_RESULT', success: false, filled, missed, reportId: msg.reportId, durationMs: Date.now() - start, error: `Required fields missed: ${requiredMissed.join(', ')}` }, '*')
      return
    }

    if (!dryRun) {
      const sendBtn = findSendButton()
      if (sendBtn) {
        await sleep(300)
        sendBtn.click()
      }
    }

    window.parent.postMessage({ key: SENTINEL_MSG_KEY + '_RESULT', success: true, filled, missed, reportId: msg.reportId, durationMs: Date.now() - start, dryRun }, '*')
  })

  // iframe: chrome.runtime.onMessage도 수신 (Service Worker에서 직접 올 때)
  chrome.runtime.onMessage.addListener(
    (message: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
      const msg = message as { type?: string }
      if (msg.type === 'EXECUTE_BR_REPORT') {
        // postMessage 경로와 동일하게 처리
        window.postMessage({ key: SENTINEL_MSG_KEY, payload: msg }, '*')
        sendResponse({ received: true })
      }
      return false
    },
  )

} else {

// ============================================================
// 메인 프레임 코드 — 메뉴 네비게이션 + iframe에 postMessage
// ============================================================

  const MENU_WAIT = 800
  const STEP_DELAY = 300

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

  const sendResult = (result: BrReportResultMessage): void => {
    chrome.runtime.sendMessage(result).catch(() => {})
  }

  const findTreeItem = (text: string): HTMLElement | null => {
    const items = document.querySelectorAll<HTMLElement>(TREE_ITEM_SELECTOR)
    for (const item of items) {
      if (item.textContent?.trim() === text) return item
    }
    return null
  }

  const expandParentMenu = async (): Promise<boolean> => {
    const targetItems = ['Other policy violations', 'Incorrect variation', 'Product review violation', 'Product not as described']
    if (targetItems.some((text) => findTreeItem(text) !== null)) return true

    // 상위 메뉴 클릭
    const items = document.querySelectorAll<HTMLElement>(TREE_ITEM_SELECTOR)
    for (const item of items) {
      if (item.textContent?.trim().includes('Report a store policy violation')) {
        item.click()
        await sleep(MENU_WAIT)
        return targetItems.some((text) => findTreeItem(text) !== null)
      }
    }

    // expander 노드 탐색
    const expanderNodes = document.querySelectorAll<HTMLElement>('[class*="cu-tree-browseTree-ctExpander"]')
    for (const node of expanderNodes) {
      if (node.textContent?.includes('Report a store policy violation')) {
        node.click()
        await sleep(MENU_WAIT)
        return targetItems.some((t) => findTreeItem(t) !== null)
      }
    }

    return false
  }

  const navigateToFormType = async (menuText: string): Promise<boolean> => {
    // 이미 활성 상태?
    const items = document.querySelectorAll<HTMLElement>(TREE_ITEM_SELECTOR)
    for (const item of items) {
      if (item.textContent?.trim() === menuText && item.classList.contains(TREE_ITEM_ACTIVE_CLASS)) return true
    }

    const expanded = await expandParentMenu()
    if (!expanded) return false

    const target = findTreeItem(menuText)
    if (!target) return false

    target.click()
    await sleep(MENU_WAIT)
    return true
  }

  // visible iframe 찾기 (contentWindow만 — cross-origin이므로 document 접근 안 함)
  const findFormIframe = (): HTMLIFrameElement | null => {
    const iframes = document.querySelectorAll<HTMLIFrameElement>(FORM_IFRAME_SELECTOR)
    for (const iframe of iframes) {
      const style = window.getComputedStyle(iframe)
      if (style.display === 'none' || iframe.offsetWidth === 0) continue
      return iframe
    }
    return null
  }

  const waitForFormIframe = async (timeoutMs: number = 10_000): Promise<HTMLIFrameElement | null> => {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const iframe = findFormIframe()
      if (iframe) return iframe
      await new Promise((r) => setTimeout(r, 300))
    }
    return null
  }

  // iframe 결과 대기
  const waitForIframeResult = (reportId: string, timeoutMs: number = 30_000): Promise<{ success: boolean; filled?: string[]; missed?: string[]; error?: string; dryRun?: boolean }> => {
    return new Promise((resolve) => {
      const handler = (event: MessageEvent): void => {
        const data = event.data
        if (!data || data.key !== SENTINEL_MSG_KEY + '_RESULT' || data.reportId !== reportId) return
        window.removeEventListener('message', handler)
        clearTimeout(timer)
        resolve(data)
      }
      window.addEventListener('message', handler)
      const timer = setTimeout(() => {
        window.removeEventListener('message', handler)
        resolve({ success: false, error: 'Iframe fill timeout' })
      }, timeoutMs)
    })
  }

  // 메인 실행
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
    await sleep(STEP_DELAY)

    // 3. iframe 찾기 (element만, document 접근 안 함)
    const iframe = await waitForFormIframe()
    if (!iframe || !iframe.contentWindow) {
      showToast('폼 iframe을 찾을 수 없습니다.', 'error')
      sendResult({ type: 'BR_REPORT_RESULT', reportId: msg.reportId, success: false, durationMs: elapsed(), error: 'Form iframe not found' })
      return
    }

    // 4. iframe 안에 content script 로드 대기
    await sleep(1500)

    // 5. postMessage로 iframe에 폼 데이터 전달
    iframe.contentWindow.postMessage({ key: SENTINEL_MSG_KEY, payload: msg }, '*')

    // 6. 결과 대기
    const result = await waitForIframeResult(msg.reportId)

    if (result.success) {
      const label = result.dryRun ? `폼 채우기 완료 (dry-run). Filled: ${(result.filled ?? []).join(', ')}` : 'BR 신고 제출 완료!'
      showToast(label, 'success')
    } else {
      showToast(result.error ?? '폼 채우기 실패', 'error')
    }

    sendResult({
      type: 'BR_REPORT_RESULT',
      reportId: msg.reportId,
      success: result.success,
      durationMs: elapsed(),
      error: result.error,
    })
  }

  // chrome.runtime 메시지 리스너 (Service Worker → 메인 프레임)
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

  // postMessage 결과 수신 (iframe → 메인 프레임) — waitForIframeResult에서 처리

  // --- 테스트 모드 ---
  // URL에 ?test=1 추가하면 자동 dry-run 테스트 실행
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

} // end main frame
