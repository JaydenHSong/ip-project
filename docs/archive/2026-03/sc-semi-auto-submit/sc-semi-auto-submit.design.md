# SC 반자동 신고 접수 (F13a) Design Document

> **Feature**: SC Semi-Auto Submit (Extension-based form filling)
> **Plan Reference**: `docs/01-plan/features/sc-semi-auto-submit.plan.md` v0.2
> **Version**: 0.1
> **Date**: 2026-03-02

---

## 1. Architecture Overview

### 1.1 전체 흐름 시퀀스

```
┌─ Sentinel Web ─────────────────┐   ┌─ Sentinel Extension (SC 페이지) ─┐
│                                │   │                                   │
│ [Submit to SC] 클릭            │   │                                   │
│       ↓                        │   │                                   │
│ POST /api/reports/:id/submit-sc│   │                                   │
│ → status: 'sc_preparing'       │   │                                   │
│ → sc_submit_data 저장          │   │                                   │
│ → SC RAV URL 반환              │   │                                   │
│       ↓                        │   │                                   │
│ window.open(sc_rav_url)  ──────────→ SC "Report a Violation" 열림     │
│                                │   │       ↓                           │
│                                │   │ Content script 감지               │
│                                │   │       ↓                           │
│                                │   │ GET /api/reports/pending-sc-submit│
│                                │   │       ↓                           │
│                                │   │ 폼 자동 채우기                    │
│                                │   │   ├ ASIN                          │
│                                │   │   ├ 위반 유형 (매핑)              │
│                                │   │   ├ Description                   │
│                                │   │   └ Evidence URLs                 │
│                                │   │       ↓                           │
│                                │   │ 토스트: "폼 채우기 완료"          │
│                                │   │       ↓                           │
│                                │   │ [사람이 확인 후 Submit 클릭]      │
│                                │   │       ↓                           │
│                                │   │ Extension: 제출 완료 감지         │
│                                │   │ POST /api/reports/:id/            │
│                                │   │       confirm-submitted           │
│       ↓                        │   │       ↓                           │
│ status → 'submitted'           │   │ sc_case_id 추출 (가능 시)         │
│ router.refresh()               │   │                                   │
└────────────────────────────────┘   └───────────────────────────────────┘
```

### 1.2 Fallback 흐름 (Extension 없을 때)

```
[Submit to SC] 클릭
  ↓
report 데이터를 클립보드 복사 (ASIN + 위반유형 + 신고서 본문)
  ↓
SC RAV 페이지 새 탭 열기
  ↓
토스트: "신고 내용이 클립보드에 복사됨. SC에서 붙여넣기하세요."
  ↓
오퍼레이터 수동 입력+제출
  ↓
Sentinel Web에서 "제출 완료" 수동 클릭 → status → 'submitted'
```

---

## 2. DB Schema Changes

### 2.1 reports 테이블 컬럼 추가

기존 `reports` 테이블에 SC 제출 데이터 저장 컬럼 추가:

```sql
-- SC 반자동 신고를 위한 컬럼 추가
ALTER TABLE reports ADD COLUMN IF NOT EXISTS
  sc_submit_data jsonb DEFAULT NULL;
```

**sc_submit_data** JSONB 구조:

```typescript
type ScSubmitData = {
  asin: string
  violation_type_sc: string        // SC 매핑된 위반 유형
  description: string              // draft_body 기반
  evidence_urls: string[]          // draft_evidence에서 추출
  marketplace: string              // US, UK 등
  prepared_at: string              // ISO timestamp
}
```

> 별도 테이블 없이 기존 `reports.sc_submit_data` JSONB 컬럼으로 충분. 1:1 관계이며 조회 빈도가 낮음.

### 2.2 상태 변경 없음

기존 `ReportStatus` 활용:
- `approved` → API 호출 → `submitted` (기존 흐름 유지)
- 중간 상태(`sc_preparing`) 는 DB에 저장하지 않음 — 프론트엔드 로컬 상태로 처리

---

## 3. API Design

### 3.1 기존 API 수정: POST /api/reports/:id/submit-sc

**현재**: status를 `approved → submitted`로만 변경
**변경**: sc_submit_data 저장 + SC RAV URL 반환 + status는 `submitted`로 변경

