// Background Tab Fetch — 전용 봇 윈도우 + 자연스러운 네비게이션

import { storage } from '@shared/storage'
import { MARKETPLACE_MAP } from '@shared/constants'
import { fetchPendingQueue, submitFetchResult } from './api'

// Marketplace → Amazon domain
const MARKETPLACE_DOMAINS: Record<string, string> = Object.fromEntries(
  Object.entries(MARKETPLACE_MAP).map(([domain, code]) => [code, domain]),
)

const setBadge = (text: string, color: string): void => {
  chrome.action.setBadgeText({ text })
  chrome.action.setBadgeBackgroundColor({ color })
}

const clearBadge = (): void => {
  chrome.action.setBadgeText({ text: '' })
}

const resetStatus = async (): Promise<void> => {
  await storage.set('bgfetch.status', {
    active: false,
    asin: null,
    marketplace: null,
    queueId: null,
  })
}

// ── 간소화 페르소나 ──

type BgFetchPersona = {
  searchDwellMs: number
  productDwellMs: number
}

const generateBgPersona = (): BgFetchPersona => ({
  searchDwellMs: 1500 + Math.random() * 2500,
  productDwellMs: 2000 + Math.random() * 2000,
})

// ── 봇 윈도우 관리 ──

const getBotWindow = async (): Promise<number | null> => {
  const windowId = await storage.get('bgfetch.windowId')
  if (!windowId) return null

  try {
    await chrome.windows.get(windowId)
    return windowId
  } catch {
    // 윈도우가 닫혔음 — storage 정리
    await storage.remove('bgfetch.windowId')
    return null
  }
}

const ensureBotWindow = async (): Promise<{ windowId: number; isNew: boolean }> => {
  const existing = await getBotWindow()
  if (existing !== null) {
    return { windowId: existing, isNew: false }
  }

  const win = await chrome.windows.create({
    url: chrome.runtime.getURL('bot-status.html'),
    type: 'normal',
    width: 500,
    height: 400,
    focused: true,
  })

  if (!win.id) throw new Error('Failed to create bot window')
  await storage.set('bgfetch.windowId', win.id)
  return { windowId: win.id, isNew: true }
}

// ── 봇 윈도우 전용 스크린샷 ──

const captureInBotWindow = async (tabId: number, windowId: number): Promise<string> => {
  // 최소화 해제
  await chrome.windows.update(windowId, { state: 'normal' })
  // 탭 활성화
  await chrome.tabs.update(tabId, { active: true })
  // 렌더링 대기
  await new Promise((r) => setTimeout(r, 300))

  let quality = 85
  let dataUrl = ''

  while (quality >= 20) {
    dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: 'jpeg',
      quality,
    })

    const base64Part = dataUrl.split(',')[1] ?? ''
    const estimatedBytes = Math.ceil(base64Part.length * 0.75)
    if (estimatedBytes <= 2 * 1024 * 1024) break
    quality -= 15
  }

  // 다시 최소화
  await chrome.windows.update(windowId, { state: 'minimized' })
  return dataUrl
}

// ── 상태 메시지 전송 ──

type BotStep = 'searching' | 'browsing' | 'capturing' | 'done'

const sendStatus = (
  statusTabId: number,
  step: BotStep,
  item: { asin: string; marketplace: string },
): void => {
  chrome.tabs.sendMessage(statusTabId, {
    type: 'BOT_STATUS_UPDATE',
    step,
    asin: item.asin,
    marketplace: item.marketplace,
  }).catch(() => { /* 안내 탭이 닫혔을 수 있음 */ })
}

// ── Content script 대신 직접 주입하는 파서 함수 ──

