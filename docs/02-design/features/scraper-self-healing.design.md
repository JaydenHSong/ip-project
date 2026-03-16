# Scraper Self-Healing — Design

> **Feature**: scraper-self-healing
> **Plan**: `docs/01-plan/features/scraper-self-healing.plan.md`
> **Date**: 2026-03-16
> **Status**: Draft

---

## 1. 검증 모듈: `crawler/src/br-monitor/validate.ts`

### 1.1 Message Validation (Layer 1)

```typescript
type ValidationResult = {
  accepted: ScrapedMessage[]
  rejected: Array<{ message: ScrapedMessage; reason: string }>
}

const REJECT_BODY_PATTERNS = [
  /password/i,
  /forgot\s*password/i,
  /sign\s*in/i,
  /log\s*in.*submit/i,
  /<(div|input|form|button|script)\b/i,
]

const VALID_SENDERS = ['amazon', 'you']

const validateMessage = (msg: ScrapedMessage): { valid: boolean; reason?: string } => {
  // 1. body 길이 체크
  if (!msg.body || msg.body.trim().length < 20) {
    return { valid: false, reason: `body too short (${msg.body?.length ?? 0} chars)` }
  }
  if (msg.body.length > 50_000) {
    return { valid: false, reason: `body too long (${msg.body.length} chars)` }
  }

  // 2. 로그인/HTML 패턴
  for (const pattern of REJECT_BODY_PATTERNS) {
    if (pattern.test(msg.body)) {
      return { valid: false, reason: `body matches reject pattern: ${pattern.source}` }
    }
  }

  // 3. sender 검증
  const senderLower = msg.sender.toLowerCase().trim()
  if (!VALID_SENDERS.some((s) => senderLower.includes(s))) {
    return { valid: false, reason: `invalid sender: "${msg.sender}"` }
  }

  return { valid: true }
}

const validateMessages = (messages: ScrapedMessage[]): ValidationResult => {
  const accepted: ScrapedMessage[] = []
  const rejected: ValidationResult['rejected'] = []
  for (const msg of messages) {
    const result = validateMessage(msg)
    if (result.valid) {
      accepted.push(msg)
    } else {
      rejected.push({ message: msg, reason: result.reason! })
    }
  }
  return { accepted, rejected }
}
```

### 1.2 Cycle Anomaly Detection (Layer 2)

```typescript
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
  // 모든 케이스에서 new messages → date 파싱 이상
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
  if (stats.rejectedMessages > stats.totalNewMessages / 2 && stats.rejectedMessages > 2) {
    return {
      anomalyDetected: true,
      action: 'warn',
      reason: `${stats.rejectedMessages}/${stats.totalNewMessages + stats.rejectedMessages} messages rejected`,
    }
  }

  return { anomalyDetected: false, action: 'proceed' }
}
```

---

## 2. 크롤러 적용: `crawler/src/br-monitor/worker.ts`

### 2.1 processSingleCase 수정

```typescript
// 기존
const detail = await scrapeCaseDetail(page, target.brCaseId)
const newMessages = detectNewMessages(detail.messages, target.lastScrapedAt)

// 변경 후
const detail = await scrapeCaseDetail(page, target.brCaseId)

// Layer 1: 메시지 검증
const { accepted, rejected } = validateMessages(detail.messages)
if (rejected.length > 0) {
  log('warn', 'br-monitor', `Case ${target.brCaseId}: ${rejected.length} messages rejected`, {
    reasons: rejected.map((r) => r.reason),
  })
}

const newMessages = detectNewMessages(accepted, target.lastScrapedAt)
```

### 2.2 processBrMonitorJob — 사이클 레벨 감지

```typescript
// 사이클 완료 후 통계 수집
const cycleStats: CycleStats = { totalCases, casesWithNewMessages, totalNewMessages, rejectedMessages }
const anomaly = detectCycleAnomaly(cycleStats)

if (anomaly.anomalyDetected) {
  log('error', 'br-monitor', `ANOMALY: ${anomaly.reason}`)
  await notifyOperator(`🚨 *[BR Monitor]* 이상 감지\n${anomaly.reason}\n조치: ${anomaly.action}`)

  if (anomaly.action === 'discard_cycle') {
    log('error', 'br-monitor', 'Discarding entire cycle results')
    // 이미 전송된 결과는 API 측 중복 체크로 방어
  }
}
```

---

## 3. API 적용: `src/app/api/crawler/br-monitor-result/route.ts`

### 3.1 중복 body 체크 (2차 방어)

```typescript
// 메시지 저장 전 — 동일 report_id + 동일 body 존재하면 스킵
if (body.new_messages.length > 0) {
  const { data: existing } = await supabase
    .from('br_case_messages')
    .select('body')
    .eq('report_id', body.report_id)

  const existingBodies = new Set((existing ?? []).map((e) => e.body))
  const deduplicated = body.new_messages.filter((msg) => !existingBodies.has(msg.body))

  if (deduplicated.length < body.new_messages.length) {
    const skipped = body.new_messages.length - deduplicated.length
    // 로그만, 에러 아님
  }

  // deduplicated만 저장
}
```

---

## 4. 파일 변경 목록

| # | 파일 | Action | 내용 |
|---|------|--------|------|
| 1 | `crawler/src/br-monitor/validate.ts` | **NEW** | validateMessage, validateMessages, detectCycleAnomaly |
| 2 | `crawler/src/br-monitor/worker.ts` | MODIFY | processSingleCase에 검증 호출, 사이클 통계 수집 |
| 3 | `src/app/api/crawler/br-monitor-result/route.ts` | MODIFY | 중복 body 체크 추가 |

---

## 5. 구현 순서

```
Step 1: validate.ts 생성 (validateMessage, validateMessages, detectCycleAnomaly)
    ↓
Step 2: worker.ts — processSingleCase에 검증 적용
    ↓
Step 3: worker.ts — processBrMonitorJob에 사이클 통계 + anomaly 감지
    ↓
Step 4: br-monitor-result API에 중복 body 체크
    ↓
Step 5: typecheck + 배포
    ↓
Step 6: 다음 사이클 로그로 검증
```

---

## 6. Verification Checklist

- [ ] validate.ts 타입체크 통과
- [ ] 로그인 페이지 body → rejected 로그 확인
- [ ] 정상 메시지 → accepted (false positive 없음)
- [ ] 전체 케이스 new messages 시 anomaly 알림
- [ ] 동일 body 중복 저장 방지
- [ ] Google Chat 알림 수신
- [ ] 기존 정상 플로우에 영향 없음

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-03-16 | Initial design |
