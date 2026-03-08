## Status: DONE (Crawler 전환)
## Assigned Session: 2026-03-07 BR Track 구현 세션
## Completed At: 2026-03-07
## Note: Extension content script 접근 불가 → Playwright Crawler 방식으로 전환 완료. crawler/src/br-submit/ 참고. 후속 작업은 BR-DB-SCHEMA → BR-API-ENDPOINTS → BR-APPROVAL-FLOW 순서.

---

# Brand Registry 자동 신고 엔진 구현

## 세션 시작 명령어

```bash
# 1. 이 지시서 읽기
cat docs/01-plan/tasks/SESSION-BRIEF-BR-AUTO-REPORTER.md

# 2. 기존 코드 파악 (참고용)
cat extension/src/content/sc-form-filler.ts
cat extension/src/content/front-auto-reporter.ts
cat extension/src/shared/messages.ts
cat extension/src/background/service-worker.ts
cat extension/manifest.json

# 3. BR 페이지 캡처 데이터 확인
ls /tmp/br-deep/
cat /tmp/br-deep/01-page1-elements.json

# 4. 엑셀 템플릿 확인 (경로)
# /Users/hoon/Downloads/AI Report Automation – Templates & Manual.xlsx

# 5. 작업 시작 후 검증
cd extension && pnpm typecheck && pnpm build
```

## Developer Persona

너는 **Kai** — 시니어 풀스택 엔지니어.
Chrome Extension (Manifest V3), Playwright, iframe 조작, 웹 자동화에 깊은 전문성을 가지고 있다.
Amazon 내부 웹앱의 커스텀 웹 컴포넌트(`KAT-*` 태그) 구조를 다뤄본 경험이 있으며,
cross-origin iframe 내부 DOM 접근의 제약과 우회 패턴을 정확히 이해한다.
코드는 간결하고, 에러 핸들링은 실전적이며, 불필요한 추상화를 하지 않는다.

---

## 배경

Sentinel Extension은 현재 두 가지 경로로 위반 신고를 수행한다:

1. **SC Track** — Seller Central RAV 페이지에서 폼 자동 채우기 (`sc-content.js`)
2. **Front Track** — Amazon 상품 페이지 "Report an issue" 자동 클릭 (`front-auto-reporter.ts`)

**문제:** 실제 Spigen 팀이 가장 많이 사용하는 신고 경로는 위 두 가지가 아니라 **Amazon Brand Registry (BR) "Contact brand support"** 폼이다. 현재 이 경로는 자동화되어 있지 않아 수동으로 신고하고 있다.

## 목표

**Brand Registry 자동 신고 엔진 (`br-content.js`)을 구현하여 3-Track 신고 체계를 완성한다.**

```
신고 제출 시 3-Track 병렬 실행:
  1. SC Track   — Seller Central RAV 폼 자동 채우기 (기존)
  2. Front Track — Amazon 상품 페이지 "Report an issue" (기존)
  3. BR Track   — Brand Registry Contact Support 폼 자동 채우기 (신규 ★)
```

---

## 시작점

### 코드 구조
- `extension/src/content/sc-form-filler.ts` — SC Track 참고 (동일 패턴)
- `extension/src/content/front-auto-reporter.ts` — Front Track 참고
- `extension/src/shared/messages.ts` — 메시지 타입 정의
- `extension/src/background/service-worker.ts` — 메시지 라우터 + Track 트리거
- `extension/manifest.json` — content_scripts, host_permissions

### 참고 자료
- `/tmp/br-deep/` — BR 페이지 캡처 (스크린샷 + DOM 요소 JSON)
- `/Users/hoon/Downloads/AI Report Automation – Templates & Manual.xlsx` — 신고 템플릿 (5시트)
- `src/constants/front-report-paths.ts` — Front Track 경로 매핑 참고

---

## BR 페이지 구조 (핵심)

### URL
```
https://brandregistry.amazon.com/cu/contact-us?serviceId=SOA
```

### 네비게이션 경로
```
로그인 후 홈 → Support (상단 메뉴) → Contact brand support
→ 좌측 트리 메뉴: "Report a store policy violation" (펼치기)
  → "Other policy violations"      ← 가장 많이 사용
  → "Incorrect variation"
  → "Product review violation"
  → "Product not as described"
```

