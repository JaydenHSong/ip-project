# Web Manual Report Design Document

> **Summary**: 웹에서 ASIN/Marketplace/위반유형을 직접 입력하여 수동 신고를 생성하는 `/reports/new` 페이지
>
> **Project**: Sentinel
> **Version**: 0.3
> **Author**: Claude (AI)
> **Date**: 2026-03-02
> **Status**: Draft
> **Planning Doc**: [web-manual-report.plan.md](../../01-plan/features/web-manual-report.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 기존 CampaignForm 패턴을 그대로 재활용하여 일관된 폼 경험 제공
- `POST /api/reports` 기존 API 재활용 (API 변경 최소화)
- 리스팅 없는 ASIN은 자동 생성 (upsert)
- AI 분석 자동 트리거로 신고 품질 향상

### 1.2 Design Principles

- 기존 코드 패턴 일관성 (CampaignForm, Select, Input, Card)
- 최소 신규 파일 (page.tsx + NewReportForm.tsx)
- API 변경 최소화 (기존 POST /api/reports 확장)

---

## 2. Architecture

### 2.1 Component Diagram

```
┌───────────────────────────────────────────────────────┐
│  /reports/new/page.tsx (Server)                       │
│  ├── Auth check (getCurrentUser + role guard)         │
│  └── <NewReportForm />                                │
│       ├── ASIN + Marketplace + Title + Seller (Input) │
│       ├── Violation Category (Select)                 │
│       ├── Violation Type (Select, filtered)           │
│       ├── Note (Textarea)                             │
│       └── Submit → POST /api/reports/manual           │
└───────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  POST /api/reports/manual/route.ts (Server)           │
│  ├── 1. Validate input (asin, marketplace, type)      │
│  ├── 2. Upsert listing (find or create)               │
│  ├── 3. Duplicate report check (F26)                  │
│  ├── 4. Create report (draft status)                  │
│  ├── 5. Trigger AI analysis (fire-and-forget)         │
│  └── 6. Return { report_id, listing_id }              │
└───────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
User fills form
  → Client validates (ASIN required, violation_type required)
  → POST /api/reports/manual
  → Server: listings.upsert({asin, marketplace})
  → Server: reports.insert({listing_id, user_violation_type, ...})
  → Server: fetch /api/ai/analyze (fire-and-forget)
  → Response: { report_id }
  → Client: router.push(`/reports/${report_id}`)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| NewReportForm | VIOLATION_TYPES, VIOLATION_GROUPS | 위반 유형 2단계 선택 |
| NewReportForm | MARKETPLACES, MARKETPLACE_CODES | 마켓플레이스 선택 |
| NewReportForm | Input, Select, Textarea, Button, Card | UI 컴포넌트 |
| page.tsx | getCurrentUser, hasRole | 권한 체크 |
| API Route | createClient (Supabase) | DB 접근 |
| API Route | /api/ai/analyze | AI 분석 트리거 |

---

## 3. Data Model

### 3.1 요청/응답 타입

```typescript
// src/types/api.ts에 추가
export type ManualReportRequest = {
  asin: string
  marketplace: string      // MarketplaceCode
  title?: string           // 선택 (빈값 시 ASIN으로 대체)
  seller_name?: string     // 선택
  user_violation_type: ViolationCode
  violation_category: string
  note?: string
}

export type ManualReportResponse = {
  report_id: string
  listing_id: string
  is_new_listing: boolean
  is_duplicate: boolean       // 중복 시 true (+ existing_report_id)
  existing_report_id?: string
}
```

### 3.2 기존 테이블 재활용

- `listings` — asin + marketplace 조합으로 upsert
- `reports` — listing_id 기반으로 insert (기존 스키마 그대로)

새 테이블 없음.

---

## 4. API Specification

### 4.1 Endpoint

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/reports/manual | 수동 신고 생성 | editor, admin |

### 4.2 상세

#### `POST /api/reports/manual`

**Request:**
```json
{
  "asin": "B0DXXXXXXX",
  "marketplace": "US",
  "title": "Fake Spigen Case for iPhone 16",
  "seller_name": "ShadySeller",
  "user_violation_type": "V01",
  "violation_category": "intellectual_property",
  "note": "상표 로고 무단 사용"
}
```

**Response (201 Created):**
```json
{
  "report_id": "uuid-xxx",
  "listing_id": "uuid-yyy",
  "is_new_listing": true,
  "is_duplicate": false
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | VALIDATION_ERROR | asin, user_violation_type, violation_category 누락 |
| 409 | DUPLICATE_REPORT | 동일 listing + 동일 위반유형 + 활성 상태 존재 |

**409 응답 시 body:**
```json
{
  "error": {
    "code": "DUPLICATE_REPORT",
    "message": "이미 활성 신고가 있습니다.",
    "details": { "existing_report_id": "uuid-zzz" }
  }
}
```

### 4.3 서버 로직 순서

```
1. Input validation (asin, user_violation_type, violation_category 필수)
2. Supabase: listings에서 asin + marketplace 조회
   → 없으면: listings.insert({ asin, marketplace, title, seller_name, source: 'manual' })
   → 있으면: listing.id 사용
3. Supabase: reports에서 중복 체크 (기존 F26 로직 복사)
   → 중복이면: 409 반환
4. Supabase: reports.insert({
     listing_id, user_violation_type, violation_category, status: 'draft', created_by
   })
5. Fire-and-forget: POST /api/ai/analyze { listing_id }
6. Return 201 { report_id, listing_id, is_new_listing, is_duplicate: false }
```

---

## 5. UI/UX Design

### 5.1 Page Layout

```
┌──────────────────────────────────────────────┐
│ ← Back    New Report                         │
├──────────────────────────────────────────────┤
│                                              │
│  ┌─ Card: Listing Information ────────────┐  │
│  │                                        │  │
│  │  ASIN *           [B0DXXXXXXX_____]    │  │
│  │  Marketplace *    [US ▾]               │  │
│  │  Title (opt)      [Fake Spigen Case__] │  │
│  │  Seller (opt)     [ShadySeller_______] │  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌─ Card: Violation Details ──────────────┐  │
│  │                                        │  │
│  │  Category *       [Select category ▾]  │  │
│  │  Type *           [Select type ▾]      │  │
│  │                                        │  │
│  │  Note (optional)                       │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │ 상표 로고 무단 사용              │  │  │
│  │  │                                  │  │  │
│  │  └──────────────────────────────────┘  │  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ⚠️ [warning box] Duplicate report exists    │
│     → View existing report (#rpt-xxx)        │
│                                              │
│                      [Cancel] [Create Report] │
└──────────────────────────────────────────────┘
```

### 5.2 User Flow

```
Reports Queue → Click "+ New Report" button
  → /reports/new
  → Fill ASIN + Marketplace
  → Select Violation Category → Type list filters
  → Select Violation Type
  → (Optional) Add note
  → Click "Create Report"
  → POST /api/reports/manual
  → Success → Redirect to /reports/{id}
  → Duplicate → Show warning with link to existing report
  → Error → Show error banner
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| page.tsx (Server) | `src/app/(protected)/reports/new/page.tsx` | Auth guard + layout wrapper |
| NewReportForm (Client) | `src/app/(protected)/reports/new/NewReportForm.tsx` | 폼 로직 + 제출 |
| Select | `src/components/ui/Select` (기존) | 마켓플레이스/카테고리/타입 선택 |
| Input | `src/components/ui/Input` (기존) | ASIN, Title, Seller 입력 |
| Textarea | `src/components/ui/Textarea` (기존) | Note 입력 |
| Button | `src/components/ui/Button` (기존) | Cancel + Create Report |
| Card | `src/components/ui/Card` (기존) | 섹션 컨테이너 |

### 5.4 위반 유형 2단계 선택 로직

```typescript
// 1단계: 카테고리 선택
const CATEGORY_OPTIONS = Object.entries(VIOLATION_CATEGORIES).map(([key, label]) => ({
  value: key,
  label,
}))

// 2단계: 선택된 카테고리에 해당하는 타입만 표시
const filteredTypes = selectedCategory
  ? VIOLATION_GROUPS[selectedCategory].map(v => ({
      value: v.code,
      label: `${v.code}: ${v.name}`,
    }))
  : []
```

### 5.5 중복 경고 UI

409 응답 시 에러 배너 대신 경고 박스를 표시:

```tsx
{duplicateId && (
  <div className="rounded-lg border border-st-warning-text/30 bg-st-warning-bg px-4 py-3">
    <p className="text-sm font-medium text-st-warning-text">
      {t('reports.new.duplicateWarning')}
    </p>
    <Link href={`/reports/${duplicateId}`} className="text-sm text-th-accent underline">
      {t('reports.new.viewExisting')}
    </Link>
  </div>
)}
```

---

## 6. Error Handling

| Scenario | UI Handling |
|----------|-------------|
| ASIN 미입력 | HTML required + client validation |
| 위반 유형 미선택 | Submit 버튼 disabled |
| API 400 (validation) | Error banner at top of form |
| API 409 (duplicate) | Warning box with link to existing report |
| API 500 (server error) | Error banner with generic message |
| Network error | Error banner "Failed to create report" |

---

## 7. Security

- [x] RBAC: page.tsx에서 viewer 리다이렉트 → editor/admin만 접근
- [x] API: withAuth(['editor', 'admin']) 미들웨어
- [x] Input sanitization: Supabase parameterized queries (SQL injection 방지)
- [x] XSS: React auto-escaping + no dangerouslySetInnerHTML

---

## 8. i18n Keys

### 8.1 English (`en.ts`)

```typescript
reports: {
  new: {
    title: 'New Report',
    listingInfo: 'Listing Information',
    violationDetails: 'Violation Details',
    asin: 'ASIN',
    asinPlaceholder: 'e.g., B0DXXXXXXX',
    marketplace: 'Marketplace',
    listingTitle: 'Title (optional)',
    listingTitlePlaceholder: 'Product listing title',
    sellerName: 'Seller (optional)',
    sellerNamePlaceholder: 'Seller name',
    violationCategory: 'Violation Category',
    selectCategory: 'Select category...',
    violationType: 'Violation Type',
    selectType: 'Select type...',
    note: 'Note (optional)',
    notePlaceholder: 'Additional details about the violation...',
    createReport: 'Create Report',
    creating: 'Creating...',
    duplicateWarning: 'An active report already exists for this listing and violation type.',
    viewExisting: 'View existing report',
    success: 'Report created successfully.',
  },
}
```

### 8.2 Korean (`ko.ts`)

```typescript
reports: {
  new: {
    title: '신규 신고',
    listingInfo: '리스팅 정보',
    violationDetails: '위반 상세',
    asin: 'ASIN',
    asinPlaceholder: '예: B0DXXXXXXX',
    marketplace: '마켓플레이스',
    listingTitle: '제목 (선택)',
    listingTitlePlaceholder: '상품 리스팅 제목',
    sellerName: '판매자 (선택)',
    sellerNamePlaceholder: '판매자명',
    violationCategory: '위반 카테고리',
    selectCategory: '카테고리 선택...',
    violationType: '위반 유형',
    selectType: '유형 선택...',
    note: '메모 (선택)',
    notePlaceholder: '위반에 대한 추가 상세...',
    createReport: '신고 생성',
    creating: '생성 중...',
    duplicateWarning: '이 리스팅과 위반 유형에 대한 활성 신고가 이미 존재합니다.',
    viewExisting: '기존 신고 보기',
    success: '신고가 생성되었습니다.',
  },
}
```

---

## 9. Implementation Order

| # | Item | File | Type | Est |
|---|------|------|------|-----|
| 1 | i18n 키 추가 | `en.ts`, `ko.ts` | Modify | S |
| 2 | API 타입 추가 | `src/types/api.ts` | Modify | S |
| 3 | 수동 신고 API | `src/app/api/reports/manual/route.ts` | New | M |
| 4 | NewReportForm 컴포넌트 | `src/app/(protected)/reports/new/NewReportForm.tsx` | New | L |
| 5 | page.tsx Server Component | `src/app/(protected)/reports/new/page.tsx` | New | S |
| 6 | Reports 목록에 "+ New Report" 버튼 추가 | Reports 관련 페이지 | Modify | S |
| 7 | typecheck + build | - | Verify | S |

---

## 10. File Change Summary

| File | Action | Lines |
|------|--------|-------|
| `src/lib/i18n/locales/en.ts` | Modify | +18 |
| `src/lib/i18n/locales/ko.ts` | Modify | +18 |
| `src/types/api.ts` | Modify | +15 |
| `src/app/api/reports/manual/route.ts` | **New** | ~100 |
| `src/app/(protected)/reports/new/NewReportForm.tsx` | **New** | ~180 |
| `src/app/(protected)/reports/new/page.tsx` | **New** | ~25 |
| **Total** | 3 new + 3 modify | ~356 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial draft | Claude (AI) |
