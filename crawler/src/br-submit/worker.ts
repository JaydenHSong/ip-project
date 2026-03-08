// BR (Brand Registry) Contact Support 폼 자동 제출 워커 — Playwright
// SC와 달리 persistent context 사용 (로그인 세션 유지, 브라우저 재사용)
import { chromium, type BrowserContext, type Page, type Frame } from 'playwright'
import type { Job } from 'bullmq'
import type { BrSubmitJobData, BrSubmitResult, BrFormType } from './types.js'
import { log } from '../logger.js'

const BR_URL = 'https://brandregistry.amazon.com/cu/contact-us?serviceId=SOA'
const USER_DATA_DIR = process.env['BR_USER_DATA_DIR'] || '/tmp/br-worker-data'
const MENU_CLICK_TIMEOUT = 5_000

// 메뉴 텍스트 매핑
const MENU_TEXT: Record<BrFormType, string> = {
  other_policy: 'Other policy violations',
  incorrect_variation: 'Incorrect variation',
  product_review: 'Product review violation',
  product_not_as_described: 'Product not as described',
}

const PARENT_MENU_TEXT = 'Report a store policy violation'

// ─── Persistent Browser Session ─────────────────────────────
// 브라우저를 한 번 열고 계속 재사용 (로그인 유지)
let browserContext: BrowserContext | null = null
let browserPage: Page | null = null

const ensureBrowser = async (): Promise<{ context: BrowserContext; page: Page }> => {
  if (browserContext && browserPage) {
    // 페이지가 닫혔는지 확인
    try {
      await browserPage.title()
      return { context: browserContext, page: browserPage }
    } catch {
      // 페이지 닫힘 — 재생성
      log('warn', 'br-worker', 'Page closed, recreating...')
    }
  }

  // Persistent context (세션 쿠키 유지)
  browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: process.env['BR_HEADLESS'] !== 'false',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })

  browserPage = browserContext.pages()[0] || await browserContext.newPage()
  log('info', 'br-worker', 'Browser launched with persistent context')

  return { context: browserContext, page: browserPage }
}

// ─── Login Check ─────────────────────────────────────────────
const ensureLoggedIn = async (page: Page): Promise<void> => {
  const url = page.url()

  // 이미 BR 페이지에 있으면 로그인 됨
  if (url.includes('brandregistry.amazon.com') && !url.includes('/ap/') && !url.includes('signin')) {
    return
  }

  // BR 페이지로 이동
  await page.goto(BR_URL, { waitUntil: 'networkidle', timeout: 30_000 })

  // 로그인 필요한지 체크
  if (page.url().includes('signin') || page.url().includes('/ap/')) {
    // 자동 로그인 시도 (환경변수가 있으면)
    const email = process.env['BR_EMAIL']
    const password = process.env['BR_PASSWORD']

    if (email && password) {
      await page.fill('#ap_email', email, { timeout: 10_000 }).catch(() => {})
      await page.click('#continue').catch(() => {})
      await page.fill('#ap_password', password, { timeout: 10_000 }).catch(() => {})
      await page.click('#signInSubmit').catch(() => {})

      // OTP 필요 시
      const otpInput = await page.waitForSelector('#auth-mfa-otpcode', { timeout: 5_000 }).catch(() => null)
      if (otpInput) {
        const secret = process.env['BR_OTP_SECRET']
        if (secret) {
          const { TOTP } = await import('otpauth')
          const totp = new TOTP({ secret, digits: 6, period: 30 })
          await otpInput.fill(totp.generate())
          await page.click('#auth-signin-button').catch(() => {})
        } else {
          // OTP 시크릿 없으면 수동 대기
          log('warn', 'br-worker', 'OTP required but BR_OTP_SECRET not set — waiting for manual input')
          await page.waitForURL((u) => !u.toString().includes('/ap/'), { timeout: 300_000 })
        }
      }

      await page.waitForURL((u) => u.toString().includes('brandregistry.amazon.com/cu/'), { timeout: 30_000 })
      log('info', 'br-worker', 'BR login successful')
    } else {
      // 환경변수 없으면 수동 로그인 대기
      log('warn', 'br-worker', 'BR login required — waiting for manual login (5min timeout)')
      await page.waitForURL((u) => !u.toString().includes('/ap/'), { timeout: 300_000 })
    }
  }
}

