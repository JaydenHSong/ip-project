// CAPTCHA Handler — 감지 + 1회 재시도 + 알림
// Security 합의: 재시도 1회로 제한 (계정 잠금 위험 방지)

import type { Page } from 'playwright'
import type { SessionManager } from './session-manager.js'
import { log } from '../logger.js'

const MAX_RETRIES = Number(process.env['BR_MAX_CAPTCHA_RETRIES']) || 1

// CAPTCHA 감지 — 하나라도 매칭 시 true
export const detectCaptcha = async (page: Page): Promise<boolean> => {
  const checks = [
    async () => page.url().includes('captcha'),
    async () => page.url().includes('errors/validateCaptcha'),
    async () => page.locator('#captchacharacters').isVisible({ timeout: 1000 }).catch(() => false),
    async () => page.locator('img[src*="captcha"]').isVisible({ timeout: 1000 }).catch(() => false),
    async () => {
      const title = await page.title().catch(() => '')
      return title.includes('Robot Check')
    },
    async () => {
      return page.evaluate(() => {
        const text = document.body?.textContent ?? ''
        return text.includes('Forgot your password?') && !text.includes('Brand Registry')
      }).catch(() => false)
    },
  ]

  for (const check of checks) {
    try {
      if (await check()) return true
    } catch {
      continue
    }
  }
  return false
}

// CAPTCHA 대응 (1회 재시도 후 수동 개입)
export const handleCaptchaBlock = (
  sessionManager: SessionManager,
  notifyFn?: (message: string) => Promise<void>,
): 'retry' | 'manual_required' => {
  sessionManager.setCooldown()
  const status = sessionManager.getStatus()

  if (status.retryCount > MAX_RETRIES) {
    sessionManager.setManualRequired()
    if (notifyFn) {
      notifyFn('🚨 [Sentinel BR] CAPTCHA 자동 복구 실패 — 수동 로그인 필요').catch(() => {})
    }
    return 'manual_required'
  }

  if (status.retryCount === 1 && notifyFn) {
    notifyFn('⚠️ [Sentinel BR] CAPTCHA 감지됨 — 5분 후 자동 재시도').catch(() => {})
  }

  log('warn', 'captcha-handler', `CAPTCHA detected, cooldown ${status.retryCount}/${MAX_RETRIES}`)
  return 'retry'
}

// 세션 복구 성공 시
export const handleSessionRecovered = (
  sessionManager: SessionManager,
  notifyFn?: (message: string) => Promise<void>,
): void => {
  const prevStatus = sessionManager.getStatus()
  const wasCaptchaBlocked = prevStatus.state === 'captcha_blocked' || prevStatus.state === 'manual_required'

  sessionManager.resetRetry()

  if (wasCaptchaBlocked && notifyFn) {
    notifyFn('✅ [Sentinel BR] 세션 복구 완료').catch(() => {})
  }
}