### DOM 구조 (중요!)
```
메인 프레임
  ├── 상단 네비게이션 바 (brand-registry-header)
  ├── 좌측 트리 메뉴 (KAT-LIST 웹 컴포넌트, class="cu-tree-browseTree-*")
  │   └── LI[role="listitem"][class="cu-tree-browseTree-ctExpander-type"]
  │       → 클릭하면 우측 iframe에 폼 로드
  └── 우측 콘텐츠 영역
      └── ★ iframe-2 (role="presentation") ← 폼이 여기 안에 있음!
          ├── SELECT[name="locale"] — 언어 (English 고정)
          ├── Subject — 읽기 전용 (메뉴 선택에 따라 자동 채워짐)
          ├── TEXTAREA — 위반 설명 (필수*)
          ├── TEXTAREA — URL(s) (필수*, 줄바꿈 구분, 최대 10개)
          ├── INPUT — Seller storefront URL (선택적)
          ├── INPUT — Amazon policy URL (선택적)
          ├── INPUT — ASIN(s) (Product review에서만)
          ├── INPUT — Order ID (Product review에서만, 선택적)
          ├── Contact method — Email (자동: au@spigen.com)
          └── BUTTON — Send
```

### 3개 폼 타입별 필드 차이

| 필드 | Other policy | Incorrect variation | Product review |
|------|:-----------:|:-------------------:|:--------------:|
| Subject | 자동 | 자동 | 자동 |
| 위반 설명* | ✅ | ✅ | ✅ |
| URL(s)* (10개) | ✅ | ✅ | ✅ |
| Seller storefront URL | ✅ | ❌ | ❌ |
| Amazon policy URL | ✅ | ❌ | ❌ |
| ASIN(s)* | ❌ | ❌ | ✅ |
| Order ID | ❌ | ❌ | ✅ (선택) |
| Email | 자동 | 자동 | 자동 |

---

## 구현 태스크

### Task 1: manifest.json 수정

```jsonc
// host_permissions에 추가
"https://brandregistry.amazon.com/*"

// content_scripts에 추가
{
  "matches": ["https://brandregistry.amazon.com/cu/contact-us*"],
  "js": ["br-content.js"],
  "run_at": "document_idle",
  "all_frames": true   // ★ iframe 안에서도 실행하기 위해 필수
}
```

**주의:** `all_frames: true`를 설정해도 cross-origin iframe에는 content script가 자동 주입되지 않을 수 있다. 이 경우 `chrome.scripting.executeScript`로 동적 주입 필요.

### Task 2: BR Content Script 구현

**파일:** `extension/src/content/br-form-filler.ts`

**핵심 로직:**
1. `brandregistry.amazon.com/cu/contact-us` 페이지 감지
2. Service Worker로부터 `EXECUTE_BR_REPORT` 메시지 수신
3. 좌측 트리 메뉴에서 위반 유형에 맞는 항목 클릭
   - `LI.cu-tree-browseTree-ctExpander-type` 요소를 텍스트로 찾기
   - 상위 "Report a store policy violation" 펼치기 먼저 확인
4. iframe-2 로드 대기 (MutationObserver 또는 polling)
5. iframe 내부 DOM 접근하여 폼 채우기
6. Send 버튼 클릭
7. 결과를 Service Worker에 보고

**iframe 접근 전략:**
```
전략 A: all_frames: true → iframe 안에서 content script 직접 실행
전략 B: 메인 프레임에서 iframe contentDocument 접근 (same-origin일 때만)
전략 C: chrome.scripting.executeScript({ frameIds: [frameId] })
```
→ 먼저 A를 시도, 안 되면 C로 폴백. brandregistry.amazon.com의 iframe이 same-origin인지 확인 필요.

**폼 채우기 셀렉터 (iframe 내부):**
```typescript
// Label 텍스트로 연결된 input/textarea 찾기
// KAT-* 웹 컴포넌트 내부이므로 Shadow DOM 가능성 있음
// 실제 DOM 구조는 /tmp/br-deep/*-elements.json 참고

// 위반 설명
const descLabel = 'Describe which Amazon policy is being violated'  // Other policy
const descLabel2 = 'Describe what makes the product an incorrect variation' // Variation
const descLabel3 = 'Describe the review policy violation' // Review

// URL(s)
const urlLabel = 'Provide up to 10 URL(s)'

// Seller storefront URL
const storefrontLabel = 'Provide the seller storefront URL'

// Policy URL
const policyUrlLabel = 'Provide the URL to the specific Amazon policy'

// ASIN(s) — Product review only
const asinLabel = 'List up to 10 ASIN(s)'

// Order ID — Product review only
const orderIdLabel = 'order ID for your purchase'
```

### Task 3: 메시지 타입 추가

**파일:** `extension/src/shared/messages.ts`

