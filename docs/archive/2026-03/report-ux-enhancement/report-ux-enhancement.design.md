# Report UX Enhancement — Design Document

> **Feature**: report-ux-enhancement
> **Plan**: `docs/01-plan/features/report-ux-enhancement.plan.md`
> **Date**: 2026-03-03
> **Status**: Draft

---

## 1. Overview

브레인스토밍 7개 항목을 3개 Group으로 나누어 구현:
- **Group A**: 워크플로우 개선 (Cancel→Archive, Approve+Submit 통합)
- **Group B**: 템플릿 시스템 (CRUD, 카테고리, 변수 치환)
- **Group C**: Listing 정보 확장 + 스크린샷 (rating/review, 캡처, 호버 프리뷰)

---

## 2. Group A — 워크플로우 개선

### 2.1 Cancel → Archive 전환 (FR-01, FR-02)

**현재 상태**: `ReportActions.tsx:438-446`에서 `draft`, `pending_review`, `approved` 상태에 빨간 Cancel 버튼 표시.

**변경**: Cancel 버튼을 Archive 버튼으로 교체.

```
변경 전: [Submit Review] [Cancel(빨간)]
변경 후: [Submit Review] [Archive(회색 outline)]
```

**구현 상세**:

| 파일 | 변경 |
|------|------|
| `ReportActions.tsx` | L438-446: `Cancel` → `Archive` 버튼으로 교체. `variant="danger"` → `variant="outline"`. `setShowCancelModal` → `setShowArchiveModal` |
| `ReportActions.tsx` | Cancel 관련 state/handler 제거: `showCancelModal`, `cancelReason`, `handleCancel` |
| `ReportActions.tsx` | Archive 모달 조건 확장: 기존 `['monitoring', 'unresolved', 'resolved']` → `['draft', 'pending_review', 'approved', 'monitoring', 'unresolved', 'resolved']` |
| `ReportActions.tsx` | Archive 성공 후 `router.push('/reports/archived')` 추가 |
| `en.ts` / `ko.ts` | `reports.detail.archiveReport` 키 추가 (기존 `forceArchive`와 구분) |

**Archive 모달 동작**:
1. "Archive" 버튼 클릭 → Archive 사유 모달 표시 (기존 Archive Modal 재사용)
2. 사유 입력 (선택사항) + 확인
3. `POST /api/reports/:id/archive` 호출 (기존 API 그대로)
4. 성공 → `/reports/archived` 페이지로 이동

**Cancel API/기능 제거**:
- `handleCancel` 함수 삭제
- `showCancelModal`, `cancelReason` state 삭제
- Cancel Modal JSX 삭제
- API route `/api/reports/[id]/cancel/route.ts`는 유지 (하위호환)

### 2.2 Approve & Submit 통합 (FR-03, FR-04, FR-05)

**현재 흐름** (3클릭):
```
pending_review → [Approve] → approved → [Submit to SC] → submitted
```

**변경 후** (1클릭 옵션 추가):
```
pending_review → [Approve & Submit] → submitted (원클릭)
                  또는
                 [Approve Only] → approved (기존 방식 유지)
```

**ReportActions.tsx 버튼 변경**:

```tsx
// pending_review 상태 — 기존 코드 L329-352 교체
{status === 'pending_review' && (
  <>
    <Button size="sm" loading={loading === 'approveSubmit'} onClick={handleApproveAndSubmit}>
      {t('reports.detail.approveAndSubmit')}
    </Button>
    <Button variant="outline" size="sm" loading={loading === 'approve'} onClick={handleApprove}>
      {t('reports.detail.approveOnly')}
    </Button>
    <Button variant="outline" size="sm" onClick={() => setShowRejectModal(true)}>
      {t('reports.detail.reject')}
    </Button>
    <Button variant="outline" size="sm" onClick={() => setShowRewriteModal(true)}>
      {t('reports.detail.rewrite')}
    </Button>
  </>
)}

// approved 상태 — Submit to SC 버튼 제거
{status === 'approved' && userRole === 'admin' && (
  <Button size="sm" loading={loading === 'approveSubmit'} onClick={handleSubmitSC}>
    {t('reports.detail.submitSC')}
  </Button>
)}
```

**새 API**: `POST /api/reports/[id]/approve-submit/route.ts`

