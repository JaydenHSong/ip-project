// BR (Brand Registry) Contact Support 폼 자동 제출 워커 — Playwright
// persistent context 사용 (로그인 세션 유지, 브라우저 재사용)
//
// DOM 구조 (2026-03 확인):
//   메인 프레임
//     └─ spl-hill-form (custom element) → shadowRoot (open)
//         └─ iframe.spl-element-frame (same-origin: brandregistry.amazon.com/hill/website/form/...)
//             └─ kat-label → kat-textarea/kat-input (custom element) → shadowRoot → textarea/input
//
// 필드 찾기: kat-label 텍스트 기반 (인덱스 아님, 폼 타입별 필드 순서가 다름)

import { chromium, type BrowserContext, type Page, type Frame } from 'playwright'
import { getRandomUA } from '../br-auth/ua-pool.js'
import { ensureLoggedIn as sharedEnsureLoggedIn } from '../br-auth/login.js'
import { SessionManager } from '../br-auth/session-manager.js'
import type { Job } from 'bullmq'
import type { BrSubmitJobData, BrSubmitResult, BrFormType } from './types.js'
import { BR_FORM_CONFIG, PARENT_MENU_TEXT } from './form-config.js'
import { log } from '../logger.js'

const BR_URL = 'https://brandregistry.amazon.com/cu/contact-us?serviceId=SOA'
const USER_DATA_DIR = process.env['BR_USER_DATA_DIR'] || '/tmp/br-worker-data'

// ─── Persistent Browser Session ─────────────────────────────
let browserContext: BrowserContext | null = null
let browserPage: Page | null = null

const ensureBrowser = async (): Promise<{ context: BrowserContext; page: Page }> => {
  if (browserContext && browserPage) {
    try {
      await browserPage.title()
      return { context: browserContext, page: browserPage }
    } catch {
      log('warn', 'br-worker', 'Page closed, recreating...')
    }
  }

  browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: process.env['BR_HEADLESS'] !== 'false',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    viewport: { width: 1280, height: 720 },
    userAgent: getRandomUA().userAgent,
  })

  browserPage = browserContext.pages()[0] || await browserContext.newPage()
  log('info', 'br-worker', 'Browser launched with persistent context')

  return { context: browserContext, page: browserPage }
}

// ─── Login Check (shared module) ─────────────────────────────
const submitSessionManager = new SessionManager('submit')
let submitNotifyFn: ((msg: string) => Promise<void>) | undefined

export const setSubmitNotifier = (fn: (msg: string) => Promise<void>): void => {
  submitNotifyFn = fn
}

const ensureLoggedIn = async (page: Page): Promise<void> => {
  const result = await sharedEnsureLoggedIn(page, 'br-worker', submitSessionManager, submitNotifyFn)
  if (!result.success) {
    throw new Error(`Login failed: ${result.reason} — ${result.detail}`)
  }

  // 로그인 후 contact-us 페이지로 이동 확인
  if (!page.url().includes('/cu/contact-us')) {
    log('info', 'br-worker', 'Navigating to contact-us page...')
    await page.goto(BR_URL, { waitUntil: 'networkidle', timeout: 30_000 })
    await page.waitForTimeout(3000)
    log('info', 'br-worker', `Now on: ${page.url()}`)
  }
}

export { submitSessionManager }

