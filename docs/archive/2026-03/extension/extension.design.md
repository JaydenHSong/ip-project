# Design: Sentinel Chrome Extension

> **Feature**: Chrome Extension (Manifest V3)
> **Plan Reference**: `docs/01-plan/features/extension.plan.md`
> **Version**: 1.0
> **Created**: 2026-03-01
> **Status**: Draft

---

## 1. Overview

Spigen 오퍼레이터(20명+)가 아마존 상품 페이지에서 위반 리스팅을 원클릭으로 제보하는 Chrome Extension.
Manifest V3 기반, Vite 빌드, TypeScript, Supabase Auth (Google OAuth @spigen.com).

### Scope

| In Scope (MS1) | Out of Scope (MS2) |
|-----------------|-------------------|
| Manifest V3 + 빌드 환경 | AI 분석 미리보기 |
| Content Script (DOM 파싱 + 플로팅 버튼) | 중복 ASIN 체크 |
| Popup UI (위반 유형 선택 + 메모) | 내 제보 상태 목록 |
| Service Worker (Auth + API + 스크린샷) | 버전 업데이트 알림 |
| Sentinel Web API 연동 (listings + reports) | |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│ Chrome Extension (Manifest V3)                  │
│                                                 │
│  ┌────────────────┐   ┌───────────────────────┐ │
│  │ Content Script  │   │ Popup                 │ │
│  │ (amazon.com)    │   │                       │ │
│  │                 │   │ ┌───────────────────┐ │ │
│  │ - DOM 파싱      │   │ │ Login View        │ │ │
│  │ - ASIN 추출     │───│ │ (Google OAuth)    │ │ │
│  │ - 플로팅 버튼    │   │ ├───────────────────┤ │ │
│  │                 │   │ │ Report Form View  │ │ │
│  └────────────────┘   │ │ - 위반 유형 선택   │ │ │
│                        │ │ - 메모 입력        │ │ │
│                        │ │ - 제출 버튼        │ │ │
│                        │ ├───────────────────┤ │ │
│                        │ │ Success View      │ │ │
│                        │ │ - 결과 + 링크     │ │ │
│                        │ └───────────────────┘ │ │
│                        └───────────────────────┘ │
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │ Service Worker (Background)                  ││
│  │ - Supabase Auth 세션 관리                     ││
│  │ - API 통신 (JWT Bearer)                       ││
│  │ - chrome.tabs.captureVisibleTab()             ││
│  │ - Badge/알림 관리                             ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
                    │ HTTPS + JWT
                    ▼
┌──────────────────────────────────────────────────┐
│ Sentinel Web API                                 │
│ POST /api/ext/submit-report                      │
│ GET  /api/ext/auth-status                        │
└──────────────────────────────────────────────────┘
```

### 통신 흐름

```
1. 오퍼레이터가 아마존 페이지 방문
2. Content Script → DOM 파싱 → 페이지 데이터 추출
3. 플로팅 버튼 클릭 → Popup 오픈
4. Popup → chrome.runtime.sendMessage → Service Worker
5. Service Worker:
   a. Auth 확인 (Supabase JWT)
   b. captureVisibleTab() → 스크린샷 Base64
   c. POST /api/ext/submit-report (JWT + 데이터 + 스크린샷)
6. API 응답 → Popup에 결과 표시
```

---

## 3. File Structure

```
extension/
  manifest.json
  vite.config.ts
  package.json
  tsconfig.json
  src/
    content/
      index.ts                 # Content Script 엔트리
      parser.ts                # 아마존 DOM 파서
      floating-button.ts       # 플로팅 버튼 DOM 삽입
      styles.css               # Content Script 스타일 (Shadow DOM)
    popup/
      popup.html               # Popup 엔트리 HTML
      popup.ts                 # Popup 엔트리 TS
      views/
        LoginView.ts           # 로그인 화면
        ReportFormView.ts      # 위반 신고 폼
        SuccessView.ts         # 제출 성공 화면
        LoadingView.ts         # 로딩 상태
      components/
        ViolationSelector.ts   # 카테고리별 위반 유형 셀렉터
        NoteInput.ts           # 메모 입력 Textarea
        SubmitButton.ts        # 제출 버튼 (로딩 상태)
    background/
      service-worker.ts        # Service Worker 엔트리
      auth.ts                  # Supabase Auth 관리
      api.ts                   # Sentinel API 클라이언트
      screenshot.ts            # 스크린샷 캡처
    shared/
      types.ts                 # 공유 타입 정의
      constants.ts             # 위반 유형 (Web과 동기화)
      messages.ts              # chrome.runtime 메시지 타입
      storage.ts               # chrome.storage 래퍼
  assets/
    icons/
      icon-16.png
      icon-48.png
      icon-128.png
    styles/
      popup.css                # Popup 전역 스타일
