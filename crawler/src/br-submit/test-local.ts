// BR 로컬 테스트 — 3개 폼 타입 순차 테스트
// 사용법: npx tsx src/br-submit/test-local.ts

import { config } from 'dotenv'
config({ path: '../.env.local' })

import { chromium, type Page, type Frame } from 'playwright'

const BR_URL = 'https://brandregistry.amazon.com/cu/contact-us?serviceId=SOA'
const TIMEOUT = 60_000 // 1분 타임아웃
const USER_DATA_DIR = process.env['BR_USER_DATA_DIR'] || '/tmp/br-test-data'

const MENU_TEXT: Record<string, string> = {
  other_policy: 'Other policy violations',
  incorrect_variation: 'Incorrect variation',
  product_not_as_described: 'Product not as described',
  product_review: 'Product review violation',
}

const PARENT_MENU_TEXT = 'Report a store policy violation'

const DESC_LABEL: Record<string, string> = {
  other_policy: 'Describe which Amazon policy is being violated',
  incorrect_variation: 'Describe what makes the product an incorrect variation',
  product_not_as_described: 'Describe how the product received differs',
  product_review: 'Describe the review policy violation',
}

const p = (msg: string): void => console.log(`  ${msg}`)

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`TIMEOUT (${ms / 1000}s): ${label}`)), ms)),
  ])

// ─── 메뉴 네비게이션 (물리 클릭) ─────────────────────────────
const navigateToForm = async (page: Page, formType: string): Promise<void> => {
  const menuText = MENU_TEXT[formType]!

  if (!page.url().includes('brandregistry.amazon.com/cu/contact-us')) {
    await page.goto(BR_URL, { waitUntil: 'networkidle', timeout: 30_000 })
    await page.waitForTimeout(3000)
  }

  // 타겟 메뉴가 이미 보이면 바로 클릭
  const target = page.locator('li.cu-tree-browseTree-ctExpander-type').filter({ hasText: menuText })
  if (await target.isVisible({ timeout: 2000 }).catch(() => false)) {
    p(`메뉴 보임, 클릭: "${menuText}"`)
    await target.click({ force: true })
    await page.waitForTimeout(2000)
    return
  }

  // 상위 메뉴 펼치기 — 좌표 구해서 물리 클릭
  p(`상위 메뉴 펼치기: "${PARENT_MENU_TEXT}"`)
  const parentRect = await page.evaluate((parentText) => {
    const expanders = Array.from(document.querySelectorAll('kat-expander.cu-tree-browseTree-ctExpander-category'))
    for (const expander of expanders) {
      if (expander.textContent?.includes(parentText)) {
        const headerBtn = expander.shadowRoot?.querySelector('button.header') as HTMLElement | null
        if (headerBtn) {
          const rect = headerBtn.getBoundingClientRect()
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
        }
        const rect = (expander as HTMLElement).getBoundingClientRect()
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
      }
    }
    return null
  }, PARENT_MENU_TEXT)

  if (parentRect) {
    p(`상위 메뉴 좌표: (${Math.round(parentRect.x)}, ${Math.round(parentRect.y)})`)
    await page.mouse.click(parentRect.x, parentRect.y)
    await page.waitForTimeout(2000)
  } else {
    p('⚠️ 상위 메뉴를 찾지 못했습니다')
    // 디버깅: 페이지 메뉴 아이템 출력
    const items = await page.evaluate(() =>
      Array.from(document.querySelectorAll('kat-expander')).map(e => e.textContent?.trim().substring(0, 60))
    )
    p(`kat-expander 목록: ${JSON.stringify(items)}`)
    throw new Error('Parent menu not found')
  }

  // 하위 메뉴 클릭
  const targetAfter = page.locator('li.cu-tree-browseTree-ctExpander-type').filter({ hasText: menuText })
  if (await targetAfter.isVisible({ timeout: 5000 }).catch(() => false)) {
    p(`하위 메뉴 클릭: "${menuText}"`)
    await targetAfter.click({ force: true })
    await page.waitForTimeout(2000)
  } else {
    const subItems = await page.evaluate(() =>
      Array.from(document.querySelectorAll('li.cu-tree-browseTree-ctExpander-type')).map(li => li.textContent?.trim())
    )
    p(`하위 메뉴 목록: ${JSON.stringify(subItems)}`)
    throw new Error(`Menu item not found: "${menuText}"`)
  }
}

