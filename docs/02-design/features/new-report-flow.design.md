# New Report Flow — Design

> **Feature**: New Report 프로세스 재설계
> **Created**: 2026-03-16
> **Phase**: Design
> **Plan**: `docs/01-plan/features/new-report-flow.plan.md`

---

## 1. UI 설계

### 1.1 NewReportModal (간소화)

**Before**: ASIN + marketplace + violation type + title + seller + note + screenshot
**After**: ASIN + marketplace만

```
┌─────────────────────────────────────┐
│  New Report                      X  │
├─────────────────────────────────────┤
│                                     │
│  ASIN *                             │
│  ┌─────────────────────────────┐    │
│  │ B0XXXXXXXXX                 │    │
│  └─────────────────────────────┘    │
│                                     │
│  Marketplace *                      │
│  ┌─────────────────────────────┐    │
│  │ US (amazon.com)           ▼ │    │
│  └─────────────────────────────┘    │
│                                     │
│  ⚠️ 이 ASIN은 신고가 되어            │  ← 중복 경고 (조건부)
│     모니터링 상태입니다 (#27020).    │
│     그래도 새로 만들까요?            │
│                                     │
│           [Cancel]  [Create Draft]  │
└─────────────────────────────────────┘
```

**동작 흐름:**
1. ASIN 입력 → 실시간 중복 체크 (debounce 500ms)
2. 중복 발견 시 경고 표시 (status + 링크)
3. Create Draft → API 호출 → Draft 생성 + 크롤링 트리거
4. 생성 완료 → `/reports/{id}` 상세 페이지로 이동

### 1.2 중복 경고 UI

| 상태 | 메시지 | 동작 |
|:--|:--|:--|
| `resolved`, `archived` | 표시 안 함 | 바로 생성 |
| `draft` | "이 ASIN은 작성 중인 신고서가 있습니다 (#12345). 그래도 새로 만들까요?" | 경고 + 생성 허용 |
| `pending_review`, `approved` | "이 ASIN은 승인 대기 중입니다 (#12345). 그래도 새로 만들까요?" | 경고 + 생성 허용 |
| `monitoring`, `br_submitting` | "이 ASIN은 신고가 되어 모니터링 상태입니다 (#12345). 그래도 새로 만들까요?" | 경고 + 생성 허용 |

### 1.3 Draft 상세 페이지 — 크롤링 상태 영역

기존 리포트 상세 상단에 크롤링 상태 바 추가:

```
┌─────────────────────────────────────────────────┐
│ 🔄 상품 정보 수집 중...                [Refresh] │  ← fetching
├─────────────────────────────────────────────────┤
│ ✅ 상품 정보 수집 완료                 [Refresh] │  ← completed
├─────────────────────────────────────────────────┤
│ ❌ 수집 실패 — 수동 입력 가능          [Refresh] │  ← failed
├─────────────────────────────────────────────────┤
│ ⏳ 3분 후 다시 시도 가능                         │  ← cooldown
└─────────────────────────────────────────────────┘
```

---

## 2. API 설계

### 2.1 POST /api/reports/manual (수정)

**Request (간소화):**
```ts
{
  asin: string         // 필수
  marketplace?: string // 기본 'US'
}
```

**Response:**
```ts
{
  report_id: string
  listing_id: string
  is_new_listing: boolean
  fetch_requested: boolean  // sentinel-fetch 트리거 여부
  duplicate_warning?: {     // 중복 경고 정보
    report_id: string
    status: string
    report_number: number
  }
}
```

**서버 로직:**
1. listings 조회/생성
2. listing_snapshot 채우기 (있는 정보로)
3. Draft INSERT (listing_id, listing_snapshot, status: 'draft')
4. sentinel-fetch에 크롤링 요청 (정보 누락 시)
5. Response

### 2.2 GET /api/reports/check-duplicate (신규)

ASIN 입력 시 실시간 중복 체크용.

**Request:** `?asin=B0XXX&marketplace=US`

**Response:**
```ts
{
  exists: boolean
  reports?: {
    id: string
    status: string
    report_number: number
  }[]
}
```

### 2.3 POST /api/reports/{id}/refresh-listing (신규)

리프레시 버튼 클릭 시 크롤링 재요청.

**Request:** `{}` (report_id는 URL에서)

**Response:**
```ts
{
  ok: boolean
  cooldown_until?: string  // ISO, 쿨다운 중이면
}
```

**서버 로직:**
1. 마지막 fetch 시간 확인 → 5분 이내면 cooldown 응답
2. sentinel-fetch에 크롤링 요청
3. listings.fetch_status = 'fetching' 업데이트

### 2.4 GET /api/listings/{id}/fetch-status (신규)

Draft 상세에서 polling용.

**Response:**
```ts
{
  status: 'idle' | 'fetching' | 'completed' | 'failed'
  last_fetched_at?: string
  error?: string
}
```

---

## 3. sentinel-fetch 서비스 설계

### 3.1 아키텍처

