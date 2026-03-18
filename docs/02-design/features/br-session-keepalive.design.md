# BR Session Keepalive — Design Document

> **Feature**: Amazon BR 크롤러 세션 만료/CAPTCHA 방어 전략
> **Created**: 2026-03-18
> **Phase**: Design
> **Plan Reference**: `docs/01-plan/features/br-session-keepalive.plan.md`
> **Team Review**: CTO Lead, Security Architect, QA Strategist, Frontend Architect

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | BR 세션 12~24시간 후 만료 → 재로그인 시 슬라이드 CAPTCHA → 크롤러 전체 마비 |
| **Solution** | monitor 주기 편승 킵얼라이브 + CAPTCHA 1회 재시도 후 수동 개입 + UA 즉시 업데이트 + Redis 상태 저장 |
| **UX Effect** | BR 작업 성공률 70% → 95%+, CAPTCHA 시 자동 알림 + Settings UI에서 상태 확인/수동 리셋 |
| **Core Value** | BR 자동화 파이프라인 안정성 확보 |

---

## D0. 팀 리뷰 반영 사항 (Plan 대비 변경)

| 원안 (Plan) | 변경 (Design) | 제안자 |
|------------|-------------|--------|
| 별도 4시간 킵얼라이브 루프 | **monitor 30분 주기에 편승**, 6시간 무작업 시만 독립 킵얼라이브 | Security |
| CAPTCHA 재시도 4회 | **1회로 축소** → 실패 시 즉시 수동 개입 알림 | Security |
| 세션 상태 메모리 저장 | **Redis 저장** (컨테이너 재시작 시 유지) | QA + Security |
| Chrome/120 UA 유지 | **Chrome/134+ 즉시 업데이트** + UA/Sec-Ch-Ua 일치 | Security (Critical) |
| 대시보드 별도 위젯 | **SystemStatusWidget details에 한 줄 추가**만 | Frontend |
| — | **Settings > Crawler 탭에 BR Session 섹션 신설** | Frontend |
| — | **킵얼라이브 시 케이스 클릭 → 체류 → 복귀 (리얼 인터랙션)** | Security |
| — | **browser page 접근 직렬화 (lock)** | QA |

---

## D1. Shared Login Module — `crawler/src/br-auth/`

### 파일 구조

```
crawler/src/br-auth/
├── login.ts              — 통합 ensureLoggedIn (현재 2개 워커에서 추출)
├── captcha-handler.ts    — CAPTCHA 감지 + 쿨다운 + 알림
├── session-manager.ts    — 세션 상태 관리 + Redis 저장 + 킵얼라이브
└── ua-pool.ts            — 최신 Chrome UA 풀 + Sec-Ch-Ua 동기화
```

### D1.1 login.ts — 통합 로그인

```typescript
// 현재 br-submit/worker.ts:49-104, br-monitor/worker.ts의 ensureLoggedIn을 통합
// 두 워커 모두 이 함수를 import하여 사용

type LoginResult = { success: true } | { success: false; reason: 'captcha' | 'timeout' | 'error'; detail: string }

const ensureLoggedIn = async (page: Page, module: string): Promise<LoginResult>
// 1. URL 체크 — BR 페이지면 스킵
// 2. signin/ap/ 페이지면 자동 로그인 (email → password → OTP)
// 3. 로그인 후 페이지 분석:
//    - BR 대시보드 → success
//    - CAPTCHA 페이지 → { success: false, reason: 'captcha' }
//    - 타임아웃 → { success: false, reason: 'timeout' }
```

### D1.2 captcha-handler.ts — CAPTCHA 감지

```typescript
// CAPTCHA 감지 조건 (OR — 하나라도 매칭 시 CAPTCHA 판정)
const CAPTCHA_INDICATORS = [
  () => page.url().includes('captcha'),
  () => page.url().includes('errors/validateCaptcha'),
  () => page.locator('#captchacharacters').isVisible({ timeout: 1000 }),
  () => page.locator('img[src*="captcha"]').isVisible({ timeout: 1000 }),
  () => page.evaluate(() => document.title.includes('Robot Check')),
  // Security 발견: "Forgot your password?" 메뉴만 보이는 경우도 CAPTCHA/보안 챌린지
  () => page.evaluate(() => {
    const text = document.body?.textContent ?? ''
    return text.includes('Forgot your password?') && !text.includes('Brand Registry')
  }),
]

const detectCaptcha = async (page: Page): Promise<boolean>
// 위 indicators를 순차 체크, 하나라도 true면 CAPTCHA

// CAPTCHA 대응 (Plan 변경: 4회 → 1회)
const handleCaptchaBlock = async (sessionManager: SessionManager): Promise<void>
// 1. sessionState = 'captcha_blocked'
// 2. Google Chat 알림 (즉시)
// 3. 1회 쿨다운 대기 (5분) 후 재시도
// 4. 재시도 실패 → sessionState = 'manual_required', 긴급 알림
// 5. 작업 큐 일시 중지 (BullMQ pause)
```