// ─── Menu Navigation (Playwright 물리 클릭 사용) ─────────────
const navigateToFormType = async (page: Page, formType: BrFormType): Promise<void> => {
  const menuText = BR_FORM_CONFIG[formType].menuText
  log('info', 'br-worker', `Navigating to menu: "${menuText}"`)

  // contact-us 페이지가 아니면 이동
  if (!page.url().includes('brandregistry.amazon.com/cu/contact-us')) {
    await page.goto(BR_URL, { waitUntil: 'networkidle', timeout: 30_000 })
  }

  // 메뉴 렌더링 대기 — kat-expander가 나타날 때까지 (최대 10초)
  await page.waitForSelector('kat-expander', { timeout: 10_000 }).catch(() => {
    log('warn', 'br-worker', 'kat-expander not found after 10s, proceeding anyway...')
  })
  await page.waitForTimeout(2000)

  log('info', 'br-worker', `Current URL: ${page.url()}`)

  // 1. 타겟 메뉴 아이템이 이미 보이면 바로 클릭
  const targetSelector = `li.cu-tree-browseTree-ctExpander-type`
  const targetItem = page.locator(targetSelector).filter({ hasText: menuText })
  if (await targetItem.isVisible({ timeout: 2000 }).catch(() => false)) {
    log('info', 'br-worker', `Target menu already visible, clicking...`)
    await targetItem.click({ force: true })
    await page.waitForTimeout(2000)
    return
  }

  log('info', 'br-worker', `Target menu not visible, expanding parent...`)

  // 2. 상위 메뉴 펼치기 — Playwright의 물리 클릭 사용
  //    kat-expander shadowRoot 안의 button.header를 클릭해야 함
  //    Playwright locator('pierce/...') 또는 evaluate로 좌표 가져와서 page.click
  const parentRect = await page.evaluate((parentText) => {
    const expanders = Array.from(document.querySelectorAll('kat-expander.cu-tree-browseTree-ctExpander-category'))
    for (const expander of expanders) {
      if (expander.textContent?.includes(parentText)) {
        const headerBtn = expander.shadowRoot?.querySelector('button.header') as HTMLElement | null
        if (headerBtn) {
          const rect = headerBtn.getBoundingClientRect()
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
        }
        // fallback: expander 자체 좌표
        const rect = (expander as HTMLElement).getBoundingClientRect()
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
      }
    }
    return null
  }, PARENT_MENU_TEXT)

  if (parentRect) {
    log('info', 'br-worker', `Parent menu found at (${parentRect.x}, ${parentRect.y}), clicking...`)
    await page.mouse.click(parentRect.x, parentRect.y)
    await page.waitForTimeout(2000)
  } else {
    // fallback: 텍스트 기반 클릭
    log('info', 'br-worker', `Parent menu not found via shadow DOM, trying text match...`)
    const parentByText = page.getByText(PARENT_MENU_TEXT)
    if (await parentByText.isVisible({ timeout: 3000 }).catch(() => false)) {
      await parentByText.click()
      await page.waitForTimeout(2000)
    } else {
      log('error', 'br-worker', 'Parent menu not found at all')
      // 디버깅: 페이지에 있는 메뉴 아이템 목록 출력
      const menuItems = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('li'))
        return items.slice(0, 20).map(li => li.textContent?.trim().substring(0, 60))
      })
      log('error', 'br-worker', `Available menu items: ${JSON.stringify(menuItems)}`)
      throw new Error(`Parent menu "${PARENT_MENU_TEXT}" not found`)
    }
  }

  // 3. 하위 메뉴 클릭 — 물리 클릭
  const targetAfterExpand = page.locator(targetSelector).filter({ hasText: menuText })
  if (await targetAfterExpand.isVisible({ timeout: 5000 }).catch(() => false)) {
    log('info', 'br-worker', `Sub-menu visible, clicking "${menuText}"...`)
    await targetAfterExpand.click({ force: true })
    await page.waitForTimeout(2000)
  } else {
    // 디버깅: 펼쳐진 하위 메뉴 아이템 목록 출력
    const subItems = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('li.cu-tree-browseTree-ctExpander-type'))
      return items.map(li => li.textContent?.trim())
    })
    log('error', 'br-worker', `Available sub-menu items: ${JSON.stringify(subItems)}`)
    throw new Error(`Menu item not found: "${menuText}"`)
  }

  log('info', 'br-worker', `Menu navigation complete: "${menuText}"`)
}

// ─── Find Form Frame ─────────────────────────────────────────
// spl-hill-form → shadowRoot → iframe.spl-element-frame
const findFormFrame = async (page: Page): Promise<Frame> => {
  // Playwright page.frames()에는 shadow DOM 안의 iframe도 포함
  for (let attempt = 0; attempt < 10; attempt++) {
    for (const frame of page.frames()) {
      if (frame.url().includes('hill/website/form')) {
        // kat-textarea가 있는지 확인 (폼 로드 완료)
        const count = await frame.evaluate(() =>
          document.querySelectorAll('kat-textarea').length
        ).catch(() => 0)
        if (count > 0) return frame
      }
    }
    await page.waitForTimeout(1500)
  }

  throw new Error('BR form frame not found (15s timeout)')
}