```
[Sentinel Web]
    ↓ POST /fetch
[sentinel-fetch (Railway)]
    ↓ Bright Data Browser API
[Amazon Product Page]
    ↓ 파싱
[Supabase listings 업데이트]
```

### 3.2 서비스 구조

```
sentinel-fetch/
├── src/
│   ├── index.ts          # Express 서버 + health check
│   ├── fetch-handler.ts  # POST /fetch 핸들러
│   ├── scraper.ts        # Bright Data 연결 + 상품 페이지 파싱
│   └── config.ts         # 환경변수
├── Dockerfile
├── package.json
└── tsconfig.json
```

### 3.3 POST /fetch API

**Request:**
```ts
{
  listing_id: string
  asin: string
  marketplace: string  // 'US', 'JP' 등
}
```

**동작:**
1. Bright Data Browser API로 아마존 상품 페이지 접속
2. 상품 정보 파싱:
   - title, seller_name, brand, price_amount, price_currency
   - images (배열), bullet_points, description
   - rating, review_count
3. Supabase listings 테이블 업데이트
4. listing_snapshot이 있는 reports도 업데이트
5. listings.fetch_status = 'completed' (또는 'failed')

**인증:** `x-service-token` 헤더 (기존 crawler와 동일 패턴)

### 3.4 Railway 배포

| 항목 | 값 |
|:--|:--|
| 서비스명 | `sentinel-fetch` |
| 프로젝트 | `lovely-magic` (기존) |
| Dockerfile | `sentinel-fetch/Dockerfile` |
| 환경변수 | `BRIGHTDATA_BROWSER_WS`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SERVICE_TOKEN` |
| 헬스체크 | `GET /health` |

---

## 4. DB 스키마 변경

### 4.1 listings 테이블 — 컬럼 추가

```sql
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS fetch_status text DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS last_fetched_at timestamptz,
  ADD COLUMN IF NOT EXISTS fetch_error text;
```

`fetch_status`: `idle` | `fetching` | `completed` | `failed`

### 4.2 기존 listing_snapshot 누락 데이터 백필

기존 reports 중 `listing_snapshot`이 null인 건에 대해 listings 데이터로 채우기:

```sql
UPDATE reports r
SET listing_snapshot = jsonb_build_object(
  'asin', l.asin,
  'title', l.title,
  'marketplace', l.marketplace,
  'seller_name', l.seller_name
)
FROM listings l
WHERE r.listing_id = l.id
  AND r.listing_snapshot IS NULL;
```

---

## 5. 시퀀스 다이어그램

### 5.1 New Report 생성

```
User          Modal           Web API         sentinel-fetch     Supabase
 │              │                │                  │               │
 │─ ASIN 입력 ──│                │                  │               │
 │              │─ check-dup ───→│                  │               │
 │              │←── result ─────│                  │               │
 │              │ (경고 표시)     │                  │               │
 │─ Create ────→│                │                  │               │
 │              │─ POST manual ─→│                  │               │
 │              │                │─ INSERT listing ─────────────────→│
 │              │                │─ INSERT draft ───────────────────→│
 │              │                │─ POST /fetch ───→│               │
 │              │←── report_id ──│                  │               │
 │←─ 상세이동 ──│                │                  │               │
 │              │                │                  │─ scrape ─────→│
 │              │                │                  │←── data ──────│
 │              │                │                  │─ UPDATE ──────→│
 │  (polling)   │                │                  │               │
 │─ fetch-status ───────────────→│                  │               │
 │←── completed ─────────────────│                  │               │
 │  (UI 갱신)   │                │                  │               │
```

### 5.2 리프레시

```
User          Draft Detail    Web API         sentinel-fetch     Supabase
 │              │                │                  │               │
 │─ Refresh ───→│                │                  │               │
 │              │─ POST refresh ─→│                  │               │
 │              │                │─ cooldown 체크 ──────────────────→│
 │              │                │  (5분 이내면 거절)│               │
 │              │                │─ POST /fetch ───→│               │
 │              │                │─ fetching 상태 ──────────────────→│
 │              │←── ok ─────────│                  │               │
 │  (polling)   │                │                  │─ scrape ─────→│
 │              │                │                  │─ UPDATE ──────→│
 │─ fetch-status ───────────────→│                  │               │
 │←── completed ─────────────────│                  │               │
```

---

## 6. 구현 순서

| Step | 내용 | 의존성 |
|:--|:--|:--|
| **D1** | DB 마이그레이션 (fetch_status 컬럼 + 백필) | 없음 |
| **D2** | sentinel-fetch 서비스 생성 + Railway 배포 | D1 |
| **D3** | NewReportModal 간소화 + check-duplicate API | 없음 |
| **D4** | POST /api/reports/manual 수정 → sentinel-fetch 트리거 | D2 |
| **D5** | Draft 상세 크롤링 상태 바 + polling + refresh API | D2 |
| **D6** | E2E 테스트 | D3~D5 |