### D1.3 session-manager.ts — 세션 상태 관리

```typescript
type SessionState = 'valid' | 'expired' | 'captcha_blocked' | 'manual_required'

type SessionStatus = {
  state: SessionState
  lastActiveAt: string | null    // ISO timestamp
  retryCount: number
  cooldownUntil: string | null   // ISO timestamp
  lastKeepaliveAt: string | null
}

// Redis 키: 'br:session:submit', 'br:session:monitor'
// 컨테이너 재시작 시에도 상태 유지 (QA + Security 합의)

class SessionManager {
  constructor(private redis: Redis, private browserName: 'submit' | 'monitor')

  getStatus(): Promise<SessionStatus>
  setState(state: SessionState): Promise<void>
  recordActivity(): Promise<void>           // lastActiveAt 업데이트
  recordKeepalive(): Promise<void>          // lastKeepaliveAt 업데이트
  shouldKeepalive(): Promise<boolean>       // 6시간 이상 무작업 시 true
  isInCooldown(): Promise<boolean>          // cooldownUntil > now 이면 true
  incrementRetry(): Promise<number>         // retryCount++ → 반환
  resetRetry(): Promise<void>               // retryCount = 0
}
```

### D1.4 ua-pool.ts — UA 즉시 수정 (Security Critical)

```typescript
// 현재 문제:
// - br-submit UA: Chrome/120 (2년 구버전)
// - stealth.ts Sec-Ch-Ua: Chrome/136 (불일치)

// 수정: 최신 Chrome 3개 버전 풀 + Sec-Ch-Ua 자동 동기화
const CHROME_VERSIONS = ['134', '135', '136'] // 2026-03 기준

const getRandomUA = (): { userAgent: string; secChUa: string } => {
  const version = CHROME_VERSIONS[Math.floor(Math.random() * CHROME_VERSIONS.length)]
  return {
    userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`,
    secChUa: `"Chromium";v="${version}", "Google Chrome";v="${version}", "Not.A/Brand";v="99"`,
  }
}
```

**적용 위치**:
- `br-submit/worker.ts` line 39: `userAgent` → `getRandomUA().userAgent`
- `anti-bot/stealth.ts` line 122: `Sec-Ch-Ua` → `getRandomUA().secChUa`

---

## D2. Session Keepalive — Monitor 주기 편승

### 설계 변경 (Security 제안 반영)

별도 킵얼라이브 루프 대신, **기존 br-monitor 30분 스케줄러가 실행될 때마다 세션 활성 기록** → 6시간 이상 무작업 시에만 독립 킵얼라이브:

```
br-monitor 30분 주기 실행
    │
    ├── 정상 작업 있음 → sessionManager.recordActivity() → 킵얼라이브 불필요
    │
    └── 정상 작업 없음 → shouldKeepalive() 체크
            │
            ├── 6시간 미경과 → 스킵
            │
            └── 6시간 경과 → 킵얼라이브 실행
                    │
                    1. BR 대시보드 로드
                    2. 랜덤 케이스 1개 클릭 (Security: 리얼 인터랙션)
                    3. 5~15초 체류
                    4. 대시보드로 복귀
                    5. sessionManager.recordKeepalive()
```

### 동시성 처리 (QA 제안)

```typescript
// browser page 접근 직렬화 — mutex lock
// br-submit 작업 중에 킵얼라이브가 같은 page 접근 방지

import { Mutex } from 'async-mutex' // npm 패키지

const pageLock = new Mutex()

// 사용:
const release = await pageLock.acquire()
try {
  await doSomethingWithPage(page)
} finally {
  release()
}
```

---

## D3. CAPTCHA 대응 — 1회 재시도 (Security 변경)

```
CAPTCHA 감지
    │
    ▼
sessionState = 'captcha_blocked'
Google Chat 알림 (즉시)
5분 대기
    │
    ▼
재시도 (1회)
    │
    ├── 성공 → sessionState = 'valid', 복구 알림
    │
    └── 실패 → sessionState = 'manual_required'
              긴급 알림: "수동 로그인 필요"
              BullMQ 작업 큐 pause