```

---

## 4. Manifest V3

```json
{
  "manifest_version": 3,
  "name": "Sentinel - Spigen Brand Protection",
  "version": "1.0.0",
  "description": "Report policy violations on Amazon listings",
  "permissions": [
    "activeTab",
    "storage",
    "identity"
  ],
  "host_permissions": [
    "https://www.amazon.com/*",
    "https://www.amazon.co.uk/*",
    "https://www.amazon.co.jp/*",
    "https://www.amazon.de/*",
    "https://www.amazon.fr/*",
    "https://www.amazon.it/*",
    "https://www.amazon.es/*",
    "https://www.amazon.ca/*"
  ],
  "background": {
    "service_worker": "src/background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "https://www.amazon.com/dp/*",
        "https://www.amazon.com/*/dp/*",
        "https://www.amazon.com/gp/product/*",
        "https://www.amazon.co.uk/dp/*",
        "https://www.amazon.co.uk/*/dp/*",
        "https://www.amazon.co.jp/dp/*",
        "https://www.amazon.co.jp/*/dp/*"
      ],
      "js": ["src/content/index.js"],
      "css": ["src/content/styles.css"]
    }
  ],
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon-16.png",
      "48": "assets/icons/icon-48.png",
      "128": "assets/icons/icon-128.png"
    }
  },
  "icons": {
    "16": "assets/icons/icon-16.png",
    "48": "assets/icons/icon-48.png",
    "128": "assets/icons/icon-128.png"
  }
}
```

### Permissions 근거

| Permission | 사용처 | 이유 |
|------------|--------|------|
| `activeTab` | captureVisibleTab | 현재 탭 스크린샷 (클릭 시에만 활성) |
| `storage` | chrome.storage.local | Auth 토큰, 설정 저장 |
| `identity` | chrome.identity.launchWebAuthFlow | Google OAuth 팝업 |
| `host_permissions` (amazon.*) | Content Script 주입 | DOM 파싱, 플로팅 버튼 |

---

## 5. Component Design

### 5.1 Content Script (`content/`)

#### parser.ts — 아마존 DOM 파서

```typescript
type ParsedPageData = {
  asin: string
  title: string
  seller_name: string | null
  seller_id: string | null
  price_amount: number | null
  price_currency: string
  images: string[]
  bullet_points: string[]
  brand: string | null
  rating: number | null
  review_count: number | null
  url: string
  marketplace: string         // 도메인에서 추출: amazon.com → US
}
```

**셀렉터 전략** (Amazon DOM 변경 대응):

```typescript
// 셀렉터를 별도 객체로 분리 → DOM 변경 시 이 파일만 수정
const SELECTORS = {
  asin: [
    () => document.querySelector<HTMLInputElement>('input[name="ASIN"]')?.value,
    () => window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1],
    () => document.querySelector('[data-asin]')?.getAttribute('data-asin'),
  ],
  title: [
    () => document.querySelector('#productTitle')?.textContent?.trim(),
  ],
  seller: [
    () => document.querySelector('#sellerProfileTriggerId')?.textContent?.trim(),
    () => document.querySelector('#merchant-info a')?.textContent?.trim(),
  ],
  price: [
    () => document.querySelector('.a-price .a-offscreen')?.textContent?.trim(),
    () => document.querySelector('#priceblock_ourprice')?.textContent?.trim(),
  ],
  images: [
    () => Array.from(document.querySelectorAll('#altImages img')).map(
      (img) => (img as HTMLImageElement).src.replace(/\._[^.]+\./, '.')
    ),
  ],
  bulletPoints: [
    () => Array.from(document.querySelectorAll('#feature-bullets li span'))
      .map((el) => el.textContent?.trim())
      .filter(Boolean) as string[],
  ],
} as const
```

**마켓플레이스 감지**:

```typescript
const MARKETPLACE_MAP: Record<string, string> = {
  'www.amazon.com': 'US',
  'www.amazon.co.uk': 'UK',
  'www.amazon.co.jp': 'JP',
  'www.amazon.de': 'DE',
  'www.amazon.fr': 'FR',
  'www.amazon.it': 'IT',
  'www.amazon.es': 'ES',
  'www.amazon.ca': 'CA',
}
```

#### floating-button.ts — 플로팅 버튼

- Shadow DOM으로 격리 (아마존 CSS 간섭 방지)
- 위치: 화면 우하단 (`position: fixed; bottom: 24px; right: 24px`)
- 외형: Spigen orange (#F97316) 원형 버튼, 48x48px, Sentinel 아이콘
- 클릭 → `chrome.runtime.sendMessage({ type: 'OPEN_POPUP' })`
- 아마존 상품 페이지(`/dp/`, `/gp/product/`)에서만 표시

### 5.2 Popup (`popup/`)

#### 화면 흐름

```
[로딩] → Auth 확인
  ├─ 미인증 → [LoginView]
  │            └─ Google 로그인 → Auth 성공 → [ReportFormView]
  └─ 인증됨 → [ReportFormView]
               ├─ 아마존 페이지 아님 → "아마존 상품 페이지에서 사용하세요" 안내
               └─ 아마존 상품 페이지 → 폼 표시
                    └─ 제출 → [LoadingView] → [SuccessView]