```typescript
// src/app/api/reports/[id]/submit-sc/route.ts

// Request: (body 없음, 기존과 동일)
// POST /api/reports/:id/submit-sc

// 내부 처리:
// 1. report + listing + draft 데이터 조회
// 2. V01~V19 → SC 위반 유형 매핑
// 3. sc_submit_data JSONB 저장
// 4. status → 'submitted'
// 5. SC RAV URL 생성하여 반환

// Response 변경:
type SubmitScResponse = {
  id: string
  status: 'submitted'
  sc_submitted_at: string
  sc_rav_url: string              // 추가: SC Report a Violation 페이지 URL
  sc_submit_data: ScSubmitData    // 추가: Extension이 조회할 데이터
}
```

**SC RAV URL 패턴**:
```
https://sellercentral.amazon.com/abuse-submission/report-abuse
```

> 마켓플레이스별 도메인 차이 (US만 P0):
> - US: `sellercentral.amazon.com`
> - UK: `sellercentral.amazon.co.uk`
> - JP: `sellercentral.amazon.co.jp`

### 3.2 신규 API: GET /api/reports/pending-sc-submit

Extension이 SC 페이지에서 대기 중인 submit 데이터를 조회.

```typescript
// src/app/api/reports/pending-sc-submit/route.ts

// Request:
// GET /api/reports/pending-sc-submit
// Headers: Authorization: Bearer <token>  (Extension auth)

// 내부 처리:
// 1. 사용자의 최근 submitted 상태 report 중 sc_submit_data가 있고
//    sc_case_id가 없는 것 조회 (= 아직 SC에 실제 제출 안 된 것)
// 2. 가장 최근 1건 반환

// Response:
type PendingScSubmitResponse = {
  report_id: string
  sc_submit_data: ScSubmitData
} | null   // 없으면 204 No Content
```

### 3.3 신규 API: POST /api/reports/:id/confirm-submitted

Extension이 SC 제출 완료 후 case ID와 함께 확인 콜백.

```typescript
// src/app/api/reports/[id]/confirm-submitted/route.ts

// Request:
// POST /api/reports/:id/confirm-submitted
// Headers: Authorization: Bearer <token>
// Body:
type ConfirmSubmittedRequest = {
  sc_case_id?: string    // Extension이 추출한 케이스 ID (없을 수 있음)
}

// 내부 처리:
// 1. report.status가 'submitted'인지 확인
// 2. sc_case_id 저장 (있으면)
// 3. sc_submit_data를 null로 클리어 (사용 완료)
// 4. 타임라인에 'submitted_sc' 이벤트 추가

// Response:
type ConfirmSubmittedResponse = {
  id: string
  status: 'submitted'
  sc_case_id: string | null
}
```

### 3.4 API 인증

- pending-sc-submit, confirm-submitted는 Extension에서 호출
- Extension은 Supabase access_token을 `Authorization: Bearer` 헤더로 전송
- 기존 `withAuth` 미들웨어 사용 — Extension 전용 권한 체크 불필요 (사용자 세션 기반)
- 최소 역할: `editor` (admin + editor 모두 가능)

---

## 4. Extension Changes

### 4.1 manifest.json 변경

```json
{
  "host_permissions": [
    // 기존 8개 Amazon 도메인 유지
    "https://www.amazon.com/*",
    "https://www.amazon.co.uk/*",
    "https://www.amazon.co.jp/*",
    "https://www.amazon.de/*",
    "https://www.amazon.fr/*",
    "https://www.amazon.it/*",
    "https://www.amazon.es/*",
    "https://www.amazon.ca/*",
    // 추가: Seller Central
    "https://sellercentral.amazon.com/*"
  ],
  "content_scripts": [
    {
      // 기존: Amazon 상품 페이지
      "matches": [ /* 기존 16개 패턴 유지 */ ],
      "js": ["content.js"],
      "css": ["content.css"]
    },
    {
      // 추가: SC Report a Violation 페이지
      "matches": [
        "https://sellercentral.amazon.com/abuse-submission/*"
      ],
      "js": ["sc-content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

> `sc-content.js`는 별도 엔트리포인트로 빌드 (기존 content.js와 분리)

### 4.2 신규 파일: sc-selectors.ts

SC "Report a Violation" 페이지의 DOM 셀렉터를 분리 관리.

```typescript
// extension/src/content/sc-selectors.ts