```
요청 → approve (status: approved) → submit-sc 호출 → 성공 시 status: submitted
       ↘ 실패 시: status를 approved로 남기고 에러 반환
```

```typescript
// approve-submit/route.ts 의사코드
export async function POST(req, { params }) {
  const { id } = await params

  // 1. 상태 검증: pending_review만 가능
  // 2. Approve 처리 (approved_by, approved_at 업데이트)
  // 3. SC 제출 처리 (sc_rav_url 생성, sc_submit_data 준비)
  // 4. 상태를 submitted로 변경
  // 5. SC RAV URL + submit data 반환

  // 실패 시: approved 상태로 남기고 에러 메시지 반환
  // → 프론트에서 "승인은 완료됨. SC 제출에 실패함. Submit to SC로 재시도." 토스트
}
```

**handleApproveAndSubmit 핸들러** (ReportActions.tsx):
```typescript
const handleApproveAndSubmit = async () => {
  setLoading('approveSubmit')
  try {
    const res = await fetch(`/api/reports/${reportId}/approve-submit`, { method: 'POST' })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Approve & Submit failed')
    }
    const data = await res.json()
    // SC RAV 페이지 새 탭 + 클립보드 (기존 handleSubmitSC와 동일)
    if (data.sc_rav_url) window.open(data.sc_rav_url, '_blank')
    if (data.sc_submit_data) {
      await navigator.clipboard.writeText(formatClipboardText(data.sc_submit_data)).catch(() => {})
    }
    router.refresh()
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed')
  } finally {
    setLoading(null)
  }
}
```

**i18n 키 추가**:

| Key | EN | KO |
|-----|----|----|
| `reports.detail.approveAndSubmit` | Approve & Submit | 승인 및 제출 |
| `reports.detail.approveOnly` | Approve Only | 승인만 |
| `reports.detail.archiveReport` | Archive | 아카이브 |
| `reports.detail.approveSubmitPartialError` | Approved but SC submit failed. Try "Submit to SC" manually. | 승인 완료. SC 제출 실패. "SC 제출"을 수동으로 시도하세요. |

---

## 3. Group B — 템플릿 시스템

### 3.1 데이터 모델 (FR-08, FR-09)

**타입**: `src/types/templates.ts` (새 파일)

```typescript
export type ReportTemplate = {
  id: string
  title: string
  body: string                    // {{ASIN}}, {{TITLE}} 등 변수 포함
  category: string | null         // violation category (IP, listing, etc.)
  violation_types: string[]       // 적용 가능 위반 유형 (V01, V02 등)
  marketplace: string[]           // 적용 마켓플레이스 (US, JP, DE 등), 빈배열=전체
  tags: string[]                  // 커스텀 태그
  is_default: boolean
  usage_count: number
  created_by: string
  created_at: string
  updated_at: string
}

export const TEMPLATE_VARIABLES = [
  '{{ASIN}}',
  '{{TITLE}}',
  '{{SELLER}}',
  '{{BRAND}}',
  '{{MARKETPLACE}}',
  '{{PRICE}}',
  '{{VIOLATION_TYPE}}',
  '{{TODAY}}',
  '{{RATING}}',
  '{{REVIEW_COUNT}}',
] as const

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number]
```

**DB 마이그레이션**: `supabase/migrations/005_report_templates.sql`

```sql
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  violation_types TEXT[] DEFAULT '{}',
  marketplace TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_templates_category ON report_templates(category);
CREATE INDEX idx_templates_violation ON report_templates USING GIN(violation_types);

-- RLS
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_read" ON report_templates FOR SELECT USING (true);
CREATE POLICY "templates_write" ON report_templates FOR ALL
  USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'editor')));
```

**데모 데이터**: `src/lib/demo/data.ts`에 `DEMO_TEMPLATES` 추가