// ─── Menu Navigation ─────────────────────────────────────────
const navigateToFormType = async (page: Page, formType: BrFormType): Promise<void> => {
  const menuText = MENU_TEXT[formType]
  log('info', 'br-worker', `Navigating to menu: "${menuText}"`)

  // BR 페이지로 이동 (또는 이미 있으면 새로고침)
  if (!page.url().includes('brandregistry.amazon.com/cu/contact-us')) {
    await page.goto(BR_URL, { waitUntil: 'networkidle', timeout: 30_000 })
    await page.waitForTimeout(2000)
  }

  // 타겟 메뉴 아이템이 이미 보이는지 확인
  const target = page.getByText(menuText, { exact: true })
  if (await target.isVisible({ timeout: 2000 }).catch(() => false)) {
    await target.click()
    log('info', 'br-worker', `Menu clicked: "${menuText}"`)
    return
  }

  // 상위 메뉴 펼치기
  const parent = page.getByText(PARENT_MENU_TEXT, { exact: true })
  if (await parent.isVisible({ timeout: 2000 }).catch(() => false)) {
    await parent.click()
    log('info', 'br-worker', 'Parent menu expanded')
  } else {
    // fallback: evaluate
    await page.evaluate((text) => {
      const items = document.querySelectorAll('li[role="listitem"]')
      for (const el of Array.from(items)) {
        if (el.textContent?.trim() === text) {
          (el as HTMLElement).click()
          break
        }
      }
    }, PARENT_MENU_TEXT)
  }

  await page.waitForTimeout(2000)

  // 하위 메뉴 클릭
  const targetAfterExpand = page.getByText(menuText, { exact: true })
  if (await targetAfterExpand.isVisible({ timeout: MENU_CLICK_TIMEOUT }).catch(() => false)) {
    await targetAfterExpand.click()
    log('info', 'br-worker', `Menu clicked: "${menuText}"`)
  } else {
    // fallback: evaluate force click
    await page.evaluate((text) => {
      const items = document.querySelectorAll('li[role="listitem"]')
      for (const el of Array.from(items)) {
        if (el.textContent?.trim() === text) {
          (el as HTMLElement).click()
          break
        }
      }
    }, menuText)
    log('info', 'br-worker', `Menu force-clicked: "${menuText}"`)
  }
}

// ─── Find Form Frame ─────────────────────────────────────────
const findFormFrame = async (page: Page): Promise<Frame> => {
  // iframe 로드 대기
  await page.waitForTimeout(3000)

  for (const frame of page.frames()) {
    if (frame.url().includes('hill/website/form')) {
      return frame
    }
  }

  // 재시도
  await page.waitForTimeout(3000)
  for (const frame of page.frames()) {
    if (frame.url().includes('hill/website/form')) {
      return frame
    }
  }

  throw new Error('BR form frame not found')
}