// ─── Label-based Field Finder ────────────────────────────────
// kat-label 텍스트 → 다음 형제 kat-textarea/kat-input → shadowRoot → native element
const fillFieldByLabel = async (
  frame: Frame,
  labelPrefix: string,
  tagName: 'kat-textarea' | 'kat-input',
  value: string,
): Promise<boolean> => {
  return frame.evaluate(
    ([lp, tn, val]: [string, string, string]) => {
      const labels = Array.from(document.querySelectorAll('kat-label'))
      for (const label of labels) {
        const text = label.textContent?.trim() ?? ''
        if (!text.startsWith(lp)) continue

        let sibling = label.nextElementSibling
        while (sibling) {
          if (sibling.tagName.toLowerCase() === tn && sibling.shadowRoot) {
            const native = sibling.shadowRoot.querySelector('textarea, input') as HTMLInputElement | HTMLTextAreaElement | null
            if (!native) return false
            const proto = native instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
            if (setter) setter.call(native, val)
            else native.value = val
            native.dispatchEvent(new Event('input', { bubbles: true }))
            native.dispatchEvent(new Event('change', { bubbles: true }))
            return true
          }
          const nested = sibling.querySelector(tn)
          if (nested?.shadowRoot) {
            const native = nested.shadowRoot.querySelector('textarea, input') as HTMLInputElement | HTMLTextAreaElement | null
            if (!native) return false
            const proto = native instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
            if (setter) setter.call(native, val)
            else native.value = val
            native.dispatchEvent(new Event('input', { bubbles: true }))
            native.dispatchEvent(new Event('change', { bubbles: true }))
            return true
          }
          sibling = sibling.nextElementSibling
        }

        const container = label.closest('div')
        if (container) {
          const field = container.querySelector(tn)
          if (field?.shadowRoot) {
            const native = field.shadowRoot.querySelector('textarea, input') as HTMLInputElement | HTMLTextAreaElement | null
            if (!native) return false
            const proto = native instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
            if (setter) setter.call(native, val)
            else native.value = val
            native.dispatchEvent(new Event('input', { bubbles: true }))
            native.dispatchEvent(new Event('change', { bubbles: true }))
            return true
          }
        }
      }
      return false
    },
    [labelPrefix, tagName, value] as [string, string, string],
  )
}

// ─── Fill Form (label-based) ─────────────────────────────────
const fillBrForm = async (frame: Frame, data: BrSubmitJobData): Promise<{ filled: string[]; missed: string[] }> => {
  const filled: string[] = []
  const missed: string[] = []

  // 데이터 키 → 값 매핑
  const dataMap: Record<string, string | undefined> = {
    subject: data.subject,
    description: data.description,
    urls: data.productUrls.length > 0 ? data.productUrls.join('\n') : undefined,
    storefront_url: data.sellerStorefrontUrl,
    policy_url: data.policyUrl,
    asins: data.asins && data.asins.length > 0 ? data.asins.join(', ') : undefined,
    review_urls: data.reviewUrls && data.reviewUrls.length > 0
      ? data.reviewUrls.join('\n')
      : data.productUrls.length > 0 ? data.productUrls.join('\n') : undefined,
    order_id: data.orderId,
  }

  const formConfig = BR_FORM_CONFIG[data.formType]

  for (const field of formConfig.fields) {
    const value = dataMap[field.key]
    if (!value) {
      if (field.required) missed.push(field.key)
      continue
    }

    let success = false

    // 1차: Playwright locator.fill() — kat-textarea/kat-input의 내부 상태도 업데이트
    try {
      const katEl = field.element === 'kat-textarea' ? 'kat-textarea' : 'kat-input'
      // kat-label 텍스트로 필드를 찾고, 그 안의 shadow DOM textarea/input에 fill
      const labelLocator = frame.locator(`kat-label:has-text("${field.labelPrefix}")`)
      // label 다음 형제 kat-textarea/kat-input 찾기
      const fieldLocator = labelLocator.locator(`xpath=following-sibling::${katEl} | following-sibling::*/${katEl}`).first()
      // shadow DOM 안의 native textarea/input
      const nativeTag = field.element === 'kat-textarea' ? 'textarea' : 'input'
      const nativeLocator = fieldLocator.locator(nativeTag).first()

      if (await nativeLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nativeLocator.fill(value, { timeout: 3000 })
        success = true
        log('info', 'br-worker', `${field.key}: OK (Playwright fill)`)
      }
    } catch {
      // Playwright fill 실패 → evaluate fallback
    }

    // 2차: evaluate fallback (기존 방식)
    if (!success) {
      if (await fillFieldByLabel(frame, field.labelPrefix, field.element, value)) {
        success = true
        log('info', 'br-worker', `${field.key}: OK (evaluate)`)
      }
    }

    if (success) {
      filled.push(field.key)
    } else {
      if (field.required) missed.push(field.key)
      log('info', 'br-worker', `${field.key}: MISSED`)
    }
    await delay(500)
  }

  return { filled, missed }
}

