// BR Session Manager — 파일 기반 세션 상태 관리
// /tmp에 JSON 파일로 저장 → 컨테이너 재시작 시에도 일부 유지 (Railway Volume 있으면)
// 파일 접근 실패 시 메모리 fallback

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { log } from '../logger.js'

export type SessionState = 'valid' | 'expired' | 'captcha_blocked' | 'manual_required'

export type SessionStatus = {
  state: SessionState
  lastActiveAt: string | null
  retryCount: number
  cooldownUntil: string | null
  lastKeepaliveAt: string | null
}

const DEFAULT_STATUS: SessionStatus = {
  state: 'valid',
  lastActiveAt: null,
  retryCount: 0,
  cooldownUntil: null,
  lastKeepaliveAt: null,
}

const SESSION_DIR = '/tmp/br-session'
const KEEPALIVE_THRESHOLD_MS = Number(process.env['BR_KEEPALIVE_INTERVAL_MS']) || 6 * 60 * 60 * 1000 // 6시간
const COOLDOWN_BASE_MS = Number(process.env['BR_COOLDOWN_BASE_MS']) || 5 * 60 * 1000 // 5분

export class SessionManager {
  private filePath: string
  private memoryFallback: SessionStatus

  constructor(private browserName: 'submit' | 'monitor') {
    this.filePath = join(SESSION_DIR, `${browserName}.json`)
    this.memoryFallback = { ...DEFAULT_STATUS }
    try { mkdirSync(SESSION_DIR, { recursive: true }) } catch { /* ignore */ }
  }

  getStatus(): SessionStatus {
    try {
      const raw = readFileSync(this.filePath, 'utf-8')
      return JSON.parse(raw) as SessionStatus
    } catch {
      return { ...this.memoryFallback }
    }
  }

  setState(state: SessionState): void {
    const status = this.getStatus()
    status.state = state
    if (state === 'valid') {
      status.retryCount = 0
      status.cooldownUntil = null
    }
    this.save(status)
    log('info', 'session-manager', `[${this.browserName}] state → ${state}`)
  }

  recordActivity(): void {
    const status = this.getStatus()
    status.lastActiveAt = new Date().toISOString()
    status.state = 'valid'
    this.save(status)
  }

  recordKeepalive(): void {
    const status = this.getStatus()
    status.lastKeepaliveAt = new Date().toISOString()
    status.lastActiveAt = new Date().toISOString()
    status.state = 'valid'
    this.save(status)
  }

  shouldKeepalive(): boolean {
    const status = this.getStatus()
    if (!status.lastActiveAt) return true
    const elapsed = Date.now() - new Date(status.lastActiveAt).getTime()
    return elapsed >= KEEPALIVE_THRESHOLD_MS
  }

  isInCooldown(): boolean {
    const status = this.getStatus()
    if (!status.cooldownUntil) return false
    return new Date(status.cooldownUntil).getTime() > Date.now()
  }

  setCooldown(): void {
    const status = this.getStatus()
    status.state = 'captcha_blocked'
    status.retryCount += 1
    status.cooldownUntil = new Date(Date.now() + COOLDOWN_BASE_MS).toISOString()
    this.save(status)
    log('warn', 'session-manager', `[${this.browserName}] CAPTCHA cooldown set, retry ${status.retryCount}, until ${status.cooldownUntil}`)
  }

  setManualRequired(): void {
    const status = this.getStatus()
    status.state = 'manual_required'
    this.save(status)
    log('error', 'session-manager', `[${this.browserName}] manual intervention required`)
  }

  resetRetry(): void {
    const status = this.getStatus()
    status.retryCount = 0
    status.cooldownUntil = null
    status.state = 'valid'
    this.save(status)
    log('info', 'session-manager', `[${this.browserName}] retry count reset`)
  }

  private save(status: SessionStatus): void {
    this.memoryFallback = status
    try {
      writeFileSync(this.filePath, JSON.stringify(status), 'utf-8')
    } catch (err) {
      log('warn', 'session-manager', `Failed to save session file: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}