// ─── KAT Component Fill Helper ───────────────────────────────
// KAT 웹 컴포넌트는 Shadow DOM 내부에 실제 input/textarea를 가짐
const fillKatInput = async (frame: Frame, index: number, value: string): Promise<void> => {
  await frame.evaluate(({ idx, val }) => {
    const inputs = document.querySelectorAll('kat-input[type="text"]')
    const el = inputs[idx]
    if (!el) return

    const shadow = el.shadowRoot
    if (shadow) {
      const inner = shadow.querySelector('input')
      if (inner) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
        if (setter) setter.call(inner, val)
        else inner.value = val
        inner.dispatchEvent(new Event('input', { bubbles: true }))
        inner.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
  }, { idx: index, val: value })
}

const fillKatTextarea = async (frame: Frame, index: number, value: string): Promise<void> => {
  await frame.evaluate(({ idx, val }) => {
    const textareas = document.querySelectorAll('kat-textarea')
    const el = textareas[idx]
    if (!el) return

    const shadow = el.shadowRoot
    if (shadow) {
      const inner = shadow.querySelector('textarea')
      if (inner) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
        if (setter) setter.call(inner, val)
        else inner.value = val
        inner.dispatchEvent(new Event('input', { bubbles: true }))
        inner.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
  }, { idx: index, val: value })
}

// ─── Fill Form ───────────────────────────────────────────────
const fillBrForm = async (frame: Frame, data: BrSubmitJobData): Promise<void> => {
  // KAT-INPUT 순서: [0]=Subject, [1]=Seller storefront, [2]=Policy URL, [3]=Email
  // KAT-TEXTAREA 순서: [0]=Description, [1]=Product URLs

  // Subject
  await fillKatInput(frame, 0, data.subject)
  log('info', 'br-worker', 'Filled: Subject')
  await delay(500)

  // Description
  await fillKatTextarea(frame, 0, data.description)
  log('info', 'br-worker', 'Filled: Description')
  await delay(500)

  // Product URLs
  if (data.productUrls.length > 0) {
    await fillKatTextarea(frame, 1, data.productUrls.join('\n'))
    log('info', 'br-worker', `Filled: Product URLs (${data.productUrls.length})`)
    await delay(500)
  }

  // Seller storefront URL (optional)
  if (data.sellerStorefrontUrl) {
    await fillKatInput(frame, 1, data.sellerStorefrontUrl)
    log('info', 'br-worker', 'Filled: Seller storefront URL')
    await delay(500)
  }

  // Policy URL (optional)
  if (data.policyUrl) {
    await fillKatInput(frame, 2, data.policyUrl)
    log('info', 'br-worker', 'Filled: Policy URL')
    await delay(500)
  }
}

// ─── Submit Form ─────────────────────────────────────────────
const submitBrForm = async (frame: Frame): Promise<string | null> => {
  // KAT-BUTTON Send 클릭
  const clicked = await frame.evaluate(() => {
    const btn = document.querySelector('kat-button')
    if (!btn) return false

    const shadow = btn.shadowRoot
    if (shadow) {
      const inner = shadow.querySelector('button')
      if (inner) {
        inner.click()
        return true
      }
    }
    // fallback: 직접 클릭
    (btn as HTMLElement).click()
    return true
  })

  if (!clicked) throw new Error('Send button not found')
  log('info', 'br-worker', 'Send button clicked')

  // 제출 후 확인 페이지 대기
  await delay(5000)

  // Case ID 추출 시도
  const caseId = await frame.evaluate(() => {
    // 확인 메시지에서 case ID 패턴 찾기
    const body = document.body?.textContent || ''
    const match = body.match(/case\s*(?:id|#|number)[:\s]*(\d{5,})/i)
    if (match) return match[1]

    // "Thank you" 확인 메시지 체크
    const thankYou = body.includes('Thank you') || body.includes('submitted')
    if (thankYou) return 'submitted'

    return null
  }).catch(() => null)

  return caseId
}

// ─── Delay Helper ────────────────────────────────────────────
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// ─── Main Job Processor ──────────────────────────────────────
const processBrSubmitJob = async (job: Job<BrSubmitJobData>): Promise<BrSubmitResult> => {
  const data = job.data
  log('info', 'br-worker', `Processing BR submit for report ${data.reportId} (type: ${data.formType})`)

  try {
    const { page } = await ensureBrowser()

    // 로그인 확인
    await ensureLoggedIn(page)

    // 메뉴 네비게이션
    await navigateToFormType(page, data.formType)

    // 폼 프레임 찾기
    const formFrame = await findFormFrame(page)
    log('info', 'br-worker', `Form frame found: ${formFrame.url().substring(0, 80)}`)

    // 폼 채우기
    await fillBrForm(formFrame, data)

    // 제출
    const caseId = await submitBrForm(formFrame)

    log('info', 'br-worker', `BR submit successful for report ${data.reportId}, case: ${caseId}`)

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