```typescript
export const DEMO_TEMPLATES: ReportTemplate[] = [
  {
    id: 'tmpl-001',
    title: 'Trademark Infringement — Standard',
    body: 'The listing at ASIN {{ASIN}} titled "{{TITLE}}" sold by {{SELLER}} on Amazon {{MARKETPLACE}} infringes on registered trademarks owned by Spigen Inc.\n\nThe {{VIOLATION_TYPE}} violation is clearly evidenced by...\n\nWe request immediate removal of this listing.',
    category: 'ip_infringement',
    violation_types: ['V01', 'V02', 'V03'],
    marketplace: [],
    tags: ['trademark', 'standard'],
    is_default: true,
    usage_count: 42,
    created_by: 'user-001',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-02-20T00:00:00Z',
  },
  {
    id: 'tmpl-002',
    title: 'Listing Content Violation — Image',
    body: 'ASIN: {{ASIN}}\nMarketplace: Amazon {{MARKETPLACE}}\nSeller: {{SELLER}}\nPrice: {{PRICE}}\nRating: {{RATING}} ({{REVIEW_COUNT}} reviews)\n\nThis listing contains content that violates Amazon policy regarding {{VIOLATION_TYPE}}.\n\nAs of {{TODAY}}, the listing titled "{{TITLE}}" displays...',
    category: 'listing_content',
    violation_types: ['V06', 'V07', 'V08'],
    marketplace: ['US', 'JP'],
    tags: ['listing', 'image'],
    is_default: false,
    usage_count: 18,
    created_by: 'user-001',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-25T00:00:00Z',
  },
  {
    id: 'tmpl-003',
    title: 'Review Manipulation Report',
    body: 'We have identified review manipulation for ASIN {{ASIN}} ("{{TITLE}}").\n\nSeller: {{SELLER}}\nCurrent Rating: {{RATING}} with {{REVIEW_COUNT}} reviews\n\nEvidence of {{VIOLATION_TYPE}}...',
    category: 'review_manipulation',
    violation_types: ['V14', 'V15'],
    marketplace: [],
    tags: ['review', 'manipulation'],
    is_default: false,
    usage_count: 7,
    created_by: 'user-001',
    created_at: '2026-02-10T00:00:00Z',
    updated_at: '2026-02-28T00:00:00Z',
  },
]
```

### 3.2 변수 치환 엔진 (FR-07)

**파일**: `src/lib/templates/interpolate.ts` (새 파일)

```typescript
import type { Listing } from '@/types/listings'
import type { Report } from '@/types/reports'
import { VIOLATION_LABELS } from '@/constants/violations'

type InterpolateContext = {
  listing: Partial<Listing>
  report?: Partial<Report>
}

export const interpolateTemplate = (template: string, ctx: InterpolateContext): string => {
  const { listing, report } = ctx
  const now = new Date()

  const replacements: Record<string, string> = {
    '{{ASIN}}': listing.asin ?? '',
    '{{TITLE}}': listing.title ?? '',
    '{{SELLER}}': listing.seller_name ?? '',
    '{{BRAND}}': listing.brand ?? '',
    '{{MARKETPLACE}}': listing.marketplace ?? '',
    '{{PRICE}}': listing.price_amount
      ? `${listing.price_currency ?? '$'}${listing.price_amount}`
      : '',
    '{{VIOLATION_TYPE}}': report?.confirmed_violation_type
      ? VIOLATION_LABELS[report.confirmed_violation_type] ?? report.confirmed_violation_type
      : report?.user_violation_type
        ? VIOLATION_LABELS[report.user_violation_type] ?? report.user_violation_type
        : '',
    '{{TODAY}}': now.toISOString().slice(0, 10),
    '{{RATING}}': listing.rating != null ? String(listing.rating) : '',
    '{{REVIEW_COUNT}}': listing.review_count != null ? String(listing.review_count) : '',
  }

  let result = template
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(key, value)
  }
  return result
}
```

### 3.3 템플릿 선택 패널 UI (FR-06)

**파일**: `src/app/(protected)/reports/[id]/TemplatePanel.tsx` (새 파일)

SlidePanel 안에 렌더링. 카테고리 필터 + 검색 + 템플릿 목록 + 프리뷰 + 적용 버튼.

```
┌──────────────────────────────────────┐
│ [X] Apply Template                   │
│──────────────────────────────────────│
│ [Search templates...]                │
│ [All] [IP] [Listing] [Review] [...]  │  ← 카테고리 탭
│──────────────────────────────────────│
│ ★ Trademark Infringement — Standard  │  ← is_default
│   Used 42 times · V01, V02, V03     │
│   [Preview] [Apply]                  │
│──────────────────────────────────────│
│   Listing Content Violation — Image  │
│   Used 18 times · V06, V07 · US, JP │
│   [Preview] [Apply]                  │
│──────────────────────────────────────│
│   Review Manipulation Report         │
│   Used 7 times · V14, V15           │
│   [Preview] [Apply]                  │
└──────────────────────────────────────┘
```