```typescript
// Service Worker → Content Script (BR auto-report)
export type BrReportMessage = {
  type: 'EXECUTE_BR_REPORT'
  reportId: string
  violationType: 'other_policy' | 'incorrect_variation' | 'product_review' | 'product_not_as_described'
  description: string        // AI 생성 신고문
  productUrls: string[]      // 최대 10개
  sellerStorefrontUrl?: string
  policyUrl?: string
  asins?: string[]            // Product review용
  orderId?: string            // Product review용
}

// Content Script → Service Worker (BR report result)
export type BrReportResultMessage = {
  type: 'BR_REPORT_RESULT'
  reportId: string
  success: boolean
  durationMs: number
  error?: string
}
```

### Task 4: Service Worker에 BR Track 트리거 추가

**파일:** `extension/src/background/service-worker.ts`

`handleSubmitReport` 또는 별도 트리거에서:
1. BR Track 대상 위반 유형인지 확인
2. `brandregistry.amazon.com/cu/contact-us*` 탭 찾기 (또는 새 탭 열기)
3. `EXECUTE_BR_REPORT` 메시지 전송
4. 결과 수신 → badge 표시 + storage 저장

### Task 5: V01~V19 → BR 폼 타입 매핑

**파일:** `extension/src/shared/br-report-config.ts`

엑셀 시트 기반 매핑:
```typescript
const BR_VIOLATION_MAP: Record<string, BrFormType | null> = {
  // IP — BR "Report a violation" (RAV) 경로, 이 엔진 대상 아님
  V01: null, V02: null, V03: null,

  // Counterfeit — Other policy violations
  V04: 'other_policy',

  // Listing Content
  V05: 'other_policy',        // False Advertising
  V06: 'other_policy',        // Prohibited Keywords
  V07: 'other_policy',        // Inaccurate Product Info (= "Product not as described" 가능)
  V08: 'other_policy',        // Image Policy → Main image violation
  V09: 'other_policy',        // Comparative Advertising
  V10: 'incorrect_variation',  // Variation Policy Violation

  // Review
  V11: 'product_review',      // Review Manipulation
  V12: 'product_review',      // Review Hijacking

  // Selling Practice
  V13: 'other_policy',        // Price Manipulation
  V14: 'other_policy',        // Resale Violation
  V15: 'other_policy',        // Bundling Violation (or incorrect_variation)

  // Regulatory
  V16: 'other_policy',        // Missing Certification
  V17: 'other_policy',        // Safety Standards
  V18: 'other_policy',        // Missing Warning Label
  V19: 'other_policy',        // Import Regulation
}
```

### Task 6: Vite 빌드 설정

**파일:** `extension/vite.config.ts`

`br-content.js` 엔트리 추가 (sc-content.js와 동일 패턴)

---

## 엑셀 템플릿 → AI 프롬프트 연동 (후속 작업)

현재 엑셀에 있는 신고 템플릿 (Variation 15종, Main image 13종, Product review 5종 등)은 AI가 상황에 맞게 선택하고 placeholder를 채운 후 BR 폼에 넣어야 한다.

이 작업은 별도 세션에서:
1. 엑셀 템플릿 → DB 또는 상수로 이관
2. AI draft 생성 시 BR용 description 필드 추가
3. Report에 `br_submit_data` 컬럼 추가

---

## 끝점 (완료 조건)

- [ ] `brandregistry.amazon.com` 이 manifest에 추가됨
- [ ] `br-content.js` 가 BR contact-us 페이지에서 자동 실행됨
- [ ] 좌측 메뉴 자동 네비게이션 (3개 폼 타입 모두)
- [ ] iframe 내부 폼 자동 채우기 (설명, URL, storefront, ASIN 등)
- [ ] Send 버튼 자동 클릭 + 결과 감지
- [ ] Service Worker에서 BR Track 트리거 동작
- [ ] V01~V19 → BR 폼 타입 매핑 완료
- [ ] Extension 빌드 성공 (`pnpm build` in extension/)
- [ ] 타입체크 통과 (`pnpm typecheck`)
- [ ] 실제 BR 페이지에서 테스트 (수동 확인 — Send 직전에 멈추는 dry-run 모드 포함)

---

## 리스크 & 주의사항

1. **iframe cross-origin 문제** — BR의 contact-us 폼 iframe이 다른 origin이면 contentDocument 접근 불가. `all_frames: true` + `chrome.scripting.executeScript`로 해결
2. **KAT-* 웹 컴포넌트** — Shadow DOM 내부에 폼 요소가 있을 수 있음. `element.shadowRoot.querySelector()` 필요
3. **Amazon 봇 감지** — SC Track의 `sc-human-behavior.ts` 패턴 참고하여 클릭/입력 간 자연스러운 딜레이
4. **세션 만료** — 로그인이 필요한 상태면 폼 채우기 불가. 이 경우 즉시 에러 반환하고 사용자에게 알림
5. **BR 페이지 구조 변경** — 셀렉터를 별도 파일(`br-selectors.ts`)로 분리하여 유지보수 용이하게