```

**Plan 대비 변경**: 4회 지수 백오프 → 1회 5분 대기 후 재시도. 이유: 반복 자동 로그인은 Amazon 계정 잠금 위험 증가 (Security).

---

## D4. /health 엔드포인트 확장

```typescript
// health.ts 응답에 추가
{
  status: 'ok' | 'degraded' | 'error',
  uptime: number,
  redis: boolean,
  worker: boolean,
  brSession: {                          // NEW
    submit: SessionStatus,              // from Redis
    monitor: SessionStatus,             // from Redis
  }
}
```

**Security 주의**: `/health`는 비인증 엔드포인트. `brSession` 상세는 `CRAWLER_SERVICE_TOKEN` 헤더가 있을 때만 노출, 없으면 `state` 필드만 반환.

---

## D5. Google Chat 알림

| 이벤트 | 알림 | 중복 방지 |
|--------|------|----------|
| CAPTCHA 최초 감지 | "CAPTCHA 감지됨, 5분 후 재시도" | 1회만 |
| 재시도 성공 | "세션 복구 완료" | — |
| 재시도 실패 → manual_required | "긴급: 수동 로그인 필요" | 30분마다 반복 |
| 킵얼라이브 세션 만료 감지 | "세션 만료, 재로그인 시도 중" | 1회만 |

---

## D6. Frontend — Settings > Crawler 탭

### BR Session Status 섹션 (Frontend Architect 설계)

```
────────────────────────────────────────
BR Session Status                  [Refresh]
  ┌──────────────────────────────────────┐
  │  Submit Worker    ● Active           │
  │  Monitor Worker   ● Active           │
  │  Last keepalive: 2h ago              │
  └──────────────────────────────────────┘
```

### 상태별 UI

| 상태 | Badge | 버튼 |
|------|-------|------|
| `valid` | Green "Active" | (숨김) |
| `captcha_blocked` | Amber "CAPTCHA Blocked" | "Retry Now" |
| `manual_required` | Red "Manual Required" + 배너 | "Reset & Retry" |

### API

```
GET /api/system/status → 기존 + brSession 필드 추가
POST /api/crawler/br-session-reset → 수동 retry_count 초기화 + 재시도 트리거
```

---

## D7. 구현 순서

| Step | 파일 | 내용 | 의존성 |
|------|------|------|--------|
| 1 | `crawler/src/br-auth/ua-pool.ts` | UA 풀 + Sec-Ch-Ua 동기화 | 없음 (즉시) |
| 2 | `crawler/src/br-submit/worker.ts` | Chrome/120 → ua-pool 적용 | Step 1 |
| 3 | `crawler/src/anti-bot/stealth.ts` | Sec-Ch-Ua → ua-pool 적용 | Step 1 |
| 4 | `crawler/src/br-auth/session-manager.ts` | Redis 기반 세션 상태 관리 | 없음 |
| 5 | `crawler/src/br-auth/captcha-handler.ts` | CAPTCHA 감지 + 1회 재시도 | Step 4 |
| 6 | `crawler/src/br-auth/login.ts` | 통합 ensureLoggedIn | Step 4, 5 |
| 7 | `crawler/src/br-submit/worker.ts` | 기존 ensureLoggedIn → login.ts | Step 6 |
| 8 | `crawler/src/br-monitor/worker.ts` | 기존 ensureLoggedIn → login.ts + 킵얼라이브 | Step 6 |
| 9 | `crawler/src/health.ts` | brSession 필드 추가 | Step 4 |
| 10 | Railway 배포 + 24시간 관찰 | — | Step 1~9 |

---

## D8. 영향 범위

| 구분 | 파일 |
|------|------|
| 신규 (4) | `br-auth/ua-pool.ts`, `br-auth/session-manager.ts`, `br-auth/captcha-handler.ts`, `br-auth/login.ts` |
| 수정 (4) | `br-submit/worker.ts`, `br-monitor/worker.ts`, `anti-bot/stealth.ts`, `health.ts` |
| Web (후속) | `src/app/api/system/status/route.ts`, Settings Crawler 탭 |
| DB 변경 | 없음 |
| 환경변수 추가 | `BR_KEEPALIVE_INTERVAL_MS`, `BR_MAX_CAPTCHA_RETRIES`, `BR_COOLDOWN_BASE_MS` |
| npm 추가 | `async-mutex` (동시성 lock) |

---

## D9. 위험 요소 + 대응 (팀 합의)

| 위험 | 대응 | 담당 |
|------|------|------|
| 킵얼라이브가 봇 감지 유발 | monitor 주기 편승 + 리얼 인터랙션 | Security |
| Chrome UA 구버전 (Critical) | Step 1에서 즉시 수정 | Security |
| CAPTCHA 재시도로 계정 잠금 | 1회로 제한 → 수동 개입 | Security |
| 컨테이너 재시작 시 상태 소실 | Redis 저장 | QA |
| page 동시 접근 race condition | async-mutex lock | QA |
| `/health`에 세션 상태 노출 | 인증 토큰 필요 | Security |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-03-18 | Initial design (팀 리뷰 반영) |