// SC RAV 페이지 셀렉터 (실제 구현 시 SC 페이지 분석 후 확정)
// trySelectors 패턴 적용 — 셀렉터 변경 시 이 파일만 수정

export const SC_SELECTORS = {
  // 페이지 감지: RAV 페이지인지 확인
  pageDetect: [
    () => document.querySelector('[data-testid="report-abuse-page"]'),
    () => document.querySelector('h1')?.textContent?.includes('Report a Violation'),
    () => window.location.pathname.includes('abuse-submission'),
  ],

  // 로그인 상태 감지
  loginDetect: [
    () => document.querySelector('[data-testid="user-menu"]'),
    () => document.querySelector('#sc-navbar-user'),
  ],

  // ASIN 입력 필드
  asinInput: [
    () => document.querySelector<HTMLInputElement>('input[name="asin"]'),
    () => document.querySelector<HTMLInputElement>('[data-testid="asin-input"]'),
    () => document.querySelector<HTMLInputElement>('input[placeholder*="ASIN"]'),
  ],

  // 위반 유형 드롭다운
  violationTypeSelect: [
    () => document.querySelector<HTMLSelectElement>('select[name="violation_type"]'),
    () => document.querySelector<HTMLSelectElement>('[data-testid="violation-type"]'),
  ],

  // 설명 텍스트영역
  descriptionTextarea: [
    () => document.querySelector<HTMLTextAreaElement>('textarea[name="description"]'),
    () => document.querySelector<HTMLTextAreaElement>('[data-testid="description"]'),
  ],

  // 증거 URL 입력
  evidenceInput: [
    () => document.querySelector<HTMLInputElement>('input[name="evidence_url"]'),
    () => document.querySelector<HTMLInputElement>('[data-testid="evidence-url"]'),
  ],

  // Submit 버튼 (감지용, 클릭하지 않음)
  submitButton: [
    () => document.querySelector<HTMLButtonElement>('button[type="submit"]'),
    () => document.querySelector<HTMLButtonElement>('[data-testid="submit-button"]'),
  ],

  // 제출 완료 확인 (URL 변경 또는 확인 메시지)
  submissionConfirm: [
    () => document.querySelector('[data-testid="submission-success"]'),
    () => document.querySelector('.success-message'),
  ],

  // 케이스 ID 추출
  caseId: [
    () => document.querySelector('[data-testid="case-id"]')?.textContent?.trim(),
    () => {
      const text = document.body.textContent ?? ''
      const match = text.match(/Case\s*(?:ID|#)?\s*:?\s*(\d{10,})/i)
      return match?.[1] ?? null
    },
  ],
} as const
```

> **주의**: SC 페이지의 실제 셀렉터는 구현 시 SC 페이지 접속하여 확인 필요. 위 셀렉터는 예상 구조 기반 placeholder.

### 4.3 신규 파일: sc-violation-map.ts

V01~V19 → SC RAV 위반 유형 매핑.

```typescript
// extension/src/shared/sc-violation-map.ts

import type { ViolationCode } from './constants'

// SC "Report a Violation" 위반 유형 옵션 매핑
// SC 드롭다운의 정확한 value는 실제 SC 페이지에서 확인 후 업데이트
export const SC_VIOLATION_MAP: Record<ViolationCode, string> = {
  // 지적재산권 침해
  V01: 'trademark',                   // 상표권 침해
  V02: 'copyright',                   // 저작권 침해 (이미지 도용)
  V03: 'patent',                      // 특허 침해
  V04: 'counterfeit',                 // 위조품 판매

  // 리스팅 콘텐츠 위반
  V05: 'misleading_claims',           // 허위/과장 광고
  V06: 'prohibited_content',          // 금지 키워드 사용
  V07: 'inaccurate_information',      // 부정확한 상품 정보
  V08: 'image_violation',             // 이미지 정책 위반
  V09: 'comparative_advertising',     // 타 브랜드 비교 광고
  V10: 'variation_abuse',             // Variation 정책 위반

  // 리뷰 조작
  V11: 'review_manipulation',         // 리뷰 조작/인센티브 리뷰
  V12: 'review_hijacking',            // 리뷰 하이재킹

  // 판매 관행 위반
  V13: 'pricing_abuse',               // 가격 조작
  V14: 'unauthorized_reseller',       // 재판매 위반
  V15: 'bundling_violation',          // 번들링 위반

  // 규제/안전 위반
  V16: 'missing_certification',       // 인증 미비 (FCC/UL 등)
  V17: 'safety_violation',            // 안전 기준 미달
  V18: 'missing_warnings',            // 필수 경고문 누락
  V19: 'import_violation',            // 수입 규정 위반
} as const

// SC 위반 유형의 역매핑 (SC 유형 → Sentinel 코드)
export const SC_TO_SENTINEL_MAP = Object.entries(SC_VIOLATION_MAP).reduce(
  (acc, [code, scType]) => {
    acc[scType] = code as ViolationCode
    return acc
  },
  {} as Record<string, ViolationCode>,
)
```

### 4.4 신규 파일: sc-form-filler.ts

SC 페이지에서 실행되는 content script 메인 로직.

```typescript
// extension/src/content/sc-form-filler.ts

// 엔트리포인트: SC "Report a Violation" 페이지에서 자동 실행
// 1. Sentinel API에서 대기 중 submit 데이터 조회
// 2. SC 폼에 자동 채우기
// 3. 사용자에게 확인 토스트 표시
// 4. 제출 완료 감지 → 확인 콜백

import { SC_SELECTORS } from './sc-selectors'
import { SC_VIOLATION_MAP } from '@shared/sc-violation-map'
import { API_BASE } from '@shared/constants'
import type { ScSubmitData } from '@shared/types'

// trySelectors — parser.ts 와 동일 패턴
const trySelectors = <T>(selectors: (() => T | null | undefined)[]): T | null => {
  for (const selector of selectors) {
    try {
      const result = selector()
      if (result !== null && result !== undefined && result !== '') return result
    } catch { /* next */ }
  }
  return null
}

// 메인 초기화
const init = async (): Promise<void> => {
  // 1. SC RAV 페이지인지 확인
  const isRavPage = trySelectors(SC_SELECTORS.pageDetect)
  if (!isRavPage) return

  // 2. SC 로그인 상태 확인
  const isLoggedIn = trySelectors(SC_SELECTORS.loginDetect)
  if (!isLoggedIn) {
    showToast('SC에 로그인하세요.', 'warning')
    return
  }

  // 3. Sentinel API에서 대기 중 데이터 조회
  const pendingData = await fetchPendingSubmitData()
  if (!pendingData) {
    // 대기 데이터 없음 — Sentinel에서 온 것이 아닌 직접 접속
    return
  }

  // 4. 폼 채우기
  const filled = fillForm(pendingData.sc_submit_data)

  if (filled) {
    showToast('폼 채우기 완료. 확인 후 Submit 클릭하세요.', 'success')
  } else {
    showToast('일부 필드를 채우지 못했습니다. 수동으로 확인하세요.', 'warning')
  }

  // 5. 제출 완료 감지 (URL 변경 또는 확인 메시지 감시)
  observeSubmission(pendingData.report_id)
}

// Sentinel API에서 대기 중 SC submit 데이터 조회
const fetchPendingSubmitData = async (): Promise<{
  report_id: string
  sc_submit_data: ScSubmitData
} | null> => {
  try {
    const session = await getStoredSession()
    if (!session) return null

    const res = await fetch(`${API_BASE}/reports/pending-sc-submit`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'X-Extension-Version': chrome.runtime.getManifest().version,
      },
    })

    if (res.status === 204) return null
    if (!res.ok) return null

    return res.json()
  } catch {
    return null
  }
}