**Props**:
```typescript
type TemplatePanelProps = {
  open: boolean
  onClose: () => void
  onApply: (interpolatedBody: string, templateTitle: string) => void
  listing: Partial<Listing>
  report: Partial<Report>
  currentViolationType?: string
}
```

**동작**:
1. 패널 열림 → API/데모에서 템플릿 목록 로드
2. `currentViolationType`으로 관련 템플릿 먼저 정렬
3. "Preview" 클릭 → 변수 치환된 프리뷰 표시
4. "Apply" 클릭 → `interpolateTemplate()` 실행 → `onApply(result, title)` 콜백
5. ReportDetailContent에서 `editBody`를 업데이트

### 3.4 템플릿 관리 UI (FR-08, FR-10)

**파일**: `src/app/(protected)/settings/TemplatesTab.tsx` (새 파일)

Settings 페이지에 "Templates" 탭 추가. Admin/Editor만 접근.

| 기능 | UI |
|------|-----|
| 목록 | 테이블: Title, Category, Violation Types, Marketplace, Used, Actions |
| 생성 | SlidePanel: Title, Body ({{변수}} 삽입 버튼), Category, Violation Types (멀티셀렉트), Marketplace (멀티셀렉트), Tags |
| 수정 | 동일 SlidePanel (데이터 프리필) |
| 삭제 | 확인 모달 |
| 복제 | 클릭 → 복사본 생성 (title에 " (Copy)" 추가) |

### 3.5 API Routes

**`/api/templates/route.ts`** (새 파일):
- `GET` — 템플릿 목록 (필터: category, violation_type, marketplace, search)
- `POST` — 템플릿 생성 (admin/editor)

**`/api/templates/[id]/route.ts`** (새 파일):
- `GET` — 단일 템플릿
- `PATCH` — 템플릿 수정
- `DELETE` — 템플릿 삭제

---

## 4. Group C — Listing 정보 확장 + 스크린샷

### 4.1 Listing 카드 확장 (FR-11, FR-12)

**파일**: `ReportDetailContent.tsx` L149-177

**현재**: ASIN, Marketplace, Title, Seller (4개 필드)
**변경**: + Rating, Review Count, Price, Brand (최대 8개 필드)

```
변경 후 Listing 카드:
┌────────────────────────────────────────────────────────┐
│ Listing Information                                     │
│─────────────────────────────────────────────────────────│
│ ASIN          B0D1234567    │ Marketplace    US         │
│ Title         [full title across 2 columns]             │
│ Seller        FakeSeller    │ Brand          N/A        │
│ Rating        ★★★★☆ 4.2    │ Reviews        847        │
│ Price         $12.99        │                           │
└─────────────────────────────────────────────────────────┘
```

**구현**:

1. `page.tsx` — `ListingInfo` 타입 확장:
```typescript
type ListingInfo = {
  asin: string
  title: string
  marketplace: string
  seller_name: string | null
  brand: string | null          // 추가
  rating: number | null          // 추가
  review_count: number | null    // 추가
  price_amount: number | null    // 추가
  price_currency: string         // 추가
  images: ListingImage[]         // 추가 (Group C 스크린샷용)
}
```

2. `page.tsx` — Supabase select 확장:
```sql
listings!reports_listing_id_fkey(asin, title, marketplace, seller_name, brand, rating, review_count, price_amount, price_currency, images)
```

3. `ReportDetailContent.tsx` — listing prop 타입 확장 + 렌더링 추가

**Rating 표시 컴포넌트**: 인라인으로 별 아이콘 + 숫자 (별도 컴포넌트 불필요)
```tsx
{listing.rating != null && (
  <div>
    <dt className="text-sm text-th-text-tertiary">Rating</dt>
    <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-th-text">
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      {listing.rating.toFixed(1)}
      {listing.review_count != null && (
        <span className="text-th-text-muted">({listing.review_count.toLocaleString()})</span>
      )}
    </dd>
  </div>
)}
```

### 4.2 스크린샷 캡처 버튼 (FR-13, FR-14)