// ─── 폼 프레임 찾기 ──────────────────────────────────────────
const findFormFrame = async (page: Page): Promise<Frame> => {
  for (let i = 0; i < 20; i++) {
    const frames = page.frames()
    p(`프레임 수: ${frames.length} | URLs: ${frames.map(f => f.url().substring(0, 60)).join(', ')}`)

    for (const frame of frames) {
      if (frame.url().includes('hill/website/form')) {
        const count = await frame.evaluate(() => document.querySelectorAll('kat-textarea').length).catch(() => 0)
        p(`폼 프레임 발견! kat-textarea 수: ${count}`)
        if (count > 0) return frame
      }
    }
    await page.waitForTimeout(1500)
  }
  throw new Error('Form frame not found (30s)')
}

// ─── 폼 필드 디버깅 ─────────────────────────────────────────
const debugFormFields = async (frame: Frame): Promise<void> => {
  const info = await frame.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('kat-label'))
    const textareas = document.querySelectorAll('kat-textarea').length
    const inputs = document.querySelectorAll('kat-input').length
    return {
      labelTexts: labels.map(l => l.textContent?.trim().substring(0, 80)),
      textareaCount: textareas,
      inputCount: inputs,
    }
  })
  p(`kat-label 텍스트: ${JSON.stringify(info.labelTexts, null, 2)}`)
  p(`kat-textarea: ${info.textareaCount}개, kat-input: ${info.inputCount}개`)
}

