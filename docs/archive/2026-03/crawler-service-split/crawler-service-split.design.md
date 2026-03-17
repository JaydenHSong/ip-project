# Crawler Service Split — Design

> **Feature**: crawler-service-split
> **Plan**: `docs/01-plan/features/crawler-service-split.plan.md`
> **Created**: 2026-03-13
> **Phase**: Design

---

## 1. Architecture Overview

```
┌─────────────────────────┐  ┌──────────────────────────┐
│ sentinel-crawl           │  │ sentinel-br               │
│ SENTINEL_SERVICE=crawl   │  │ SENTINEL_SERVICE=br       │
│                          │  │                            │
│  Crawl Worker            │  │  BR Submit Worker          │
│  (Bright Data proxy)     │  │  BR Monitor Worker         │
│  /trigger, /fetch,       │  │  BR Reply Worker           │
│  /diag/browser           │  │  (shared browser session)  │
│                          │  │                            │
│  Heartbeat: 1 worker     │  │  Heartbeat: 3 workers      │
│  Daily Report: Crawl     │  │  Daily Report: BR queues    │
└────────────┬─────────────┘  └────────────┬───────────────┘
             │                              │
             └──── Redis-GamH (shared) ─────┘
                         │
              ┌──────────┴──────────┐
              │ Health Monitor       │
              │ (Vercel Cron 1min)   │
              │                      │
              │ GET /health (both)   │
              │ → auto restart       │
              │ → Chat alert         │
              └──────────┬───────────┘
                         │
              ┌──────────┴──────────┐
              │ Google Chat Bot      │
              │ (Vercel API Route)   │
              │                      │
              │ 상태/재시작/로그     │
              │ → Railway API        │
              └─────────────────────┘
```

---

## 2. Phase A: 서비스 분리 — 상세 설계

### 2.1 Entry Point 구조

#### `crawler/src/index.ts` (라우터)

```typescript
// 기존 init() 함수를 유지하되, 서비스 타입에 따라 분기
const service = process.env['SENTINEL_SERVICE'] ?? 'all'

if (service === 'crawl') {
  await import('./entry-crawl.js')
} else if (service === 'br') {
  await import('./entry-br.js')
} else {
  // 기존 모노리스 로직 (로컬 개발 & 롤백용)
  init().catch(...)
}
```

**변경 범위**: index.ts 상단에 분기만 추가. 기존 `init()` 함수는 `else` 블록에서 그대로 사용.

#### `crawler/src/entry-crawl.ts` (신규)

초기화 순서:
1. `loadConfig('crawl')` — BRIGHTDATA_BROWSER_WS 필수
2. SentinelClient, ChatNotifier, VisionAnalyzer 생성
3. Health server 시작 (`/health`, `/trigger`, `/fetch`, `/diag/browser`)
4. Crawl Queue + Worker + Scheduler
5. Heartbeat monitor (`['Crawl Worker']`)
6. Daily report (Crawl 큐만)
7. Worker error alert handler
8. Graceful shutdown

**index.ts L84~94, L162~243에서 추출할 코드 블록:**
- Crawl queue/worker/scheduler 초기화
- `/trigger`, `/fetch` 엔드포인트 (health.ts가 이미 처리)
- Daily report (Crawl 큐만 포함)

#### `crawler/src/entry-br.ts` (신규)

초기화 순서:
1. `loadConfig('br')` — BRIGHTDATA_BROWSER_WS 불필요
2. SentinelClient, ChatNotifier 생성 (VisionAnalyzer 불필요)
3. Health server 시작 (`/health`만, queue/browserWs/vision 미전달)
4. BR Submit Queue + Worker + Scheduler
5. BR Monitor Queue + Worker + Scheduler + `setMonitorNotifier`
6. BR Reply Queue + Worker + Scheduler + `setBrowserPageAccessor` 연결
7. Heartbeat monitor (`['BR Submit Worker', 'BR Monitor Worker', 'BR Reply Worker']`)
8. Daily report (BR 3개 큐만)
9. Worker error alert handlers (3개)
10. Graceful shutdown

**index.ts L96~144에서 추출할 코드 블록:**
- BR Submit/Monitor/Reply 초기화
- Monitor ↔ Reply 브라우저 공유 (`setBrowserPageAccessor`)

### 2.2 Config 수정

#### `crawler/src/config.ts`