**DEMO_MODE에서의 구현**: 실제 캡처 대신 목업 동작.

**파일**: `ReportDetailContent.tsx`에 버튼 추가 (Listing 카드 헤더)

```tsx
<CardHeader>
  <div className="flex items-center justify-between">
    <h2 className="font-semibold text-th-text">{t('reports.detail.listing')}</h2>
    <Button variant="outline" size="sm" onClick={handleCaptureScreenshot}>
      <Camera className="mr-1.5 h-4 w-4" />
      {t('reports.detail.captureScreenshot')}
    </Button>
  </div>
</CardHeader>
```

**handleCaptureScreenshot**:
```typescript
const handleCaptureScreenshot = async () => {
  setCapturing(true)
  try {
    const res = await fetch(`/api/reports/${report.id}/screenshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asin: listing.asin, marketplace: listing.marketplace }),
    })
    if (!res.ok) throw new Error('Capture failed')
    const { screenshot_url } = await res.json()
    // evidence에 추가
    router.refresh()
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed')
  } finally {
    setCapturing(false)
  }
}
```

**API**: `POST /api/reports/[id]/screenshot/route.ts`

DEMO_MODE에서는 목업 URL 반환:
```typescript
if (isDemoMode()) {
  return NextResponse.json({
    screenshot_url: `https://placeholder.co/1280x800/1a1a2e/ffffff?text=ASIN+${asin}+Screenshot`,
    captured_at: new Date().toISOString(),
  })
}
// 실제 모드: Playwright headless 캡처 (향후 구현)
```

### 4.3 이미지 호버 프리뷰 (FR-15, FR-16)

**파일**: `src/components/ui/ImageHoverPreview.tsx` (새 파일)

```typescript
type ImageHoverPreviewProps = {
  src: string
  alt?: string
  children: ReactNode  // 트리거 요소 (링크 텍스트 등)
}
```

CSS-only 팝업 (JS 불필요):
```tsx
export const ImageHoverPreview = ({ src, alt, children }: ImageHoverPreviewProps) => (
  <span className="group relative inline-block">
    {children}
    <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 rounded-lg border border-th-border bg-surface-panel p-1 shadow-xl group-hover:block">
      <img src={src} alt={alt ?? ''} className="max-h-64 max-w-sm rounded" loading="lazy" />
    </span>
  </span>
)
```

**스크린샷 버전 목록**: Listing 카드 하단에 evidence 이미지들 표시.

```
┌─────────────────────────────────────────────┐
│ Screenshots (3)                              │
│──────────────────────────────────────────────│
│ [📷 2026-03-01] [📷 2026-02-15] [📷 초기]   │  ← 호버 시 프리뷰
└──────────────────────────────────────────────┘
```

---

## 5. 수정 파일 전체 목록

### Group A (워크플로우)

| # | 파일 | 작업 | 난이도 |
|---|------|------|:------:|
| A1 | `src/app/(protected)/reports/[id]/ReportActions.tsx` | Cancel→Archive, Approve&Submit 추가 | 중 |
| A2 | `src/app/api/reports/[id]/approve-submit/route.ts` | 새 API | 중 |
| A3 | `src/lib/i18n/locales/en.ts` | i18n 키 추가 | 낮 |
| A4 | `src/lib/i18n/locales/ko.ts` | i18n 키 추가 | 낮 |

### Group B (템플릿)

| # | 파일 | 작업 | 난이도 |
|---|------|------|:------:|
| B1 | `src/types/templates.ts` | 새 타입 정의 | 낮 |
| B2 | `src/lib/demo/data.ts` | 데모 템플릿 3개 추가 | 낮 |
| B3 | `src/lib/templates/interpolate.ts` | 변수 치환 엔진 | 중 |
| B4 | `src/app/api/templates/route.ts` | 템플릿 CRUD API (목록/생성) | 중 |
| B5 | `src/app/api/templates/[id]/route.ts` | 템플릿 CRUD API (상세/수정/삭제) | 중 |
| B6 | `src/app/(protected)/reports/[id]/TemplatePanel.tsx` | 템플릿 선택 SlidePanel | 높 |
| B7 | `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` | 템플릿 적용 버튼 연동 | 중 |
| B8 | `src/app/(protected)/settings/TemplatesTab.tsx` | 템플릿 관리 UI | 높 |
| B9 | `src/app/(protected)/settings/page.tsx` | Settings 탭에 Templates 추가 | 낮 |
| B10 | `supabase/migrations/005_report_templates.sql` | DB 마이그레이션 | 낮 |

### Group C (Listing + 스크린샷)

| # | 파일 | 작업 | 난이도 |
|---|------|------|:------:|
| C1 | `src/app/(protected)/reports/[id]/page.tsx` | ListingInfo 타입 확장 + select 확장 | 낮 |
| C2 | `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` | rating/review/price 표시 + 캡처버튼 | 중 |
| C3 | `src/app/api/reports/[id]/screenshot/route.ts` | 스크린샷 캡처 API | 중 |
| C4 | `src/components/ui/ImageHoverPreview.tsx` | 호버 프리뷰 컴포넌트 | 낮 |
| C5 | `src/app/(protected)/reports/ReportsContent.tsx` | Quick View에 rating/review 추가 | 낮 |
| C6 | `src/lib/i18n/locales/en.ts` | 스크린샷/rating 관련 i18n | 낮 |
| C7 | `src/lib/i18n/locales/ko.ts` | 스크린샷/rating 관련 i18n | 낮 |

**총 21개 파일** (새 파일 10개, 수정 11개)

---

## 6. 구현 순서 (체크리스트)

### Step 1: Group A — 워크플로우 개선
- [ ] A3, A4: i18n 키 추가 (approveAndSubmit, approveOnly, archiveReport 등)
- [ ] A2: `/api/reports/[id]/approve-submit/route.ts` 생성
- [ ] A1: `ReportActions.tsx` — Cancel 제거, Archive 확장, Approve&Submit 추가

### Step 2: Group B — 템플릿 시스템
- [ ] B1: `src/types/templates.ts` 생성
- [ ] B10: `supabase/migrations/005_report_templates.sql` 생성
- [ ] B2: 데모 템플릿 데이터 추가
- [ ] B3: `interpolate.ts` 변수 치환 엔진
- [ ] B4, B5: 템플릿 API routes
- [ ] B6: `TemplatePanel.tsx` 선택 SlidePanel
- [ ] B7: `ReportDetailContent.tsx` 템플릿 적용 버튼 + 연동
- [ ] B8, B9: Settings 템플릿 관리 UI

### Step 3: Group C — Listing 확장 + 스크린샷
- [ ] C1: `page.tsx` ListingInfo 타입 + select 확장
- [ ] C2: `ReportDetailContent.tsx` rating/review/price/brand + 캡처 버튼
- [ ] C3: `/api/reports/[id]/screenshot/route.ts` 생성
- [ ] C4: `ImageHoverPreview.tsx` 컴포넌트
- [ ] C5: Quick View에 rating/review 추가
- [ ] C6, C7: i18n 키 추가

### Step 4: 검증
- [ ] 기존 E2E 94개 테스트 통과 확인
- [ ] 새 기능 E2E 테스트 추가
- [ ] `pnpm typecheck && pnpm lint && pnpm build`

---

## 7. E2E 테스트 업데이트 계획

### 기존 테스트 영향

| 테스트 파일 | 영향 | 필요 변경 |
|------------|------|----------|
| `reports-queue.spec.ts` | Quick View에 rating 추가됨 | 새 필드 존재 검증 추가 |
| `reports-detail.spec.ts` | 버튼 텍스트 변경, 새 필드 | Cancel→Archive, 새 버튼 셀렉터 |
| `settings.spec.ts` | Templates 탭 추가 | 탭 존재 확인 |

### 새 테스트 추가

| 테스트 | 내용 |
|--------|------|
| Archive 버튼 동작 | Report Detail에서 Archive 클릭 → 모달 → 사유 입력 → 확인 |
| Approve & Submit | pending_review 리포트에서 원클릭 승인제출 |
| 템플릿 선택 | 템플릿 버튼 → SlidePanel → 목록 → Apply → body 업데이트 |
| Listing 확장 | rating/review/price 필드 존재 확인 |
| 캡처 버튼 | DEMO_MODE에서 캡처 버튼 클릭 → 목업 동작 |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-03-03 | Initial design — 3 Groups, 21 files, 16 FR |
