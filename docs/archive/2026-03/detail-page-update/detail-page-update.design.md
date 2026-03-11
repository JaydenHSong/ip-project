# Detail Page Update — Design

> **Feature**: Report Detail + Draft 페이지 BR 카테고리 싱크 + 템플릿 전환
> **Plan**: [detail-page-update.plan.md](../../01-plan/features/detail-page-update.plan.md)
> **Created**: 2026-03-10
> **Phase**: Design

---

## 1. Implementation Items

| # | Item | Files | Description |
|---|------|-------|-------------|
| D1 | BR Templates API 필터링 | `src/app/api/br-templates/route.ts` | `?form_type=X&category=Y` 쿼리 파라미터 추가 |
| D2 | BrTemplateList 컴포넌트 | `src/app/(protected)/reports/[id]/BrTemplateList.tsx` | br_templates 기반 새 템플릿 목록 (InlineTemplateList 대체) |
| D3 | Form Type 드롭다운 | `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` | Draft 섹션에 BR 카테고리 선택 + 가이드 배너 |
| D4 | AI Draft form type 전달 | `src/app/api/ai/draft/route.ts`, `src/lib/ai/draft.ts` | 사용자 선택 form type 수신 → 프롬프트 주입 |
| D5 | 승인 시 form type 반영 | `src/app/api/reports/[id]/approve/route.ts`, `src/lib/reports/br-data.ts` | 사용자 선택 form type → br_submit_data |
| D6 | 레거시 참조 정리 | `ReportDetailContent.tsx` | `/api/templates` 호출 제거, auto-suggestion br_templates 전환 |

---

## 2. Detailed Design

### D1: BR Templates API 필터링

**File**: `src/app/api/br-templates/route.ts`

현재 GET은 전체 조회만 지원. 추가:

```
GET /api/br-templates?form_type=other_policy&category=Variation
```

```typescript
// 추가할 필터 로직
const formType = req.nextUrl.searchParams.get('form_type')
const category = req.nextUrl.searchParams.get('category')

if (formType) query = query.eq('br_form_type', formType)
if (category) query = query.eq('category', category)
```

변경량: ~6줄 추가

---

### D2: BrTemplateList 컴포넌트

**File**: `src/app/(protected)/reports/[id]/BrTemplateList.tsx` (신규)

`InlineTemplateList`를 대체하는 새 컴포넌트.

**Props**:
```typescript
type BrTemplateListProps = {
  formType: BrFormType          // 선택된 BR 카테고리
  listing: Partial<Listing>     // 플레이스홀더 치환용
  onApply: (body: string, title: string) => void
}
```

**동작**:
1. `GET /api/br-templates?form_type={formType}` 호출
2. category별 그룹핑 (아코디언 or 탭)
3. 템플릿 선택 시 `[bracket]` 플레이스홀더를 listing 데이터로 자동 치환
4. 검색 필터 (제목/코드)

**UI 구조**:
```
┌─────────────────────────────────────┐
│ 🔍 Search templates...              │
├─────────────────────────────────────┤
│ ▸ Pre-announcement Listing (3)      │
│ ▸ Variation (15)                    │  ← category별 그룹
│ ▾ Main image (13)                   │
│   ┌───────────────────────────────┐ │
│   │ MI-01: Main image violation   │ │
│   │ [Preview 3 lines...]     Use  │ │
│   └───────────────────────────────┘ │
│   ┌───────────────────────────────┐ │
│   │ MI-02: Stock photo usage      │ │
│   │ [Preview 3 lines...]     Use  │ │
│   └───────────────────────────────┘ │
│ ▸ Wrong Category (2)                │
│ ▸ Product review (5)                │
└─────────────────────────────────────┘
```

**플레이스홀더 치환**:
```typescript
// br_templates.placeholders에 정의된 변수들
// 예: ["ASIN", "product name", "brand name"]
const interpolateBrTemplate = (body: string, listing: Partial<Listing>): string => {
  return body
    .replace(/\[ASIN\]/gi, listing.asin ?? '[ASIN]')
    .replace(/\[product name\]/gi, listing.title ?? '[product name]')
    .replace(/\[brand name\]/gi, listing.brand ?? '[brand name]')
    .replace(/\[seller name\]/gi, listing.seller_name ?? '[seller name]')
    .replace(/\[marketplace\]/gi, listing.marketplace ?? '[marketplace]')
}
```

---

### D3: Form Type 드롭다운

**File**: `src/app/(protected)/reports/[id]/ReportDetailContent.tsx`

Draft 편집 섹션 (edit/templates 탭 위) 에 추가:

**State 추가**:
```typescript
const [brFormType, setBrFormType] = useState<BrFormType>(
  getBrFormType(report.user_violation_type) ?? 'other_policy'
)
```

**UI**:
```
┌─────────────────────────────────────────┐
│ BR Report Category                      │
│ ┌─────────────────────────────────────┐ │
│ │ ▼ Other policy violations           │ │  ← 드롭다운
│ └─────────────────────────────────────┘ │
│ ℹ️ Describe which Amazon policy is      │  ← 가이드 배너
│    being violated and how.              │
│    Also accepts: storefront URL,        │
│    policy URL                           │
└─────────────────────────────────────────┘
│                                         │
│ ┌─ Edit ──┬─ Templates ─┐              │
│ │ [Draft editing area]   │              │
```