```typescript
type ServiceType = 'crawl' | 'br' | 'all'

const loadConfig = (service?: ServiceType): CrawlerConfig => {
  // ...기존 check() 로직 유지

  // BRIGHTDATA_BROWSER_WS: br 모드에서는 불필요
  if (service === 'br') {
    config.browserWs = process.env['BRIGHTDATA_BROWSER_WS'] ?? ''
  } else {
    config.browserWs = check('BRIGHTDATA_BROWSER_WS')
  }

  // 나머지 필드는 동일 (SENTINEL_API_URL, SENTINEL_SERVICE_TOKEN, REDIS_URL 등)
}
```

**변경**: `loadConfig()` 시그니처에 `service?` 파라미터 추가, `browserWs` 체크만 조건부.

### 2.3 Health Server 변경

**변경 없음.** `health.ts`의 `HealthServerOptions`가 이미 `queue?`, `browserWs?`, `vision?`을 optional로 받아서:
- `entry-crawl.ts`: 모든 옵션 전달 (현재와 동일)
- `entry-br.ts`: `{ port, getStatus, serviceToken }` 만 전달 → `/trigger`, `/fetch`, `/diag/browser` 자동으로 503/404

### 2.4 Heartbeat 변경

**변경 없음.** `createHeartbeatMonitor(webhookUrl, workerNames)`가 이미 가변 워커 이름 배열을 받음.

### 2.5 Railway 서비스 설정

#### sentinel-crawl (기존 서비스 변경)

```
SENTINEL_SERVICE=crawl
# 기존 환경변수 유지
BRIGHTDATA_BROWSER_WS=wss://...
SENTINEL_API_URL=https://...
SENTINEL_SERVICE_TOKEN=...
REDIS_URL=redis://...@redis-gamh.railway.internal:6379
GOOGLE_CHAT_WEBHOOK_URL=https://...
ANTHROPIC_API_KEY=sk-ant-...
```

#### sentinel-br (새 서비스 생성)

```
SENTINEL_SERVICE=br
SENTINEL_API_URL=https://...
SENTINEL_SERVICE_TOKEN=...
REDIS_URL=redis://...@redis-gamh.railway.internal:6379
GOOGLE_CHAT_WEBHOOK_URL=https://...
# BRIGHTDATA_BROWSER_WS 불필요
# ANTHROPIC_API_KEY 불필요
# BR 전용
BR_EMAIL=...     (optional, auto-login용)
BR_PASSWORD=...  (optional)
BR_OTP_SECRET=... (optional)
```

---

## 3. Phase B: PD Followup 제거

### 삭제 파일

| 파일 | 이유 |
|------|------|
| `crawler/src/pd-followup/queue.ts` | PD 큐 생성 |
| `crawler/src/pd-followup/worker.ts` | PD 워커 로직 |
| `crawler/src/pd-followup/scheduler.ts` | PD 스케줄러 |
| `crawler/src/pd-followup/types.ts` | PD 타입 정의 |
| `src/app/api/crawler/pd-followup-pending/route.ts` | Web API |
| `src/app/api/crawler/pd-followup-result/route.ts` | Web API |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `crawler/src/index.ts` | PD import 및 초기화 코드 제거 (L16~18, L147~157, L182, L199, L213, L258, L260~262) |
| `crawler/src/api/sentinel-client.ts` | `getPendingFollowups()`, `reportFollowupResult()` 메서드 제거 (L349~380 근처) |

---

## 4. Phase C: 헬스 모니터

### 4.1 구현 위치

**Vercel Cron Job** (`vercel.json` + API Route)

이유:
- 별도 Railway 서비스 불필요 (비용 절약)
- Vercel Cron은 안정적 (Vercel이 관리)
- Web 앱에 이미 Supabase, 환경변수 인프라 있음

### 4.2 API Route

**`src/app/api/ops/health-monitor/route.ts`**

```typescript
// Vercel Cron: 1분마다 실행
// GET /api/ops/health-monitor

export const GET = async () => {
  const services = [
    { name: 'sentinel-crawl', url: CRAWL_HEALTH_URL },
    { name: 'sentinel-br', url: BR_HEALTH_URL },
  ]

  for (const service of services) {
    const healthy = await checkHealth(service.url)

    if (!healthy) {
      failCounts[service.name] = (failCounts[service.name] ?? 0) + 1

      if (failCounts[service.name] >= 3) {
        await restartService(service.name)
        await notifyChat(`🔄 ${service.name} 자동 재시작 (3회 연속 비정상)`)
        failCounts[service.name] = 0
      }
    } else {
      if (failCounts[service.name] > 0) {
        await notifyChat(`✅ ${service.name} 정상 복구`)
      }
      failCounts[service.name] = 0
    }
  }
}
```