// ─── 필드 채우기 ─────────────────────────────────────────────
const fillField = async (frame: Frame, labelPrefix: string, tagName: string, value: string): Promise<boolean> => {
  // frame.evaluate에 전달하는 함수는 브라우저에서 실행됨
  // tsx의 __name 헬퍼가 없으므로 내부 함수 선언 대신 인라인 처리
  const result = await frame.evaluate(
    ([lp, tn, val]: [string, string, string]) => {
      const labels = Array.from(document.querySelectorAll('kat-label'))
      for (const label of labels) {
        const text = label.textContent?.trim() ?? ''
        if (!text.startsWith(lp)) continue

        // 형제에서 찾기
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

        // 부모 div에서 찾기
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

  return result
}

// ─── 단일 폼 테스트 ─────────────────────────────────────────
const testFormType = async (page: Page, formType: string): Promise<void> => {
  console.log(`\n${'═'.repeat(50)}`)
  console.log(`📋 Testing: ${formType} (${MENU_TEXT[formType]})`)
  console.log('═'.repeat(50))

  // 1. 메뉴 네비게이션
  p('1단계: 메뉴 네비게이션...')
  await withTimeout(navigateToForm(page, formType), TIMEOUT, '메뉴 네비게이션')
  p('✅ 메뉴 선택 완료')

  // 2. 폼 프레임 찾기
  p('2단계: 폼 프레임 찾기...')
  const frame = await withTimeout(findFormFrame(page), TIMEOUT, '폼 프레임 찾기')
  p('✅ 폼 프레임 발견')

  // 3. 필드 디버깅 출력
  p('3단계: 필드 분석...')
  await debugFormFields(frame)

  // 4. 필드 채우기
  p('4단계: 필드 채우기...')

  const descLabel = DESC_LABEL[formType]!
  const descOk = await fillField(frame, descLabel, 'kat-textarea', `[TEST ${formType}] This is a test description.`)
  p(`Description: ${descOk ? '✅' : '❌'}`)

  const urlOk = await fillField(frame, 'Provide up to 10 URL(s)', 'kat-textarea', 'https://www.amazon.com/dp/B0TEST1234')
  p(`URLs: ${urlOk ? '✅' : '❌'}`)

  if (formType === 'other_policy' || formType === 'product_not_as_described') {
    const sfOk = await fillField(frame, 'Provide the seller storefront URL', 'kat-input', 'https://www.amazon.com/sp?seller=A1TEST')
    p(`Storefront URL: ${sfOk ? '✅' : '❌'}`)
  }

  if (formType === 'other_policy') {
    const policyOk = await fillField(frame, 'Provide the URL to the specific Amazon policy', 'kat-input', 'https://sellercentral.amazon.com/help/hub/reference/G200164330')
    p(`Policy URL: ${policyOk ? '✅' : '❌'}`)
  }

  if (formType === 'product_not_as_described') {
    const orderOk = await fillField(frame, 'Provide the order ID of your test buy', 'kat-input', '111-2222222-3333333')
    p(`Order ID: ${orderOk ? '✅' : '❌'}`)
  }

  if (formType === 'product_review') {
    const orderOk = await fillField(frame, 'If this violation occurred as part of a purchase, provide the order ID', 'kat-input', '111-2222222-3333333')
    p(`Order ID: ${orderOk ? '✅' : '❌'}`)
  }

  if (formType === 'product_review') {
    const asinOk = await fillField(frame, 'List up to 10 ASIN(s)', 'kat-input', 'B0TEST1234, B0TEST5678')
    p(`ASINs: ${asinOk ? '✅' : '❌'}`)
  }

  console.log(`\n🏁 ${formType} 테스트 완료`)
}

// ─── 메인 ────────────────────────────────────────────────────
const run = async (): Promise<void> => {
  console.log('╔══════════════════════════════════════╗')
  console.log('║   BR 폼 테스트 (3개 타입, dry-run)    ║')
  console.log('╚══════════════════════════════════════╝')
  console.log('')

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: ['--no-sandbox'],
    viewport: { width: 1280, height: 720 },
  })

  const page = context.pages()[0] || await context.newPage()

  // 로그인
  await page.goto(BR_URL, { waitUntil: 'networkidle', timeout: 30_000 })

  if (page.url().includes('signin') || page.url().includes('/ap/')) {
    const email = process.env['BR_EMAIL']
    const password = process.env['BR_PASSWORD']

    if (email && password) {
      console.log('🔑 자동 로그인 시도...')
      await page.fill('#ap_email', email).catch(() => {})
      await page.click('#continue').catch(() => {})
      await page.waitForTimeout(1000)
      await page.fill('#ap_password', password).catch(() => {})
      await page.click('#signInSubmit').catch(() => {})
      await page.waitForTimeout(2000)

      // OTP
      const otpInput = await page.waitForSelector('#auth-mfa-otpcode', { timeout: 5000 }).catch(() => null)
      if (otpInput) {
        const secret = process.env['BR_OTP_SECRET']
        if (secret) {
          const { TOTP } = await import('otpauth')
          const totp = new TOTP({ secret, digits: 6, period: 30 })
          const code = totp.generate()
          console.log(`🔐 OTP 자동 입력: ${code}`)
          await otpInput.fill(code)
          await page.click('#auth-signin-button').catch(() => {})
        } else {
          console.log('⏳ OTP를 수동으로 입력하세요...')
        }
      }

      await page.waitForURL(u => u.toString().includes('brandregistry.amazon.com') && !u.toString().includes('/ap/'), { timeout: 120_000 })
    } else {
      console.log('⏳ 브라우저에서 수동 로그인 하세요 (2분 타임아웃)...')
      await page.waitForURL(u => u.toString().includes('brandregistry.amazon.com') && !u.toString().includes('/ap/'), { timeout: 120_000 })
    }

    // contact-us로 이동
    if (!page.url().includes('/cu/contact-us')) {
      await page.goto(BR_URL, { waitUntil: 'networkidle', timeout: 30_000 })
      await page.waitForTimeout(3000)
    }
  }

  console.log(`✅ 로그인 완료: ${page.url()}`)

  // 3개 폼 순차 테스트
  for (const formType of ['other_policy', 'incorrect_variation', 'product_not_as_described', 'product_review']) {
    try {
      await testFormType(page, formType)
    } catch (err) {
      console.log(`\n❌ ${formType} 실패: ${err instanceof Error ? err.message : String(err)}`)
    }
    await page.waitForTimeout(2000)
  }

  console.log('\n\n════════════ 전체 테스트 완료 ════════════')
  console.log('브라우저에서 결과를 확인하세요.')
  console.log('종료: Ctrl+C')
  await new Promise(() => {})
}

run().catch(err => {
  console.error('❌ Fatal:', err)
  process.exit(1)
})