const PARSE_FUNCTION = (): Record<string, unknown> | null => {
  const trySelectors = <T>(selectors: (() => T | null | undefined)[]): T | null => {
    for (const s of selectors) {
      try {
        const r = s()
        if (r !== null && r !== undefined && r !== '') return r
      } catch { /* skip */ }
    }
    return null
  }

  const asin = trySelectors([
    () => document.querySelector<HTMLInputElement>('input[name="ASIN"]')?.value,
    () => window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/i)?.[1]?.toUpperCase(),
    () => window.location.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i)?.[1]?.toUpperCase(),
    () => document.querySelector('[data-asin]')?.getAttribute('data-asin'),
  ])
  if (!asin) return null

  const getPrice = (): { amount: number | null; currency: string } => {
    const raw = trySelectors([
      () => document.querySelector('.a-price .a-offscreen')?.textContent?.trim(),
      () => document.querySelector('#priceblock_ourprice')?.textContent?.trim(),
    ])
    if (!raw) return { amount: null, currency: 'USD' }
    const cleaned = raw.replace(/[^\d.,]/g, '')
    const amount = parseFloat(cleaned.replace(/,/g, ''))
    const currency = raw.startsWith('$') ? 'USD' : raw.startsWith('£') ? 'GBP' : raw.includes('€') ? 'EUR' : 'USD'
    return { amount: isNaN(amount) ? null : amount, currency }
  }

  const { amount, currency } = getPrice()

  return {
    asin,
    title: trySelectors([
      () => document.querySelector('#productTitle')?.textContent?.trim(),
      () => document.querySelector('#title span')?.textContent?.trim(),
    ]) ?? '',
    seller_name: trySelectors([
      () => document.querySelector('#sellerProfileTriggerId')?.textContent?.trim(),
      () => document.querySelector('#merchant-info a')?.textContent?.trim(),
    ]),
    seller_id: trySelectors([
      () => {
        const link = document.querySelector('#sellerProfileTriggerId')?.closest('a')
        return link?.getAttribute('href')?.match(/seller=([A-Z0-9]+)/)?.[1] ?? null
      },
    ]),
    price_amount: amount,
    price_currency: currency,
    images: (() => {
      const imgs = document.querySelectorAll('#altImages img, #imgTagWrapperId img')
      return Array.from(imgs)
        .map((img) => (img as HTMLImageElement).src)
        .filter((src) => src && !src.includes('sprite') && !src.includes('grey-pixel'))
        .map((src) => src.replace(/\._[^.]+\./, '.'))
    })(),
    bullet_points: (() => {
      const items = document.querySelectorAll('#feature-bullets li span.a-list-item')
      return Array.from(items)
        .map((el) => el.textContent?.trim())
        .filter((t): t is string => !!t && t.length > 1)
    })(),
    brand: trySelectors([
      () => document.querySelector('#bylineInfo')?.textContent?.replace(/^(Visit the |Brand: )/, '').trim(),
      () => document.querySelector('.po-brand .po-break-word')?.textContent?.trim(),
    ]),
    rating: trySelectors([
      () => {
        const text = document.querySelector('#acrPopover .a-icon-alt')?.textContent
        const match = text?.match(/([\d.]+)\s+out of/)
        return match ? parseFloat(match[1]) : null
      },
    ]),
    review_count: trySelectors([
      () => {
        const text = document.querySelector('#acrCustomerReviewText')?.textContent
        const match = text?.match(/([\d,]+)/)
        return match ? parseInt(match[1].replace(/,/g, ''), 10) : null
      },
    ]),
    url: window.location.href,
    marketplace: (() => {
      const map: Record<string, string> = {
        'www.amazon.com': 'US', 'www.amazon.co.uk': 'UK', 'www.amazon.co.jp': 'JP',
        'www.amazon.de': 'DE', 'www.amazon.fr': 'FR', 'www.amazon.it': 'IT',
        'www.amazon.es': 'ES', 'www.amazon.ca': 'CA',
      }
      return map[window.location.hostname] ?? 'US'
    })(),
  }
}

// ── 탭 로딩 완료 대기 ──

const waitForTabLoad = (tabId: number, timeoutMs: number = 30_000): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener)
      reject(new Error('Tab loading timeout'))
    }, timeoutMs)

    const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener)
        clearTimeout(timeout)
        resolve()
      }
    }

    chrome.tabs.onUpdated.addListener(listener)
  })

// ── executeFetch (봇 윈도우 + 2단계 네비게이션) ──