```

#### ReportFormView 레이아웃

```
┌─────────────────────────────────────┐
│ Sentinel               [사용자아바타] │  ← 헤더 (16px)
├─────────────────────────────────────┤
│                                     │
│  📦 B07X6C9RMF                      │  ← ASIN (자동 캡처)
│  Spigen Tough Armor Case for...     │  ← 제목 (자동 캡처, 2줄 말줄임)
│  Seller: SomeSellerName             │  ← 판매자 (자동 캡처)
│  🇺🇸 US                              │  ← 마켓플레이스 (자동)
│                                     │
├─────────────────────────────────────┤
│  위반 유형 *                         │
│  ┌─────────────────────────────────┐│
│  │ ▼ 카테고리 선택                  ││  ← 1단계: 카테고리 (5개)
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ ▼ 위반 유형 선택                 ││  ← 2단계: 해당 카테고리 내 유형
│  └─────────────────────────────────┘│
│                                     │
│  메모 (선택)                         │
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  │ 위반 사항을 설명해 주세요...     ││  ← Textarea (4줄)
│  │                                 ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │        🔒 신고 제출              ││  ← Submit 버튼 (primary)
│  └─────────────────────────────────┘│
│                                     │
│  📸 스크린샷이 자동으로 첨부됩니다    │  ← 안내 텍스트
│                                     │
└─────────────────────────────────────┘
```

**팝업 크기**: `width: 360px; min-height: 480px; max-height: 580px`

#### ViolationSelector — 2단계 셀렉트

```typescript
// 1단계: 카테고리 선택
type CategoryOption = {
  value: ViolationCategory
  label: string  // VIOLATION_CATEGORIES[key]
}

// 2단계: 선택된 카테고리의 위반 유형만 필터링
type ViolationOption = {
  value: ViolationCode
  label: string  // e.g. "V01 - 상표권 침해"
  severity: 'high' | 'medium' | 'low'
}
```

카테고리 선택 시 하위 유형 목록이 동적 업데이트. `VIOLATION_GROUPS`를 그대로 사용.

### 5.3 Service Worker (`background/`)

#### auth.ts — Supabase Auth

```typescript
// Google OAuth via chrome.identity
const signInWithGoogle = async (): Promise<Session> => {
  // 1. chrome.identity.launchWebAuthFlow({
  //      url: supabaseUrl + '/auth/v1/authorize?provider=google',
  //      interactive: true
  //    })
  // 2. Redirect URL에서 access_token, refresh_token 추출
  // 3. supabase.auth.setSession({ access_token, refresh_token })
  // 4. 토큰을 chrome.storage.local에 저장
}

const getSession = async (): Promise<Session | null> => {
  // chrome.storage.local에서 토큰 로드 → supabase.auth.getSession()
  // 만료 시 자동 refresh
}

const signOut = async (): Promise<void> => {
  // supabase.auth.signOut() + chrome.storage.local 클리어
}
```

**토큰 저장소**: `chrome.storage.local` (Extension 범위, 브라우저 종료 후에도 유지)

```typescript
// storage 구조
type ExtensionStorage = {
  'auth.access_token': string
  'auth.refresh_token': string
  'auth.user': { id: string; email: string; name: string; avatar_url: string }
  'auth.expires_at': number
}
```

#### api.ts — Sentinel API 클라이언트

```typescript
const API_BASE = 'https://ip-project-khaki.vercel.app/api'