### 4.3 상태 저장

**문제**: Vercel 서버리스 함수는 stateless → `failCounts`를 메모리에 유지 불가

**해결**: Supabase 테이블 또는 `edge-config` 또는 간단히 Redis (이미 있음)

가장 심플한 방안: **Railway Redis-GamH에 키 저장**
- `ops:health:sentinel-crawl:fails` → 0~3 카운트
- `ops:health:sentinel-br:fails` → 0~3 카운트
- `ops:health:last-restart:sentinel-crawl` → ISO timestamp
- `ops:health:last-restart:sentinel-br` → ISO timestamp

### 4.4 Railway API 연동

```typescript
const RAILWAY_API_URL = 'https://backboard.railway.com/graphql/v2'

const restartService = async (serviceName: string): Promise<void> => {
  const serviceId = SERVICE_IDS[serviceName]
  // Railway GraphQL: serviceInstanceRedeploy mutation
  await fetch(RAILWAY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RAILWAY_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `mutation { serviceInstanceRedeploy(serviceId: "${serviceId}", environmentId: "${ENV_ID}") }`,
    }),
  })
}
```

### 4.5 환경변수 (Vercel)

```
RAILWAY_API_TOKEN=...
RAILWAY_CRAWL_SERVICE_ID=d489093c-88f9-4a2a-8ed6-f04572715861
RAILWAY_BR_SERVICE_ID=<새 서비스 생성 후>
RAILWAY_ENV_ID=08b69f1e-ffc8-4a3c-95b5-1d80fc25def3
CRAWL_HEALTH_URL=https://<crawl-domain>.up.railway.app/health
BR_HEALTH_URL=https://<br-domain>.up.railway.app/health
OPS_SECRET=<헬스모니터 인증용>
```

### 4.6 Vercel Cron 설정

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/ops/health-monitor",
      "schedule": "* * * * *"
    }
  ]
}
```

---

## 5. Phase D: Google Chat 봇

### 5.1 구현 방식

**Google Chat → Vercel API Route (Webhook)**

Google Chat의 "Incoming Webhook"은 단방향(보내기만). 양방향(명령 받기)은 **Google Chat App** 필요:
- Google Cloud Console에서 Chat App 등록
- HTTP endpoint 방식 (Vercel API Route를 콜백 URL로)
- 관리자가 DM 또는 Space에서 봇에게 메시지 → Vercel로 전달

### 5.2 API Route

**`src/app/api/ops/chat-bot/route.ts`**

```typescript
// Google Chat App HTTP endpoint
export const POST = async (req: NextRequest) => {
  const event = await req.json()

  // Google Chat verification
  if (event.type === 'ADDED_TO_SPACE') {
    return Response.json({ text: 'Sentinel Ops Bot 연결됨' })
  }

  if (event.type === 'MESSAGE') {
    const text = event.message.text.trim().toLowerCase()
    const response = await handleCommand(text)
    return Response.json({ text: response })
  }
}