// chrome.storage에서 세션 조회
const getStoredSession = async (): Promise<{
  access_token: string
} | null> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(['auth.access_token'], (result) => {
      const token = result['auth.access_token']
      if (!token) resolve(null)
      else resolve({ access_token: token })
    })
  })
}

// SC 폼에 데이터 채우기
const fillForm = (data: ScSubmitData): boolean => {
  let allFilled = true

  // ASIN
  const asinInput = trySelectors(SC_SELECTORS.asinInput)
  if (asinInput) {
    setInputValue(asinInput, data.asin)
  } else {
    allFilled = false
  }

  // 위반 유형 선택
  const violationSelect = trySelectors(SC_SELECTORS.violationTypeSelect)
  if (violationSelect) {
    setSelectValue(violationSelect, data.violation_type_sc)
  } else {
    allFilled = false
  }

  // Description
  const descTextarea = trySelectors(SC_SELECTORS.descriptionTextarea)
  if (descTextarea) {
    setInputValue(descTextarea, data.description)
  } else {
    allFilled = false
  }

  // Evidence URLs
  if (data.evidence_urls.length > 0) {
    const evidenceInput = trySelectors(SC_SELECTORS.evidenceInput)
    if (evidenceInput) {
      setInputValue(evidenceInput, data.evidence_urls.join('\n'))
    }
    // evidence는 optional — 실패해도 allFilled 유지
  }

  return allFilled
}

