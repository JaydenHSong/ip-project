# Crawler Download UI Design Document

> **Feature**: crawler-download-ui
> **Plan**: `docs/01-plan/features/crawler-download-ui.plan.md`
> **Date**: 2026-03-04
> **Status**: Draft

---

## 1. Implementation Items

| # | Item | File | Type |
|---|------|------|------|
| 1 | Crawler Status API Route | `src/app/api/settings/crawler-status/route.ts` | New |
| 2 | Crawler Config Download API | `src/app/api/settings/crawler-download/route.ts` | New |
| 3 | CrawlerSettings UI Component | `src/app/(protected)/settings/CrawlerSettings.tsx` | New |
| 4 | SettingsContent Tab 추가 | `src/app/(protected)/settings/SettingsContent.tsx` | Modify |
| 5 | i18n EN 번역 | `src/lib/i18n/locales/en.ts` | Modify |
| 6 | i18n KO 번역 | `src/lib/i18n/locales/ko.ts` | Modify |
| 7 | CRAWLER_HEALTH_URL 환경변수 | `.env.local` | Modify |

---

## 2. API Design

### 2.1 GET `/api/settings/crawler-status`

크롤러 `/health` 엔드포인트를 프록시 호출.

```typescript
// Auth: withAuth(['admin'])
// Response:
type CrawlerStatusResponse = {
  connected: boolean
  status: 'ok' | 'degraded' | 'error' | 'disconnected'
  uptime: number | null          // seconds
  redis: boolean | null
  worker: boolean | null
  timestamp: string | null
  url: string | null             // masked URL (도메인만)
  error?: string                 // 연결 실패 시 에러 메시지
}
```

**로직:**
1. `CRAWLER_HEALTH_URL` 환경변수 확인 → 없으면 `{ connected: false, status: 'disconnected' }`
2. `fetch(url + '/health', { signal: AbortSignal.timeout(3000) })`
3. 성공 → health 데이터 반환, 실패 → `{ connected: false, status: 'error', error: message }`

### 2.2 GET `/api/settings/crawler-download?file=env|docker`

설정 파일 다운로드.

```typescript
// Auth: withAuth(['admin'])
// Query: file = 'env' | 'docker'
// Response: text/plain (Content-Disposition: attachment)
```

**file=env**: `.env.example` 내용을 동적으로 생성 (실제 비밀값 제외)
```
SENTINEL_API_URL=https://ip-project-khaki.vercel.app
SENTINEL_SERVICE_TOKEN=<your-service-token>
REDIS_URL=redis://default:xxx@your-redis:6379
BRIGHTDATA_PROXY_HOST=brd.superproxy.io
BRIGHTDATA_PROXY_PORT=22225
BRIGHTDATA_PROXY_USER=<your-username>
BRIGHTDATA_PROXY_PASS=<your-password>
CRAWLER_CONCURRENCY=3
```

**file=docker**: 정적 `docker-compose.yml` 반환

---

## 3. Component Design

### 3.1 CrawlerSettings.tsx

```
Props: { isAdmin: boolean }
State:
  - status: CrawlerStatusResponse | null
  - loading: boolean
  - refreshing: boolean

Sections:
  ┌─────────────────────────────────────────────────┐
  │ Card: Crawler Status                            │
  │ ┌─────────────────────────────────────────────┐ │
  │ │ StatusBadge   [Refresh Button]              │ │
  │ │                                             │ │
  │ │ URL:     sentinel-crawler-prod...  (masked) │ │
  │ │ Uptime:  2h 34m                             │ │
  │ │ Redis:   Connected ✓                        │ │
  │ │ Worker:  Running ✓                          │ │
  │ └─────────────────────────────────────────────┘ │
  │                                                 │
  │ Card: Setup & Download                          │
  │ ┌─────────────────────────────────────────────┐ │
  │ │ Step 1. Download configuration files        │ │
  │ │ [Download .env.example] [Download docker..] │ │
  │ │                                             │ │
  │ │ Step 2. Configure environment variables     │ │
  │ │ (code block with required vars list)        │ │
  │ │                                             │ │
  │ │ Step 3. Deploy                              │ │
  │ │ Railway: railway up                         │ │
  │ │ Docker:  docker compose up -d              │ │
  │ └─────────────────────────────────────────────┘ │
  └─────────────────────────────────────────────────┘
```

### 3.2 Status Badge Colors

| Status | Color | Label (EN) | Label (KO) |
|--------|-------|-----------|-----------|
| ok | `bg-green-500` | Connected | 연결됨 |
| degraded | `bg-yellow-500` | Degraded | 불안정 |
| error | `bg-red-500` | Error | 에러 |
| disconnected | `bg-gray-400` | Not Connected | 미연결 |

### 3.3 Uptime 포맷

```typescript
// seconds → "2h 34m" 또는 "5m 12s" 또는 "< 1m"
const formatUptime = (seconds: number): string => {
  if (seconds < 60) return '< 1m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
```

---

## 4. SettingsContent 수정

```typescript
// ADMIN_TABS에 'crawler' 추가
const ADMIN_TABS = ['monitoring', 'crawler', 'sc-automation', 'auto-approve', 'templates', 'users'] as const
type SettingsTab = 'monitoring' | 'crawler' | 'sc-automation' | 'auto-approve' | 'templates' | 'users'

// Tab label
tab === 'crawler' ? t('settings.crawler.title') : ...

// Tab content
{activeTab === 'crawler' && <CrawlerSettings isAdmin={isAdmin} />}
```

---

## 5. i18n Keys

```typescript
// settings.crawler
{
  title: 'Crawler',
  status: {
    title: 'Crawler Status',
    connected: 'Connected',
    degraded: 'Degraded',
    error: 'Error',
    disconnected: 'Not Connected',
    notConfigured: 'Crawler URL not configured',
    refresh: 'Refresh',
    uptime: 'Uptime',
    redis: 'Redis',
    worker: 'Worker',
    url: 'URL',
  },
  setup: {
    title: 'Setup & Download',
    step1: 'Step 1. Download configuration files',
    step2: 'Step 2. Configure environment variables',
    step3: 'Step 3. Deploy',
    downloadEnv: 'Download .env.example',
    downloadDocker: 'Download docker-compose.yml',
    envGuide: 'Set the following environment variables:',
    deployRailway: 'Railway: railway up',
    deployDocker: 'Docker: docker compose up -d',
  },
}
```

---

## 6. Environment Variable

```
# .env.local에 추가
CRAWLER_HEALTH_URL=https://sentinel-crawler-production.up.railway.app
```

---

## 7. Implementation Order

1. `.env.local`에 `CRAWLER_HEALTH_URL` 추가
2. `crawler-status/route.ts` API 생성
3. `crawler-download/route.ts` API 생성
4. `CrawlerSettings.tsx` 컴포넌트 생성
5. `SettingsContent.tsx` 수정 (crawler 탭 추가)
6. i18n `en.ts`, `ko.ts` 번역 추가
7. typecheck 확인