// ─── Submit Form ─────────────────────────────────────────────
// ★ Playwright locator.click() = 자동 scrollIntoView + 좌표변환 + 물리클릭
//   수동 좌표 계산은 iframe+shadow DOM에서 부정확 → locator 최우선
const submitBrForm = async (frame: Frame, page: Page): Promise<string | null> => {
  let clicked = false

  // 1차: Playwright locator — form frame에서 직접 (최우선, 자동 물리클릭)
  const selectors = [
    'kat-button[label="Send"]',
    'kat-button[label="Submit"]',
    'button:has-text("Send")',
    'button:has-text("Submit")',
  ]
  for (const sel of selectors) {
    const locator = frame.locator(sel).first()
    if (await locator.isVisible({ timeout: 2000 }).catch(() => false)) {
      log('info', 'br-worker', `Send button found via frame.locator("${sel}"), clicking...`)
      await locator.click({ timeout: 5000 })
      clicked = true
      break
    }
  }

  if (!clicked) {
    // 2차: 모든 frame에서 locator 시도
    log('info', 'br-worker', 'Not in form frame, trying all frames...')
    for (const f of page.frames()) {
      if (f === frame) continue
      for (const sel of selectors) {
        const locator = f.locator(sel).first()
        if (await locator.isVisible({ timeout: 1500 }).catch(() => false)) {
          log('info', 'br-worker', `Send in other frame via "${sel}"`)
          await locator.click({ timeout: 5000 })
          clicked = true
          break
        }
      }
      if (clicked) break
    }
  }

  if (!clicked) {
    // 3차: page.getByRole (shadow DOM 관통)
    log('info', 'br-worker', 'Trying page.getByRole...')
    const sendByRole = page.getByRole('button', { name: /send/i })
    if (await sendByRole.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sendByRole.click({ timeout: 5000 })
      clicked = true
      log('info', 'br-worker', 'Send clicked via getByRole')
    }
  }

  if (!clicked) {
    // 4차: 좌표 기반 fallback (최후의 수단)
    log('info', 'br-worker', 'Locators failed, coordinate fallback...')
    const scrollAndGetSendButtonRect = () => {
    // kat-button 찾기 (label attr 또는 textContent)
    const btns = Array.from(document.querySelectorAll('kat-button'))
    for (const btn of btns) {
      const label = btn.getAttribute('label')?.trim() ?? ''
      const text = btn.textContent?.trim() ?? ''
      const innerText = (btn as HTMLElement).innerText?.trim() ?? ''
      if (/^send$/i.test(label) || /^send$/i.test(text) || /^send$/i.test(innerText) ||
          /^submit$/i.test(label) || /^submit$/i.test(text) || /^submit$/i.test(innerText)) {
        // 화면 안으로 스크롤
        ;(btn as HTMLElement).scrollIntoView({ block: 'center', behavior: 'instant' })
        const shadowBtn = btn.shadowRoot?.querySelector('button') as HTMLElement | null
        const target = shadowBtn || btn as HTMLElement
        const rect = target.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, found: 'kat-button', label, text }
        }
      }
    }
    // regular button 찾기
    const regBtns = Array.from(document.querySelectorAll('button, input[type="submit"]'))
    for (const btn of regBtns) {
      const text = btn.textContent?.trim() || (btn as HTMLInputElement).value?.trim() || ''
      if (/^send$/i.test(text) || /^submit$/i.test(text)) {
        ;(btn as HTMLElement).scrollIntoView({ block: 'center', behavior: 'instant' })
        const rect = (btn as HTMLElement).getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, found: 'button', label: null, text }
        }
      }
    }
    return null
  }

    const btnRect = await frame.evaluate(scrollAndGetSendButtonRect)
    if (btnRect) {
      await delay(300)
      const frameElement = await frame.frameElement()
      const frameBox = await frameElement?.boundingBox()
      if (frameBox) {
        const px = frameBox.x + btnRect.x
        const py = frameBox.y + btnRect.y
        log('info', 'br-worker', `Coordinate click at (${px}, ${py})`)
        await page.mouse.click(px, py)
        clicked = true
      }
    }
  }

  if (!clicked) {
    // 디버그: 모든 버튼 정보 출력
    const debugIframe = await frame.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, kat-button, input[type="submit"], [role="button"]'))
      return all.map(b => ({ tag: b.tagName, label: b.getAttribute('label'), text: (b.textContent ?? '').trim().substring(0, 40), variant: b.getAttribute('variant') }))
    })
    log('error', 'br-worker', `[iframe] buttons: ${JSON.stringify(debugIframe)}`)
    throw new Error('Send button not found — check debug logs')
  }
  log('info', 'br-worker', 'Send button clicked')

  // ★ 디버그: 클릭 전 필드 상태 확인 (값이 실제로 들어갔는지)
  const fieldState = await frame.evaluate(() => {
    const textareas = Array.from(document.querySelectorAll('kat-textarea'))
    return textareas.map(t => {
      const native = t.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement | null
      const label = t.closest('div')?.querySelector('kat-label')?.textContent?.trim().substring(0, 30) ?? '?'
      return {
        label,
        nativeValue: native?.value?.substring(0, 50) ?? 'null',
        katValue: t.getAttribute('value')?.substring(0, 50) ?? 'null',
      }
    })
  }).catch(() => [])
  log('info', 'br-worker', `Field state after fill: ${JSON.stringify(fieldState)}`)

  await delay(5000)

  // ★ 디버그: 클릭 후 상태 확인
  const urlAfterClick = frame.url()
  log('info', 'br-worker', `Frame URL after Send: ${urlAfterClick}`)

  // 에러 메시지 확인
  const errorMsgs = await frame.evaluate(() => {
    // kat-alert, kat-error, 빨간 텍스트, validation 메시지 등
    const selectors = ['kat-alert', '.error', '[class*="error"]', '[class*="validation"]', '[role="alert"]']
    const found: string[] = []
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel)
      els.forEach(el => {
        const text = el.textContent?.trim()
        if (text) found.push(`[${sel}] ${text.substring(0, 80)}`)
      })
    }
    return found
  }).catch(() => [])
  if (errorMsgs.length > 0) {
    log('warn', 'br-worker', `Errors after Send: ${JSON.stringify(errorMsgs)}`)
  }

  const pageUrlAfter = page.url()
  log('info', 'br-worker', `Page URL after Send: ${pageUrlAfter}`)

  // 1차: URL에서 caseID 파라미터 추출 (가장 확실)
  // 성공 시 URL: ...view-case?...&caseID=19650956461&successMessage=caseCreated
  const urlMatch = pageUrlAfter.match(/caseID=(\d+)/)
  if (urlMatch) {
    log('info', 'br-worker', `Case ID from URL: ${urlMatch[1]}`)
    return urlMatch[1]
  }

  // 2차: 프레임 텍스트에서 추출
  const caseIdFromFrame = await frame.evaluate(() => {
    const body = document.body?.textContent || ''
    const match = body.match(/case\s*(?:id|#|number)[:\s]*(\d{5,})/i)
    return match ? match[1] : null
  }).catch(() => null)

  if (caseIdFromFrame) {
    log('info', 'br-worker', `Case ID from frame: ${caseIdFromFrame}`)
    return caseIdFromFrame
  }

  // 3차: 대시보드 페이지에서 추출
  log('info', 'br-worker', 'Case ID not found in URL/frame, checking dashboard...')
  const caseIdFromDashboard = await extractCaseIdFromDashboard(page)

  if (caseIdFromDashboard) {
    log('info', 'br-worker', `Case ID from dashboard: ${caseIdFromDashboard}`)
  } else {
    log('warn', 'br-worker', 'Could not extract case ID from dashboard')
  }

  return caseIdFromDashboard
}

// ─── Case Dashboard에서 최신 케이스 ID 추출 ────────────────────
const CASE_DASHBOARD_URL = 'https://brandregistry.amazon.com/cu/case-dashboard'

const extractCaseIdFromDashboard = async (page: Page): Promise<string | null> => {
  try {
    await page.goto(CASE_DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 30_000 })
    await delay(3000)

    // 테이블 첫 번째 행에서 케이스 ID 추출
    // 대시보드 구조: 테이블 행 → 첫 번째 열 = Case ID (숫자)
    const caseId = await page.evaluate(() => {
      // Method 1: 테이블 행에서 추출
      const rows = document.querySelectorAll('table tbody tr, tr[data-row-key]')
      for (const row of Array.from(rows)) {
        const firstCell = row.querySelector('td')
        const text = firstCell?.textContent?.trim()
        if (text && /^\d{5,}$/.test(text)) {
          return text
        }
      }

      // Method 2: 링크에서 caseID 파라미터 추출
      const viewLinks = document.querySelectorAll('a[href*="caseID"], a[href*="view-case"]')
      for (const link of Array.from(viewLinks)) {
        const href = link.getAttribute('href') || ''
        const match = href.match(/caseID=(\d+)/)
        if (match) return match[1]
      }

      // Method 3: 페이지 텍스트에서 첫 번째 긴 숫자 (케이스 ID 패턴)
      const allCells = document.querySelectorAll('td, div[class*="case"], span[class*="case"]')
      for (const cell of Array.from(allCells)) {
        const text = cell.textContent?.trim()
        if (text && /^\d{10,}$/.test(text)) {
          return text
        }
      }

      return null
    })

    return caseId
  } catch (error) {
    log('warn', 'br-worker', `Dashboard case ID extraction failed: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

// ─── Delay Helper ────────────────────────────────────────────
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
const randomDelay = (): Promise<void> => delay(2000 + Math.random() * 1500) // 2~3.5초 랜덤 (봇 감지 회피)

// ─── Main Job Processor ──────────────────────────────────────
const processBrSubmitJob = async (job: Job<BrSubmitJobData>, sentinelClient?: { verifyReportExists: (id: string) => Promise<boolean> }): Promise<BrSubmitResult> => {
  const data = job.data

  // 삭제된 리포트 체크
  if (sentinelClient) {
    const exists = await sentinelClient.verifyReportExists(data.reportId)
    if (!exists) {
      log('warn', 'br-worker', `Report ${data.reportId} no longer exists, skipping BR submit`)
      return { reportId: data.reportId, success: false, brCaseId: null, error: 'REPORT_DELETED' }
    }
  }

  log('info', 'br-worker', `Processing BR submit for report ${data.reportId} (type: ${data.formType})`)

  try {
    const { page } = await ensureBrowser()

    await ensureLoggedIn(page)
    await navigateToFormType(page, data.formType)

    const formFrame = await findFormFrame(page)
    log('info', 'br-worker', `Form frame found: ${formFrame.url().substring(0, 80)}`)

    const { filled, missed } = await fillBrForm(formFrame, data)

    // 필수 필드 누락 체크 (폼 설정의 required 플래그 기준)
    const requiredKeys = BR_FORM_CONFIG[data.formType].fields
      .filter((field) => field.required)
      .map((field) => field.key)
    const requiredMissed = missed.filter((f) => requiredKeys.includes(f))
    if (requiredMissed.length > 0) {
      throw new Error(`Required fields missed: ${requiredMissed.join(', ')}`)
    }

    log('info', 'br-worker', `Form filled — OK: [${filled.join(', ')}], Missed: [${missed.join(', ')}]`)

    // dry-run이면 제출 스킵
    if (data.dryRun) {
      log('info', 'br-worker', `DRY RUN — skipping submit for report ${data.reportId}`)
      return {
        reportId: data.reportId,
        success: true,
        brCaseId: null,
        error: null,
      }
    }

    // 제출
    const caseId = await submitBrForm(formFrame, page)

    log('info', 'br-worker', `BR submit successful for report ${data.reportId}, case: ${caseId}`)

    // 봇 감지 회피 — 다음 건 처리 전 랜덤 딜레이
    await randomDelay()

    return {
      reportId: data.reportId,
      success: true,
      brCaseId: caseId,
      error: null,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    log('error', 'br-worker', `BR submit failed for report ${data.reportId}: ${errorMsg}`)

    return {
      reportId: data.reportId,
      success: false,
      brCaseId: null,
      error: errorMsg,
    }
  }
}

// ─── Browser Cleanup ─────────────────────────────────────────
const closeBrBrowser = async (): Promise<void> => {
  if (browserContext) {
    await browserContext.close().catch(() => {})
    browserContext = null
    browserPage = null
    log('info', 'br-worker', 'Browser closed')
  }
}

export { processBrSubmitJob, closeBrBrowser }
