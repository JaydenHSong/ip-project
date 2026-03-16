// BR Monitor Data Validation — Layer 1 (규칙 기반) + Layer 2 (패턴 감지)
import type { ScrapedMessage } from './types.js'
import { log } from '../logger.js'

// ─── Layer 1: Message Validation ─────────────────────────────

const REJECT_BODY_PATTERNS = [
  /password/i,
  /forgot\s*password/i,
  /sign[\s-]*in/i,
  /log[\s-]*in.*submit/i,
  /<(div|input|form|button|script|html|head)\b/i,
  /captcha/i,
  /verify\s*your\s*identity/i,
  /two[\s-]*step\s*verification/i,
]

const VALID_SENDERS = ['amazon', 'you']

type MessageValidation = { valid: true } | { valid: false; reason: string }

const validateMessage = (msg: ScrapedMessage): MessageValidation => {
  // body 길이 체크
  if (!msg.body || msg.body.trim().length < 20) {
    return { valid: false, reason: `body too short (${msg.body?.length ?? 0} chars)` }
  }
  if (msg.body.length > 50_000) {
    return { valid: false, reason: `body too long (${msg.body.length} chars)` }
  }

  // 로그인/HTML 패턴
  for (const pattern of REJECT_BODY_PATTERNS) {
    if (pattern.test(msg.body)) {
      return { valid: false, reason: `body matches reject pattern: ${pattern.source}` }
    }
  }

  // sender 검증
  const senderLower = msg.sender.toLowerCase().trim()
  if (!VALID_SENDERS.some((s) => senderLower.includes(s))) {
    return { valid: false, reason: `invalid sender: "${msg.sender}"` }
  }

  return { valid: true }
}

type ValidationResult = {
  accepted: ScrapedMessage[]
  rejected: Array<{ message: ScrapedMessage; reason: string }>
}

const validateMessages = (messages: ScrapedMessage[]): ValidationResult => {
  const accepted: ScrapedMessage[] = []
  const rejected: ValidationResult['rejected'] = []

  for (const msg of messages) {
    const result = validateMessage(msg)
    if (result.valid) {
      accepted.push(msg)
    } else {
      rejected.push({ message: msg, reason: result.reason })
    }
  }

  if (rejected.length > 0) {
    log('warn', 'br-validate', `${rejected.length}/${messages.length} messages rejected: ${rejected.map((r) => r.reason).join(', ')}`)
  }

  return { accepted, rejected }
}

// ─── Layer 2: Cycle Anomaly Detection ────────────────────────

type CycleStats = {
  totalCases: number
  casesWithNewMessages: number
  totalNewMessages: number
  rejectedMessages: number
}

type AnomalyResult = {
  anomalyDetected: boolean
  action: 'proceed' | 'warn' | 'discard_cycle'
  reason?: string
}

const detectCycleAnomaly = (stats: CycleStats): AnomalyResult => {
  // 모든 케이스에서 new messages → date 파싱 이상 가능성
  if (stats.totalCases > 3 && stats.casesWithNewMessages === stats.totalCases) {
    return {
      anomalyDetected: true,
      action: 'discard_cycle',
      reason: `all ${stats.totalCases} cases reported new messages — likely date parsing issue`,
    }
  }

  // 한 사이클에 10개 이상 신규
  if (stats.totalNewMessages > 10) {
    return {
      anomalyDetected: true,
      action: 'warn',
      reason: `unusually high new messages: ${stats.totalNewMessages}`,
    }
  }

  // 절반 이상 거부됨
  const totalAttempted = stats.totalNewMessages + stats.rejectedMessages
  if (stats.rejectedMessages > totalAttempted / 2 && stats.rejectedMessages > 2) {
    return {
      anomalyDetected: true,
      action: 'warn',
      reason: `${stats.rejectedMessages}/${totalAttempted} messages rejected — possible scraper issue`,
    }
  }

  return { anomalyDetected: false, action: 'proceed' }
}

export { validateMessages, detectCycleAnomaly }
export type { ValidationResult, CycleStats, AnomalyResult }