const handleCommand = async (text: string): Promise<string> => {
  // 상태 조회
  if (text === '상태' || text === 'status') {
    const crawlHealth = await fetchHealth(CRAWL_HEALTH_URL)
    const brHealth = await fetchHealth(BR_HEALTH_URL)
    return formatStatus(crawlHealth, brHealth)
  }

  // 재시작
  if (text.match(/^(재시작|restart)\s+(crawl|br)$/)) {
    const service = text.includes('crawl') ? 'sentinel-crawl' : 'sentinel-br'
    await restartService(service)
    return `🔄 ${service} 재시작 요청 완료`
  }

  return '사용 가능한 명령:\n• 상태 — 서비스 상태 조회\n• 재시작 crawl — Crawl 서비스 재시작\n• 재시작 br — BR 서비스 재시작'
}
```

### 5.3 보안

- Google Chat App은 JWT 토큰으로 요청 검증 가능
- Railway API Token은 Vercel 환경변수에만 저장
- **코드 수정 기능 없음** — restart/status/logs만

---

## 6. Implementation Order (파일별)

### Phase A: 서비스 분리

| # | 파일 | Action | 내용 |
|---|------|--------|------|
| A1 | `crawler/src/config.ts` | MODIFY | `loadConfig(service?)` 파라미터 추가, browserWs 조건부 |
| A2 | `crawler/src/entry-crawl.ts` | NEW | index.ts에서 Crawl 관련 코드 추출 |
| A3 | `crawler/src/entry-br.ts` | NEW | index.ts에서 BR 관련 코드 추출 |
| A4 | `crawler/src/index.ts` | MODIFY | 상단에 SENTINEL_SERVICE 라우터 추가 |
| A5 | Railway Dashboard | INFRA | sentinel-br 서비스 생성 + 환경변수 |
| A6 | Railway Dashboard | INFRA | sentinel-crawl에 SENTINEL_SERVICE=crawl 추가 |

### Phase B: PD Followup 제거

| # | 파일 | Action |
|---|------|--------|
| B1 | `crawler/src/pd-followup/*` | DELETE (4 files) |
| B2 | `crawler/src/index.ts` | MODIFY (PD import/init 제거) |
| B3 | `crawler/src/api/sentinel-client.ts` | MODIFY (PD 메서드 제거) |
| B4 | `src/app/api/crawler/pd-followup-pending/route.ts` | DELETE |
| B5 | `src/app/api/crawler/pd-followup-result/route.ts` | DELETE |

### Phase C: 헬스 모니터

| # | 파일 | Action |
|---|------|--------|
| C1 | `vercel.json` | MODIFY (cron 추가) |
| C2 | `src/app/api/ops/health-monitor/route.ts` | NEW |
| C3 | `src/lib/ops/railway-api.ts` | NEW (Railway API 클라이언트) |
| C4 | Vercel Dashboard | INFRA (환경변수) |

### Phase D: Google Chat 봇

| # | 파일 | Action |
|---|------|--------|
| D1 | `src/app/api/ops/chat-bot/route.ts` | NEW |
| D2 | Google Cloud Console | INFRA (Chat App 등록) |

---

## 7. Shared Utilities (재사용)

| 유틸리티 | 경로 | 용도 |
|---------|------|------|
| `createHealthServer` | `crawler/src/health.ts` | entry-crawl, entry-br 둘 다 사용 (변경 없음) |
| `createHeartbeatMonitor` | `crawler/src/heartbeat.ts` | 둘 다 사용 (변경 없음) |
| `createSentinelClient` | `crawler/src/api/sentinel-client.ts` | 둘 다 사용 |
| `createChatNotifier` | `crawler/src/notifications/google-chat.ts` | 둘 다 사용 |
| `loadConfig` | `crawler/src/config.ts` | 시그니처만 변경 |
| `log` | `crawler/src/logger.ts` | 변경 없음 |

---

## 8. Verification Plan

### Phase A 검증

```bash
# 1. 로컬 테스트 (crawl 모드)
SENTINEL_SERVICE=crawl pnpm dev  # Crawl 워커만 뜨는지 확인

# 2. 로컬 테스트 (br 모드)
SENTINEL_SERVICE=br pnpm dev  # BR 워커 3개만 뜨는지 확인

# 3. 로컬 테스트 (all 모드 = 롤백)
SENTINEL_SERVICE=all pnpm dev  # 전체 워커 뜨는지 확인

# 4. Railway 배포 후
# - sentinel-crawl: /health → ok, 캠페인 정상
# - sentinel-br: /health → ok, BR submit 정상
# - sentinel-crawl 재시작 → sentinel-br 영향 없음
```

### Phase B 검증

```bash
# typecheck 통과
cd crawler && npx tsc --noEmit

# PD 관련 import 없는지 확인
grep -r "pd-followup\|pdFollowup" crawler/src/ --include="*.ts"
```

### Phase C 검증

```bash
# Vercel Cron 실행 로그 확인
vercel logs --filter="/api/ops/health-monitor"

# 서비스 강제 다운 → 3분 내 자동 재시작 확인
# Google Chat 알림 수신 확인
```

### Phase D 검증

```
# Google Chat에서 테스트
상태        → 두 서비스 상태 표시
재시작 br   → BR 서비스 재시작 + 확인 메시지
재시작 crawl → Crawl 서비스 재시작 + 확인 메시지
```