const executeFetch = async (
  item: { id: string; asin: string; marketplace: string },
  botWindowId: number,
  statusTabId: number,
): Promise<{ pageData: Record<string, unknown>; screenshotBase64?: string }> => {
  const domain = MARKETPLACE_DOMAINS[item.marketplace] ?? 'www.amazon.com'
  const persona = generateBgPersona()

  // Step 1: 검색 페이지 (봇 윈도우 안에서)
  const searchUrl = `https://${domain}/s?k=${item.asin}`
  const newTab = await chrome.tabs.create({
    windowId: botWindowId,
    url: searchUrl,
    active: true,
  })
  if (!newTab.id) throw new Error('Failed to create tab')

  const tabId = newTab.id

  await waitForTabLoad(tabId)
  sendStatus(statusTabId, 'searching', item)
  await new Promise((r) => setTimeout(r, persona.searchDwellMs))

  // Step 2: 상품 페이지로 내부 이동
  const productUrl = `https://${domain}/dp/${item.asin}`
  await chrome.tabs.update(tabId, { url: productUrl })

  await waitForTabLoad(tabId)
  sendStatus(statusTabId, 'browsing', item)
  await new Promise((r) => setTimeout(r, persona.productDwellMs))

  // Step 3: 파싱
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: PARSE_FUNCTION,
  })

  const pageData = result?.result as Record<string, unknown> | null
  if (!pageData) {
    await chrome.tabs.remove(tabId)
    throw new Error('Failed to parse page')
  }

  // Step 4: 스크린샷
  let screenshotBase64: string | undefined
  try {
    sendStatus(statusTabId, 'capturing', item)
    screenshotBase64 = await captureInBotWindow(tabId, botWindowId)
  } catch {
    // Screenshot 실패는 non-fatal
  }

  // Step 5: 작업 탭만 닫기 (윈도우+안내탭 유지)
  await chrome.tabs.remove(tabId)
  sendStatus(statusTabId, 'done', item)

  return { pageData, screenshotBase64 }
}

// ── pollFetchQueue ──

export const pollFetchQueue = async (): Promise<void> => {
  // 1. 설정 확인
  const settings = await storage.get('bgfetch.settings')
  // 기본값: enabled (설정 안 건드린 경우 자동으로 켜짐)
  if (settings?.enabled === false) return

  // 2. 이미 진행 중이면 skip
  const status = await storage.get('bgfetch.status')
  if (status?.active) return

  // 3. 인증 확인 (access_token 존재 여부)
  const token = await storage.get('auth.access_token')
  if (!token) return

  // 4. Pending 큐 조회
  let queueItem: { id: string; asin: string; marketplace: string } | null = null
  try {
    const response = await fetchPendingQueue()
    queueItem = response.item
  } catch {
    return // 인증 만료 등
  }

  if (!queueItem) return

  // 5. 상태 업데이트 + badge
  setBadge('\u21BB', '#3B82F6') // ↻ 파란색
  await storage.set('bgfetch.status', {
    active: true,
    asin: queueItem.asin,
    marketplace: queueItem.marketplace,
    queueId: queueItem.id,
  })

  try {
    // 6. 봇 윈도우 확보
    const { windowId, isNew } = await ensureBotWindow()

    // 첫 실행이면 바로 최소화 + 짧은 대기
    if (isNew) {
      await chrome.windows.update(windowId, { state: 'minimized' })
      await new Promise((r) => setTimeout(r, 1500))
    }

    // 안내 탭 (봇 윈도우의 첫 번째 탭) 찾기
    const tabs = await chrome.tabs.query({ windowId })
    const statusTabId = tabs[0]?.id
    if (!statusTabId) throw new Error('Bot window has no tabs')

    // 7. Background tab fetch
    const { pageData, screenshotBase64 } = await executeFetch(queueItem, windowId, statusTabId)

    // 8. 결과 전송
    await submitFetchResult(queueItem.id, pageData, screenshotBase64)

    // 9. 성공 badge
    setBadge('\u2713', '#22C55E') // ✓ 초록
    setTimeout(clearBadge, 5000)
  } catch {
    // 실패 badge
    setBadge('!', '#EF4444')
    setTimeout(clearBadge, 5000)
  } finally {
    await resetStatus()
  }
}
