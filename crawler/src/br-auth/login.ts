// Unified BR Login — br-submit + br-monitor 통합 로그인 모듈
// 기존 두 워커의 ensureLoggedIn을 통합하여 단일 소스로 관리

import type { Page } from 'playwright'
import { log } from '../logger.js'
import { detectCaptcha, handleCaptchaBlock, handleSessionRecovered } from './captcha-handler.js'
import type { SessionManager } from './session-manager.js'

const BR_URL = 'https://brandregistry.amazon.com/cu/contact-us?serviceId=SOA'
const BR_DASHBOARD_URL = 'https://brandregistry.amazon.com/cu/case-dashboard'

type LoginResult =
  | { success: true }
  | { success: false; reason: 'captcha' | 'cooldown' | 'timeout' | 'error'; detail: string }

export const ensureLoggedIn = async (
  page: Page,
  module: string,
  sessionManager?: SessionManager,
  notifyFn?: (message: string) => Promise<void>,
): Promise<LoginResult> => {
  // 쿨다운 중이면 스킵
  if (sessionManager && sessionManager.isInCooldown()) {
    return { success: false, reason: 'cooldown', detail: 'In CAPTCHA cooldown period' }
  }

  const url = page.url()
  log('info', module, `Current URL before login check: ${url}`)

  // 이미 BR 페이지에 있으면 스킵
  if (url.includes('brandregistry.amazon.com') && !url.includes('/ap/') && !url.includes('signin')) {
    sessionManager?.recordActivity()
    return { success: true }
  }

  try {
    await page.goto(BR_URL, { waitUntil: 'networkidle', timeout: 30_000 })
  } catch {
    return { success: false, reason: 'timeout', detail: 'Failed to load BR page' }
  }

  log('info', module, `After goto: ${page.url()}`)

  if (page.url().includes('signin') || page.url().includes('/ap/')) {
    const email = process.env['BR_EMAIL']
    const password = process.env['BR_PASSWORD']

    if (!email || !password) {
      return { success: false, reason: 'error', detail: 'BR_EMAIL or BR_PASSWORD not set' }
    }

    try {
      await page.fill('#ap_email', email, { timeout: 10_000 }).catch(() => {})
      await page.click('#continue').catch(() => {})
      await page.fill('#ap_password', password, { timeout: 10_000 }).catch(() => {})
      await page.click('#signInSubmit').catch(() => {})

      // OTP 처리
      const otpInput = await page.waitForSelector('#auth-mfa-otpcode', { timeout: 5_000 }).catch(() => null)
      if (otpInput) {
        const secret = process.env['BR_OTP_SECRET']
        if (secret) {
          const { TOTP } = await import('otpauth')
          const totp = new TOTP({ secret, digits: 6, period: 30 })
          await otpInput.fill(totp.generate())
          await page.click('#auth-signin-button').catch(() => {})
        } else {
          log('warn', module, 'OTP required but BR_OTP_SECRET not set')
          return { success: false, reason: 'error', detail: 'OTP required but BR_OTP_SECRET not set' }
        }
      }

      // 로그인 결과 대기
      await page.waitForURL(
        (u) => u.toString().includes('brandregistry.amazon.com'),
        { timeout: 30_000 },
      ).catch(() => {})
    } catch {
      // 타임아웃 등 — CAPTCHA 체크
    }

    // CAPTCHA 감지
    if (await detectCaptcha(page)) {
      log('warn', module, 'CAPTCHA detected after login attempt')
      if (sessionManager) {
        const result = handleCaptchaBlock(sessionManager, notifyFn)
        return { success: false, reason: 'captcha', detail: `CAPTCHA blocked (${result})` }
      }
      return { success: false, reason: 'captcha', detail: 'CAPTCHA detected' }
    }

    // 로그인 성공 확인
    if (page.url().includes('brandregistry.amazon.com') && !page.url().includes('/ap/')) {
      log('info', module, 'BR login successful')
      if (sessionManager) {
        handleSessionRecovered(sessionManager, notifyFn)
      }
      return { success: true }
    }

    return { success: false, reason: 'error', detail: `Unexpected page after login: ${page.url()}` }
  }

  // 이미 로그인된 상태
  sessionManager?.recordActivity()
  return { success: true }
}

// Session Keepalive — 대시보드 방문 + 리얼 인터랙션 (Security 제안)
export const performKeepalive = async (
  page: Page,
  sessionManager: SessionManager,
): Promise<boolean> => {
  try {
    log('info', 'keepalive', `[${sessionManager['browserName']}] Starting keepalive`)

    await page.goto(BR_DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 30_000 })

    // CAPTCHA 체크
    if (await detectCaptcha(page)) {
      log('warn', 'keepalive', 'CAPTCHA detected during keepalive')
      return false
    }

    // 리얼 인터랙션: 랜덤 케이스 클릭 → 체류 → 복귀
    const caseLinks = await page.locator('a[href*="view-case"]').all()
    if (caseLinks.length > 0) {
      const randomIndex = Math.floor(Math.random() * Math.min(caseLinks.length, 5))
      await caseLinks[randomIndex].click().catch(() => {})
      const dwellTime = 5000 + Math.random() * 10000 // 5~15초 체류
      await page.waitForTimeout(dwellTime)
      await page.goto(BR_DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {})
    }

    await sessionManager.recordKeepalive()
    log('info', 'keepalive', `[${sessionManager['browserName']}] Keepalive successful`)
    return true
  } catch (err) {
    log('warn', 'keepalive', `Keepalive failed: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}