**드롭다운 옵션**:
```typescript
const BR_FORM_OPTIONS: { value: BrFormType; label: string }[] = [
  { value: 'other_policy', label: 'Other policy violations' },
  { value: 'incorrect_variation', label: 'Incorrect variation' },
  { value: 'product_not_as_described', label: 'Product not as described' },
  { value: 'product_review', label: 'Product review violation' },
]
```

**가이드 배너 데이터** — `BR_FORM_DESCRIPTION_GUIDE` (이미 `br-data.ts`에 존재) export해서 사용

**가시성 조건**: `isDraftEditable && isBrReportable(report.user_violation_type)` 일 때만 표시

---

### D4: AI Draft form type 전달

**File 1**: `src/app/api/ai/draft/route.ts`

```typescript
type DraftRequest = {
  report_id: string
  br_form_type?: BrFormType  // 추가
}
```

`generateDraft` 호출 시:
```typescript
const draft = await generateDraft(client, analysis, listing as Listing, {
  skillContent,
  trademarks: trademarkNames,
  template: templateContext,
  violationCode: typedReport.user_violation_type,
  brFormType: body.br_form_type,  // 추가 — 사용자 선택값 우선
})
```

**File 2**: `src/lib/ai/draft.ts`

```typescript
options: {
  // ...기존
  brFormType?: BrFormType  // 추가
}

// getBrFormContext 호출 시 오버라이드:
const brFormContext = options.brFormType
  ? getBrFormContext(null, options.brFormType)  // form type 직접 지정
  : options.violationCode
    ? getBrFormContext(options.violationCode)
    : null
```

**File 3**: `src/lib/reports/br-data.ts`

`getBrFormContext` 시그니처 확장:
```typescript
const getBrFormContext = (violationCode: string | null, formTypeOverride?: BrFormType): string | null => {
  const formType = formTypeOverride ?? (violationCode ? BR_VIOLATION_MAP[violationCode] : null)
  if (!formType) return null
  // ... 기존 로직
}
```

**File 4**: `src/app/api/ai/draft/route.ts` — BR 템플릿 조회도 form type으로 필터:
```typescript
const brFormType = body.br_form_type ?? getBrFormType(violationType)
const { data: templates } = await supabase
  .from('br_templates')
  .select('code, title, body, br_form_type, category')
  .eq('active', true)
  .eq('br_form_type', brFormType ?? 'other_policy')
  .limit(3)
```

---

### D5: 승인 시 form type 반영

**File 1**: `src/app/api/reports/[id]/approve/route.ts`

Request body 확장:
```typescript
const body = (await req.json().catch(() => ({}))) as ApproveReportRequest & {
  br_form_type?: BrFormType
}
```

`buildBrSubmitData` 호출 시 form type 오버라이드:
```typescript
const brSubmitData = listing && isBrReportable(report.user_violation_type)
  ? buildBrSubmitData({
      report: { ... },
      listing: { ... },
      formTypeOverride: body.br_form_type,  // 추가
    })
  : null
```

**File 2**: `src/lib/reports/br-data.ts`

```typescript
type BuildBrDataInput = {
  report: { ... }
  listing: { ... }
  formTypeOverride?: BrFormType  // 추가
}

export const buildBrSubmitData = ({ report, listing, formTypeOverride }: BuildBrDataInput): BrSubmitData | null => {
  const formType = formTypeOverride ?? BR_VIOLATION_MAP[report.user_violation_type]
  if (!formType) return null
  // ... 기존 로직
}
```

---

### D6: 레거시 참조 정리

**File**: `src/app/(protected)/reports/[id]/ReportDetailContent.tsx`

삭제:
- `import { InlineTemplateList }` → `import { BrTemplateList }`
- Template auto-suggestion의 `fetch('/api/templates')` → `fetch('/api/br-templates?form_type=...')`
- `<InlineTemplateList .../>` → `<BrTemplateList formType={brFormType} .../>`

유지:
- `InlineTemplateList.tsx` 파일 자체는 삭제하지 않음 (다른 곳에서 사용 가능성)

---

## 3. Implementation Order

```
1. D1: API 필터 추가 (5분)
2. D5: br-data.ts formTypeOverride (10분)
3. D4: AI draft form type 전달 (15분)
4. D2: BrTemplateList 컴포넌트 (30분)
5. D3+D6: ReportDetailContent 드롭다운 + 레거시 교체 (20분)
6. Build + Test
```

## 4. Data Flow

```
[User selects form type in dropdown]
    │
    ├──→ BrTemplateList: GET /api/br-templates?form_type=X
    │     └──→ 카테고리별 그룹, 플레이스홀더 치환, Use 클릭 → editBody에 적용
    │
    ├──→ AI Write 클릭: POST /api/ai/draft { report_id, br_form_type: X }
    │     └──→ getBrFormContext(null, X) → 프롬프트 주입
    │     └──→ br_templates에서 form_type=X 템플릿 few-shot 조회
    │
    └──→ Approve 클릭: POST /api/reports/:id/approve { br_form_type: X }
          └──→ buildBrSubmitData({ formTypeOverride: X })
          └──→ br_submit_data.form_type = X (크롤러가 사용)
```

---

**Next Phase**: `/pdca do detail-page-update`