// React/Angular 호환 input value 설정
const setInputValue = (
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void => {
  const nativeInputValueSetter =
    Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value',
    )?.set ??
    Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value',
    )?.set

  nativeInputValueSetter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

// Select 값 설정
const setSelectValue = (el: HTMLSelectElement, value: string): void => {
  el.value = value
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

// 제출 완료 감지 (MutationObserver + URL 변경 감시)
const observeSubmission = (reportId: string): void => {
  // URL 변경 감시
  let currentUrl = window.location.href
  const urlCheckInterval = setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href
      // 확인 페이지로 이동했는지 체크
      checkSubmissionComplete(reportId)
    }
  }, 1000)

  // DOM 변경 감시 (확인 메시지 출현)
  const observer = new MutationObserver(() => {
    const confirmEl = trySelectors(SC_SELECTORS.submissionConfirm)
    if (confirmEl) {
      observer.disconnect()
      clearInterval(urlCheckInterval)
      handleSubmissionComplete(reportId)
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  // 5분 타임아웃
  setTimeout(() => {
    observer.disconnect()
    clearInterval(urlCheckInterval)
  }, 5 * 60 * 1000)
}

const checkSubmissionComplete = (reportId: string): void => {
  const confirmEl = trySelectors(SC_SELECTORS.submissionConfirm)
  if (confirmEl) {
    handleSubmissionComplete(reportId)
  }
}

// 제출 완료 처리 — Sentinel API 콜백
const handleSubmissionComplete = async (reportId: string): Promise<void> => {
  const caseId = trySelectors(SC_SELECTORS.caseId)

  try {
    const session = await getStoredSession()
    if (!session) return

    await fetch(`${API_BASE}/reports/${reportId}/confirm-submitted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'X-Extension-Version': chrome.runtime.getManifest().version,
      },
      body: JSON.stringify({
        sc_case_id: caseId ?? undefined,
      }),
    })

    showToast(`SC 제출 완료!${caseId ? ` Case ID: ${caseId}` : ''}`, 'success')
  } catch {
    showToast('Sentinel 업데이트 실패. 웹에서 수동 확인하세요.', 'error')
  }
}

// 토스트 UI
const showToast = (message: string, type: 'success' | 'warning' | 'error'): void => {
  const toast = document.createElement('div')
  toast.className = 'sentinel-sc-toast'
  toast.setAttribute('data-type', type)
  toast.textContent = `🛡️ Sentinel: ${message}`

  // 스타일은 SC 페이지 위에 오버레이
  Object.assign(toast.style, {
    position: 'fixed',
    top: '16px',
    right: '16px',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: '99999',
    color: '#fff',
    backgroundColor: type === 'success' ? '#16a34a'
      : type === 'warning' ? '#d97706'
      : '#dc2626',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'opacity 0.3s',
  })

  document.body.appendChild(toast)
  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 300)
  }, 5000)
}

// 실행
init()
```

### 4.5 Chrome Message Types 추가

```typescript
// extension/src/shared/messages.ts 에 추가

// SC Form Filler → Service Worker
export type ScContentMessage =
  | { type: 'SC_FORM_FILLED'; reportId: string }
  | { type: 'SC_SUBMIT_DETECTED'; reportId: string; caseId: string | null }
```

### 4.6 Extension Types 추가

```typescript
// extension/src/shared/types.ts 에 추가

export type ScSubmitData = {
  asin: string
  violation_type_sc: string
  description: string
  evidence_urls: string[]
  marketplace: string
  prepared_at: string
}
```

---

## 5. Web UI Changes

### 5.1 ReportActions.tsx — handleSubmitSC 변경

```typescript
// src/app/(protected)/reports/[id]/ReportActions.tsx
// handleSubmitSC 메서드 변경

const handleSubmitSC = async () => {
  setLoading('submitSC')
  try {
    const res = await fetch(`/api/reports/${reportId}/submit-sc`, {
      method: 'POST',
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Submit to SC failed')
    }

    const data = await res.json()

    // 1. SC RAV 페이지 새 탭 열기
    if (data.sc_rav_url) {
      window.open(data.sc_rav_url, '_blank')
    }

    // 2. 클립보드 fallback (Extension 없을 때 대비)
    const clipboardText = formatClipboardText(data.sc_submit_data)
    await navigator.clipboard.writeText(clipboardText)

    // 3. 토스트 또는 알림 표시
    // (Extension이 설치되어 있으면 SC 페이지에서 자동 채우기됨)
    // (없으면 클립보드에서 붙여넣기 안내)

    router.refresh()
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed')
  } finally {
    setLoading(null)
  }
}

// 클립보드용 텍스트 포맷팅
const formatClipboardText = (data: ScSubmitData): string => {
  return [
    `ASIN: ${data.asin}`,
    `Violation Type: ${data.violation_type_sc}`,
    '',
    '--- Description ---',
    data.description,
    '',
    data.evidence_urls.length > 0
      ? `--- Evidence ---\n${data.evidence_urls.join('\n')}`
      : '',
  ].filter(Boolean).join('\n')
}
```

### 5.2 Submit to SC 버튼 — Manual Confirm 추가

`approved` 상태에서 Submit to SC 이후, Extension 없이 수동 제출한 경우를 위한 "제출 완료 확인" 버튼 추가:

```typescript
// submitted 상태에서 sc_case_id가 없으면 수동 확인 버튼 표시
{status === 'submitted' && !report.sc_case_id && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => setShowManualConfirmModal(true)}
  >
    {t('reports.detail.confirmSubmitted')}
  </Button>
)}
```

### 5.3 Manual Confirm Modal

```typescript
// SC Case ID 수동 입력 Modal
<Modal
  open={showManualConfirmModal}
  onClose={() => setShowManualConfirmModal(false)}
  title={t('reports.detail.confirmSubmitted')}
>
  <p className="mb-3 text-sm text-th-text-secondary">
    {t('reports.detail.confirmSubmittedDesc')}
  </p>
  <Input
    label={t('reports.detail.scCaseId')}
    value={scCaseId}
    onChange={(e) => setScCaseId(e.target.value)}
    placeholder="e.g., 1234567890"
  />
  <div className="mt-4 flex justify-end gap-3">
    <Button variant="ghost" size="sm" onClick={() => setShowManualConfirmModal(false)}>
      {t('common.cancel')}
    </Button>
    <Button
      size="sm"
      loading={loading === 'confirmSubmitted'}
      onClick={handleConfirmSubmitted}
    >
      {t('reports.detail.confirmSubmitted')}
    </Button>
  </div>
</Modal>
```

---

## 6. i18n Keys

### 6.1 en.ts 추가

```typescript
reports: {
  detail: {
    // 기존 키 유지 + 아래 추가
    submitSCDesc: 'Opens SC Report a Violation page. Extension will auto-fill the form.',
    clipboardCopied: 'Report data copied to clipboard. Paste in SC form.',
    confirmSubmitted: 'Confirm Submitted',
    confirmSubmittedDesc: 'If you submitted to SC manually, enter the Case ID to confirm.',
    scCaseIdPlaceholder: 'e.g., 1234567890',
  }
}
```

### 6.2 ko.ts 추가

```typescript
reports: {
  detail: {
    // 기존 키 유지 + 아래 추가
    submitSCDesc: 'SC "Report a Violation" 페이지를 엽니다. Extension이 자동으로 폼을 채웁니다.',
    clipboardCopied: '신고 내용이 클립보드에 복사되었습니다. SC 폼에 붙여넣으세요.',
    confirmSubmitted: '제출 완료 확인',
    confirmSubmittedDesc: 'SC에 수동으로 제출한 경우, Case ID를 입력하여 확인하세요.',
    scCaseIdPlaceholder: '예: 1234567890',
  }
}
```

---

## 7. Demo Mode

Demo mode에서는 실제 SC 페이지 없이 시뮬레이션:

```typescript
// submit-sc API — demo mode 분기
if (isDemoMode) {
  return NextResponse.json({
    id: reportId,
    status: 'submitted',
    sc_submitted_at: new Date().toISOString(),
    sc_rav_url: 'https://sellercentral.amazon.com/abuse-submission/report-abuse',
    sc_submit_data: {
      asin: 'B0DXXXXXXX',
      violation_type_sc: 'trademark',
      description: 'Demo: trademark violation report',
      evidence_urls: [],
      marketplace: 'US',
      prepared_at: new Date().toISOString(),
    },
  })
}
```

---

## 8. Extension Build Changes

### 8.1 Webpack/Vite 엔트리포인트 추가

SC content script는 별도 엔트리포인트로 빌드:

```
기존 엔트리포인트:
  - content.js  ← extension/src/content/index.ts
  - background.js ← extension/src/background/index.ts
  - popup.js ← extension/src/popup/index.ts

추가:
  - sc-content.js ← extension/src/content/sc-form-filler.ts
```

빌드 설정에 `sc-content` 엔트리포인트 추가 필요.

---

## 9. Implementation Order

| # | Item | Location | Est. LoC | Dependency |
|---|------|----------|---------|------------|
| 1 | Extension manifest SC 도메인 추가 | `extension/manifest.json` | ~8 | — |
| 2 | SC DOM 셀렉터 정의 | `extension/src/content/sc-selectors.ts` | ~50 | — |
| 3 | V01~V19 → SC 위반 유형 매핑 | `extension/src/shared/sc-violation-map.ts` | ~45 | — |
| 4 | Extension shared types 추가 | `extension/src/shared/types.ts` | ~10 | — |
| 5 | Extension messages 타입 추가 | `extension/src/shared/messages.ts` | ~5 | — |
| 6 | SC 폼 자동 채우기 content script | `extension/src/content/sc-form-filler.ts` | ~200 | 2, 3, 4 |
| 7 | Web API: submit-sc 확장 | `src/app/api/reports/[id]/submit-sc/route.ts` | ~30 | 3 |
| 8 | Web API: pending-sc-submit | `src/app/api/reports/pending-sc-submit/route.ts` | ~35 | — |
| 9 | Web API: confirm-submitted | `src/app/api/reports/[id]/confirm-submitted/route.ts` | ~45 | — |
| 10 | ReportActions UI 변경 | `ReportActions.tsx` | ~60 | 7 |
| 11 | i18n 키 추가 | `en.ts`, `ko.ts` | ~12 | — |
| 12 | Demo mode 지원 | `submit-sc/route.ts` | ~15 | 7 |

**예상 총 LoC**: ~515

---

## 10. Security Considerations

| 항목 | 조치 |
|------|------|
| SC 자격증명 | 서버에 절대 저장하지 않음. Extension이 사용자 브라우저 세션 활용 |
| API 인증 | Extension → Web API는 기존 Supabase Bearer token 사용 |
| sc_submit_data | 민감 데이터 없음 (ASIN, 위반유형, 설명문). JSONB 컬럼에 암호화 불필요 |
| XSS | SC 페이지에 주입되는 토스트는 textContent만 사용 (innerHTML 금지) |
| CORS | pending-sc-submit, confirm-submitted는 Extension origin에서 호출 가능하도록 CORS 헤더 필요 없음 (Extension은 CORS 미적용) |

---

## 11. Testing Strategy

| 테스트 | 방법 |
|--------|------|
| API 유닛 | submit-sc, pending-sc-submit, confirm-submitted 각각 수동 curl 테스트 |
| Extension content script | SC RAV 페이지 접속 → 폼 채우기 동작 확인 |
| Fallback | Extension 없이 Submit to SC → 클립보드 복사 확인 |
| 상태 전이 | approved → submitted → sc_case_id 저장 흐름 확인 |
| Demo mode | `/reports/rpt-001` (demo approved) → Submit to SC → SC URL 열림 확인 |
| 빌드 | `pnpm typecheck` + `pnpm build` 통과 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial design — Extension-based SC form filler | Claude (AI) |