const submitReport = async (data: SubmitReportPayload): Promise<SubmitReportResponse> => {
  const session = await getSession()
  if (!session) throw new AuthError('Not authenticated')

  const response = await fetch(`${API_BASE}/ext/submit-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'X-Extension-Version': chrome.runtime.getManifest().version,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new ApiError(error.error.message, response.status)
  }

  return response.json()
}
```

#### screenshot.ts — 스크린샷 캡처

```typescript
const captureScreenshot = async (): Promise<string> => {
  // chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 80 })
  // → Base64 data URL 반환
  // → 이미지 크기 제한 (최대 2MB, 초과 시 quality 하향)
}
```

### 5.4 Shared (`shared/`)

#### messages.ts — Chrome Runtime 메시지 타입

```typescript
// Content Script → Service Worker
type ContentMessage =
  | { type: 'GET_PAGE_DATA' }
  | { type: 'OPEN_POPUP' }

// Popup → Service Worker
type PopupMessage =
  | { type: 'GET_AUTH_STATUS' }
  | { type: 'SIGN_IN' }
  | { type: 'SIGN_OUT' }
  | { type: 'SUBMIT_REPORT'; payload: SubmitReportPayload }
  | { type: 'GET_PAGE_DATA_FROM_TAB' }

// Service Worker → Popup/Content
type BackgroundResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

// 제보 페이로드 (Popup → Service Worker → API)
type SubmitReportPayload = {
  page_data: ParsedPageData
  violation_type: ViolationCode
  violation_category: ViolationCategory
  note: string
  screenshot_base64: string
}
```

#### storage.ts — chrome.storage 래퍼

```typescript
const storage = {
  get: <K extends keyof ExtensionStorage>(key: K): Promise<ExtensionStorage[K] | null> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => resolve(result[key] ?? null))
    })
  },
  set: <K extends keyof ExtensionStorage>(key: K, value: ExtensionStorage[K]): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve)
    })
  },
  remove: (key: keyof ExtensionStorage): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, resolve)
    })
  },
}
```

---

## 6. API Design (Web 측)

Extension 전용 API 엔드포인트 (기존 Web API에 추가).

### 6.1 POST `/api/ext/submit-report`

Extension에서 제보를 제출하는 단일 엔드포인트. 내부에서 listing 생성 + report 생성을 원자적으로 처리.

**Request**:

```typescript
// Headers
Authorization: Bearer <supabase_jwt>
Content-Type: application/json
X-Extension-Version: "1.0.0"

// Body (= SubmitReportRequest from types/api.ts)
{
  asin: string
  marketplace: string
  title: string
  seller_name?: string
  seller_id?: string
  images?: string[]
  violation_type: ViolationCode
  violation_category: string
  note?: string
  screenshot_base64?: string  // PNG Base64 (최대 2MB)
}
```

**Response (200)**:

```typescript
{
  report_id: string
  listing_id: string
  is_duplicate: boolean   // 동일 ASIN 기존 신고 존재 여부
}
```

**서버 처리 흐름**:

```
1. JWT 검증 → 사용자 확인 (@spigen.com)
2. ASIN으로 기존 listing 조회
   ├─ 있으면: 기존 listing_id 사용
   └─ 없으면: listings 테이블에 INSERT (source = 'extension')
3. reports 테이블에 INSERT (status = 'draft')
4. screenshot_base64가 있으면:
   a. Supabase Storage에 업로드 (screenshots/{report_id}.png)
   b. report.screenshot_url 업데이트
5. is_duplicate = 동일 ASIN의 active report 존재 여부
6. 응답 반환
```

**파일**: `src/app/api/ext/submit-report/route.ts`

### 6.2 GET `/api/ext/auth-status`

Extension에서 현재 인증 상태를 확인하는 엔드포인트.

**Response (200)**:

```typescript
{
  authenticated: boolean
  user: {
    id: string
    email: string
    name: string
    role: string
  } | null
}
```

**파일**: `src/app/api/ext/auth-status/route.ts`

---

## 7. Build Configuration

### vite.config.ts

```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        content: resolve(__dirname, 'src/content/index.ts'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
})
```

### package.json

```json
{
  "name": "sentinel-extension",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "typescript": "^5.7.0",
    "@anthropic-ai/sdk": "^0.40.0",
    "@types/chrome": "^0.0.300"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.50.0"
  }
}
```

---

## 8. Security Design

### 8.1 인증

| 항목 | 설계 |
|------|------|
| OAuth Provider | Google (@spigen.com 도메인 한정) |
| OAuth Flow | `chrome.identity.launchWebAuthFlow` → Supabase Auth |
| Token Storage | `chrome.storage.local` (Extension 범위) |
| Token Refresh | 만료 5분 전 자동 갱신 |
| Logout | 토큰 제거 + Supabase signOut |

### 8.2 통신 보안

| 항목 | 설계 |
|------|------|
| Protocol | HTTPS only (TLS 1.3) |
| Auth Header | `Authorization: Bearer <jwt>` |
| CORS | Sentinel Web 도메인만 허용 |
| Origin 검증 | `chrome-extension://` + Extension ID 확인 |
| API Rate Limit | Extension당 60 req/min |

### 8.3 Content Script 보안

| 항목 | 설계 |
|------|------|
| DOM 접근 범위 | `host_permissions`: amazon.* 도메인만 |
| CSS 격리 | Shadow DOM (플로팅 버튼) |
| XSS 방어 | DOM 데이터 textContent만 읽음 (innerHTML 미사용) |
| CSP | Manifest V3 기본 CSP (eval 불가) |

### 8.4 데이터 보안

- 스크린샷 Base64: 메모리에서만 유지, 전송 후 즉시 폐기
- Auth 토큰: `chrome.storage.local`에만 저장 (Web localStorage 아님)
- 코드에 API 키/시크릿 하드코딩 금지
- Supabase URL/Anon Key만 Extension에 포함 (Anon Key는 RLS로 보호)

---

## 9. UI/UX Design

### 9.1 스타일 가이드

Sentinel Web과 시각적 일관성을 유지하되, 경량화.

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--accent` | `#F97316` | 주요 버튼, 플로팅 버튼 |
| `--bg-primary` | `#1C1917` | 팝업 배경 (다크) |
| `--bg-card` | `#292524` | 카드 배경 |
| `--text-primary` | `#FAFAF9` | 주요 텍스트 |
| `--text-secondary` | `#A8A29E` | 보조 텍스트 |
| `--border` | `#44403C` | 테두리 |
| `--success` | `#22C55E` | 성공 상태 |
| `--danger` | `#EF4444` | 에러, 위험 |
| `--font` | `Inter, system-ui, sans-serif` | 전체 폰트 |
| `--radius` | `8px` | 모서리 반경 |

### 9.2 상태별 아이콘 배지

| 상태 | Badge | 색상 |
|------|-------|------|
| 기본 (미인증) | 없음 | — |
| 인증됨 | 없음 | — |
| 제보 성공 | "1" (최근 1시간) | green |
| 에러 | "!" | red |

### 9.3 에러 처리 UI

| 에러 상황 | UI 표시 |
|-----------|---------|
| 미인증 | LoginView + "Google로 로그인" 버튼 |
| 아마존 페이지 아님 | "아마존 상품 페이지에서 사용하세요" + 아이콘 |
| ASIN 파싱 실패 | "상품 정보를 읽을 수 없습니다" + 수동 입력 안내 |
| 네트워크 오류 | "서버 연결 실패. 잠시 후 다시 시도하세요" + 재시도 버튼 |
| JWT 만료 | 자동 갱신 시도 → 실패 시 재로그인 유도 |
| API 에러 (4xx/5xx) | 에러 메시지 표시 + 재시도 버튼 |

---

## 10. Implementation Order (MS1)

### Phase 1: 프로젝트 셋업

| # | 항목 | 파일 |
|---|------|------|
| 1 | `extension/` 디렉토리 + `package.json` + `tsconfig.json` | 프로젝트 초기화 |
| 2 | `vite.config.ts` (멀티 엔트리 빌드) | 빌드 설정 |
| 3 | `manifest.json` (V3) | 매니페스트 |
| 4 | `shared/types.ts` + `shared/constants.ts` + `shared/messages.ts` | 공유 타입 |

### Phase 2: Content Script

| # | 항목 | 파일 |
|---|------|------|
| 5 | `content/parser.ts` — 아마존 DOM 파서 | 셀렉터 기반 파싱 |
| 6 | `content/floating-button.ts` — 플로팅 버튼 (Shadow DOM) | UI 삽입 |
| 7 | `content/index.ts` — 엔트리 (파서 + 버튼 초기화) | 조합 |
| 8 | `content/styles.css` — 플로팅 버튼 스타일 | CSS |

### Phase 3: Service Worker

| # | 항목 | 파일 |
|---|------|------|
| 9 | `shared/storage.ts` — chrome.storage 래퍼 | 유틸 |
| 10 | `background/auth.ts` — Supabase Auth (Google OAuth) | 인증 |
| 11 | `background/screenshot.ts` — captureVisibleTab | 캡처 |
| 12 | `background/api.ts` — Sentinel API 클라이언트 | API 통신 |
| 13 | `background/service-worker.ts` — 메시지 핸들러 | 엔트리 |

### Phase 4: Popup UI

| # | 항목 | 파일 |
|---|------|------|
| 14 | `popup/popup.html` + `assets/styles/popup.css` | HTML + CSS |
| 15 | `popup/views/LoginView.ts` | 로그인 화면 |
| 16 | `popup/views/LoadingView.ts` | 로딩 상태 |
| 17 | `popup/components/ViolationSelector.ts` | 위반 유형 2단계 셀렉트 |
| 18 | `popup/components/NoteInput.ts` + `SubmitButton.ts` | 메모 + 제출 |
| 19 | `popup/views/ReportFormView.ts` | 신고 폼 조합 |
| 20 | `popup/views/SuccessView.ts` | 성공 화면 |
| 21 | `popup/popup.ts` — 뷰 라우터 + 초기화 | 엔트리 |

### Phase 5: Web API

| # | 항목 | 파일 |
|---|------|------|
| 22 | `src/app/api/ext/submit-report/route.ts` | 제보 API |
| 23 | `src/app/api/ext/auth-status/route.ts` | 인증 확인 API |

### Phase 6: 통합 테스트

| # | 항목 |
|---|------|
| 24 | 빌드 (`pnpm build`) → `dist/` 폴더 생성 확인 |
| 25 | Chrome에 로드 (`chrome://extensions` → 개발자 모드) |
| 26 | 아마존 상품 페이지에서 플로팅 버튼 표시 확인 |
| 27 | 팝업 오픈 → 로그인 → 제보 제출 → 성공 화면 확인 |

---

## 11. Dependencies

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@supabase/supabase-js` | ^2.50.0 | Auth + API (Extension에서 직접 사용) |
| `vite` | ^6.0.0 | 빌드 (멀티 엔트리) |
| `typescript` | ^5.7.0 | 타입 안전 |
| `@types/chrome` | ^0.0.300 | Chrome API 타입 |

---

## 12. Shared Constants Strategy

Web (`src/constants/violations.ts`)과 Extension (`extension/src/shared/constants.ts`)이
동일한 위반 유형 데이터를 사용해야 합니다.

**전략: 수동 복사 (Phase 1)**

- Extension `constants.ts`에 Web의 `VIOLATION_TYPES`, `VIOLATION_CATEGORIES`, `VIOLATION_GROUPS`를 복사
- 위반 유형 변경 시 양쪽 동시 업데이트 필요
- 향후 `pnpm workspace` + `packages/shared` 구조로 전환 검토

---

## 13. Testing Strategy

### 수동 테스트 시나리오 (MS1)

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| T1 | 아마존 상품 페이지 방문 | 우하단에 플로팅 버튼 표시 |
| T2 | 비-아마존 페이지 방문 | 플로팅 버튼 미표시 |
| T3 | 플로팅 버튼 클릭 (미인증) | 팝업 → LoginView |
| T4 | Google 로그인 (@spigen.com) | 인증 성공 → ReportFormView |
| T5 | Google 로그인 (비-spigen.com) | 인증 실패 → 에러 메시지 |
| T6 | ASIN/제목/판매자 자동 캡처 확인 | ReportFormView에 데이터 표시 |
| T7 | 위반 유형 선택 (2단계) | 카테고리 → 유형 동적 필터링 |
| T8 | 메모 입력 + 제출 | 로딩 → 성공 화면 |
| T9 | Sentinel Web 신고 대기열 확인 | 제보 도착 (draft 상태) |
| T10 | 네트워크 끊김 상태에서 제출 | 에러 메시지 + 재시도 버튼 |
| T11 | 다국가 마켓플레이스 (amazon.co.uk) | 마켓플레이스 = UK 표시 |

---

## 14. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-01 | Initial design document |

## 15. Related Documents

| Document | Path |
|----------|------|
| Plan | `docs/01-plan/features/extension.plan.md` |
| Project Context | `Sentinel_Project_Context.md` |
| Web Design (archived) | `docs/archive/2026-03/sentinel/sentinel.design.md` |
| API Types | `src/types/api.ts` (SubmitReportRequest/Response) |
| Violations | `src/constants/violations.ts` |
| Listings Type | `src/types/listings.ts` |
| Reports Type | `src/types/reports.ts` |
