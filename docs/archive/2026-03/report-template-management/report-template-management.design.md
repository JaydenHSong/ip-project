# Report Template Management Design Document

> **Summary**: OMS 67개 + 신규 19개 = 80+ 신고 템플릿 시드 + UI 강화 + AI 프롬프트 연동 설계
>
> **Project**: Sentinel (센티널)
> **Author**: Claude
> **Date**: 2026-03-03
> **Status**: Draft
> **Planning Doc**: [report-template-management.plan.md](../../01-plan/features/report-template-management.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. V01~V19 전 위반 유형에 대해 80+ 참조 템플릿 시드 데이터 생성
2. TemplatesTab에 카테고리별 그룹핑 뷰 추가 (67+ 템플릿 관리 가능)
3. TemplatePanel "Apply" 시 `usage_count` 자동 증가
4. New Report 생성 시 위반 유형 기반 템플릿 추천 UI
5. `/api/ai/analyze`에 관련 템플릿 Top-3 프롬프트 주입
6. Demo 데이터 80+ 확장
7. `pnpm build` + `pnpm typecheck` 통과 보장

### 1.2 Design Principles

- **최소 변경**: 기존 인프라(API, 스키마, UI 컴포넌트) 최대 활용, 신규 파일 최소화
- **데이터 중심**: 코드 변경보다 데이터(시드 템플릿) 품질이 핵심
- **점진적 개선**: 시드 → UI → AI 순서로 각 단계 독립 검증 가능

---

## 2. Current State Analysis

### 2.1 이미 구현된 인프라 (변경 불필요)

| Component | File | Status |
|-----------|------|--------|
| `ReportTemplate` 타입 | `src/types/templates.ts` | 완료 — 10개 변수, 전체 필드 정의 |
| CRUD API | `src/app/api/templates/route.ts`, `[id]/route.ts` | 완료 — GET/POST/PATCH/DELETE |
| DB 스키마 | `supabase/migrations/005_report_templates.sql` | 완료 — RLS, GIN 인덱스 |
| 변수 치환 엔진 | `src/lib/templates/interpolate.ts` | 완료 — 10개 변수 치환 |
| Settings UI | `src/app/(protected)/settings/TemplatesTab.tsx` | 완료 — CRUD + SlidePanel |
| Report Apply | `src/app/(protected)/reports/[id]/TemplatePanel.tsx` | 완료 — 검색/필터/미리보기/적용 |

### 2.2 수정/추가 필요 항목

| # | 항목 | 현재 | 목표 | FR |
|---|------|------|------|-----|
| D1 | 시드 데이터 | 3개 Demo | 80+ 전체 | FR-01, FR-02 |
| D2 | TemplatesTab 그룹핑 | 플랫 리스트 | 카테고리별 접이식 | FR-03 |
| D3 | usage_count 추적 | 미구현 | Apply 시 자동 증가 | FR-05 |
| D4 | New Report 템플릿 추천 | 없음 | 위반 유형 선택 후 추천 | FR-06 |
| D5 | AI 프롬프트 주입 | 스텁 | Top-3 관련 템플릿 주입 | FR-07 |
| D6 | Demo 데이터 확장 | 3개 | 80+ | FR-08 |

---

## 3. Template Seed Data Strategy

### 3.1 템플릿 분배 계획 (V01~V19)

| Sentinel Code | 위반 유형 | OMS 원본 수 | Sentinel 목표 | 카테고리 |
|:---:|-------------|:---:|:---:|------|
| V01 | 상표권 침해 | 3 | 4 | intellectual_property |
| V02 | 저작권 침해 | 4 | 4 | intellectual_property |
| V03 | 특허 침해 | 0 | 4 | intellectual_property |
| V04 | 위조품 판매 | 1 | 3 | intellectual_property |
| V05 | 허위/과장 문구 | 2 | 3 | listing_content |
| V06 | 금지 키워드 | 2 | 3 | listing_content |
| V07 | 부정확한 상품 정보 | 4 | 5 | listing_content |
| V08 | 이미지 정책 위반 | 18 | 8 | listing_content |
| V09 | 타이틀 정책 위반 | 0 | 3 | listing_content |
| V10 | Variation 위반 | 18 | 8 | listing_content |
| V11 | 리뷰 조작 | 5 | 5 | review_manipulation |
| V12 | 리뷰 하이재킹 | 2 | 3 | review_manipulation |
| V13 | 경쟁사 리뷰 악용 | 0 | 2 | selling_practice |
| V14 | 비인가 판매자 | 0 | 3 | selling_practice |
| V15 | 리스팅 하이재킹 | 6 | 5 | selling_practice |
| V16 | 가격 조작 | 0 | 2 | regulatory_safety |
| V17 | 제한 상품 | 2 | 3 | regulatory_safety |
| V18 | 안전 인증 미비 | 0 | 3 | regulatory_safety |
| V19 | 유통기한 위반 | 0 | 2 | regulatory_safety |
| | **합계** | **67** | **~73** | |

> OMS에서 V08(18개), V10(18개)은 변형(Size/Color 등)이 많지만 Sentinel에서는 AI가 맞춤 생성하므로 대표 패턴 8개로 축소. 대신 OMS에 없던 신규 유형(V03, V09, V13~V19)에 템플릿 추가.

### 3.2 템플릿 콘텐츠 구조

각 템플릿은 Amazon Seller Central의 Report a Violation (RAV) 양식에 맞는 "Explain in detail" 필드용 텍스트:

```
[Title Pattern]
{violation_type} — {variant_description}

[Body Pattern]
Dear Amazon Seller Performance Team,

I am writing to report a violation on ASIN {{ASIN}} ("{{TITLE}}")
sold by {{SELLER}} on Amazon {{MARKETPLACE}}.

[Violation-specific explanation — 2~4 paragraphs]
- What the violation is
- Evidence / specific details
- Amazon policy reference
- Impact on customers / brand

[Closing]
We respectfully request that Amazon review this listing and take
appropriate action. Thank you for your attention to this matter.

Date: {{TODAY}}
```

### 3.3 시드 파일 구조

**파일**: `supabase/migrations/006_seed_templates.sql`

```sql
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default, usage_count)
VALUES
  -- V01: Trademark Infringement (4 templates)
  ('Trademark Infringement — Logo Misuse', '...body...', 'intellectual_property',
   ARRAY['V01'], ARRAY[]::TEXT[], ARRAY['trademark', 'logo'], true, 0),
  ('Trademark Infringement — Name Misuse', '...body...', 'intellectual_property',
   ARRAY['V01'], ARRAY[]::TEXT[], ARRAY['trademark', 'name'], false, 0),
  -- ... 계속
ON CONFLICT DO NOTHING;
```

### 3.4 Demo 데이터 확장 전략

`src/lib/demo/data.ts`의 `DEMO_TEMPLATES` 배열을 분리:

**새 파일**: `src/lib/demo/templates.ts`
- 80+ 템플릿 객체 배열 export
- `data.ts`에서 import하여 `DEMO_TEMPLATES`에 할당
- 파일 크기 관리 목적 (data.ts가 이미 크므로 분리)

```typescript
// src/lib/demo/templates.ts
export const DEMO_TEMPLATES: ReportTemplate[] = [
  {
    id: 'tmpl-001',
    title: 'Trademark Infringement — Logo Misuse',
    body: 'Dear Amazon Seller Performance Team,\n\n...',
    category: 'intellectual_property',
    violation_types: ['V01'],
    marketplace: [],
    tags: ['trademark', 'logo'],
    is_default: true,
    usage_count: 42,
    created_by: 'demo-admin',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
  // ... 72+ more
]
```

---

## 4. UI Changes

### 4.1 [D2] TemplatesTab — 카테고리별 그룹핑

**현재**: 플랫 테이블 (전체 목록)
**변경**: 카테고리별 접이식(accordion) 그룹 + 기존 테이블

**수정 파일**: `src/app/(protected)/settings/TemplatesTab.tsx`

**변경 사항**:

1. **카테고리 필터 탭** 추가 (상단):
```
[All] [IP (15)] [Listing (30)] [Review (10)] [Selling (10)] [Regulatory (10)]
```

2. **그룹 헤더** — 카테고리별 접이식 섹션:
```
▼ Intellectual Property (15 templates)
  [테이블 행들...]
▼ Listing Content (30 templates)
  [테이블 행들...]
```

3. **카운트 배지** — 각 카테고리 탭에 템플릿 수 표시

**구현 방식**:
```typescript
// 기존 templates 상태를 카테고리별 그룹화
const grouped = useMemo(() => {
  const filtered = categoryFilter === 'all'
    ? templates
    : templates.filter(t => t.category === categoryFilter)
  return Object.groupBy(filtered, t => t.category ?? 'uncategorized')
}, [templates, categoryFilter])
```

### 4.2 [D4] New Report — 템플릿 추천 UI

**현재**: `NewReportForm.tsx`에 템플릿 선택 없음
**변경**: 위반 유형 선택 후 "추천 템플릿" 섹션 표시

**수정 파일**: `src/app/(protected)/reports/new/NewReportForm.tsx`

**변경 사항**:

1. 위반 유형 `<select>` 변경 시 관련 템플릿 fetch
2. 추천 템플릿 카드 3개 표시 (is_default 우선, usage_count 순)
3. "Use Template" 클릭 → note 필드에 interpolated body 삽입
4. "Skip" 옵션 — 템플릿 없이 직접 작성

**API 호출**:
```typescript
// 위반 유형 변경 시
const fetchTemplates = async (violationType: string) => {
  const res = await fetch(`/api/templates?violation_type=${violationType}&limit=3`)
  const data = await res.json()
  setSuggestedTemplates(data.templates)
}
```

**UI 영역** (위반 유형 선택 아래):
```
┌─────────────────────────────────────────┐
│ Recommended Templates                    │
│                                          │
│ ┌─ ★ Trademark — Logo Misuse ──────────┐│
│ │ Dear Amazon... {{ASIN}} ...           ││
│ │                     [Preview] [Use]   ││
│ └───────────────────────────────────────┘│
│ ┌─ Trademark — Name Misuse ────────────┐│
│ │ Dear Amazon... {{SELLER}} ...         ││
│ │                     [Preview] [Use]   ││
│ └───────────────────────────────────────┘│
│                                          │
│ [Skip — write manually]                  │
└─────────────────────────────────────────┘
```

---

## 5. API Changes

### 5.1 [D3] usage_count 증가 — 새 엔드포인트

**새 엔드포인트**: `POST /api/templates/[id]/use`

**수정 파일**: `src/app/api/templates/[id]/use/route.ts` (신규)

```typescript
// POST /api/templates/:id/use
// Increments usage_count by 1
export const POST = withAuth(['viewer', 'editor', 'admin'], async (req, { params }) => {
  const supabase = createAdminClient()

  if (isDemoMode()) {
    return NextResponse.json({ success: true })
  }

  const { error } = await supabase.rpc('increment_template_usage', {
    template_id: params.id
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})
```

**DB Function** (Migration에 추가):
```sql
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE report_templates
  SET usage_count = usage_count + 1, updated_at = now()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

> `SECURITY DEFINER`로 RLS 우회 — 모든 사용자가 Apply 가능하되 카운트만 증가.

**호출 위치**: `TemplatePanel.tsx`의 `onApply` 핸들러

```typescript
const handleApply = async (template: ReportTemplate) => {
  const interpolated = interpolateTemplate(template.body, { listing, report })
  onApply(interpolated, template.title)

  // Fire-and-forget usage tracking
  fetch(`/api/templates/${template.id}/use`, { method: 'POST' })
}
```

### 5.2 [D5] AI 프롬프트 템플릿 주입

**수정 파일**: `src/app/api/ai/analyze/route.ts` (또는 `src/lib/ai/` 관련 파일)

**현재**: 템플릿을 fetch하지만 프롬프트에 미포함
**변경**: 위반 유형별 Top-3 템플릿을 프롬프트에 주입

**템플릿 조회 로직**:
```typescript
// 위반 유형 기반 관련 템플릿 조회 (최대 3개)
const { data: relatedTemplates } = await supabase
  .from('report_templates')
  .select('title, body')
  .contains('violation_types', [violationType])
  .order('is_default', { ascending: false })
  .order('usage_count', { ascending: false })
  .limit(3)
```

**프롬프트 주입 형식**:
```
## Reference Report Templates

The following are reference templates used by the team for this violation type.
Use these as style and structure guidance when drafting the report.

### Template 1: {title}
{body}

### Template 2: {title}
{body}

### Template 3: {title}
{body}
```

**토큰 예산**: 각 템플릿 ~200 토큰 × 3 = ~600 토큰. 전체 AI 프롬프트 대비 약 5~10%.

### 5.3 GET /api/templates — limit 파라미터 추가

**수정 파일**: `src/app/api/templates/route.ts`

현재 GET API에 `limit` 파라미터가 없음. New Report 추천 시 Top-3만 가져오기 위해 추가:

```typescript
const limit = searchParams.get('limit')
// ... 기존 query에 추가
if (limit) {
  query = query.limit(Number(limit))
}
```

---

## 6. Migration SQL

### 6.1 새 파일: `supabase/migrations/006_seed_templates.sql`

```sql
-- ============================================
-- Seed Report Templates
-- V01~V19 coverage: 73 templates
-- ============================================

-- Helper function for usage_count increment
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE report_templates
  SET usage_count = usage_count + 1, updated_at = now()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- V01: Trademark Infringement (4 templates)
INSERT INTO report_templates (title, body, category, violation_types, marketplace, tags, is_default) VALUES
(...),  -- Logo Misuse (default)
(...),  -- Name Misuse
(...),  -- Brand Confusion
(...);  -- Unauthorized Use

-- V02: Copyright Infringement (4 templates)
-- V03: Patent Infringement (4 templates)
-- V04: Counterfeit (3 templates)
-- ... V05~V19 각각
```

> 실제 body 텍스트는 Do Phase에서 Amazon 정책 참조하여 작성. 여기서는 구조만 정의.

---

## 7. Files to Create/Modify Summary

### New Files (3)

| File | Purpose | FR |
|------|---------|-----|
| `supabase/migrations/006_seed_templates.sql` | 73+ 템플릿 시드 + increment 함수 | FR-01, FR-02 |
| `src/lib/demo/templates.ts` | Demo 템플릿 데이터 (data.ts에서 분리) | FR-08 |
| `src/app/api/templates/[id]/use/route.ts` | usage_count 증가 API | FR-05 |

### Modified Files (5)

| File | Change | FR |
|------|--------|-----|
| `src/app/(protected)/settings/TemplatesTab.tsx` | 카테고리 필터 탭 + 그룹핑 뷰 | FR-03 |
| `src/app/(protected)/reports/[id]/TemplatePanel.tsx` | Apply 시 usage API 호출 | FR-05 |
| `src/app/(protected)/reports/new/NewReportForm.tsx` | 위반 유형별 추천 템플릿 UI | FR-06 |
| `src/app/api/ai/analyze/route.ts` | 관련 템플릿 Top-3 프롬프트 주입 | FR-07 |
| `src/app/api/templates/route.ts` | GET에 `limit` 파라미터 추가 | FR-06 |
| `src/lib/demo/data.ts` | DEMO_TEMPLATES → `./templates.ts`에서 import | FR-08 |

---

## 8. Implementation Order (Do Phase 체크리스트)

### Phase A: 시드 데이터 + Demo 확장

```
A-1. src/lib/demo/templates.ts 생성 — 73+ 템플릿 Demo 데이터
A-2. src/lib/demo/data.ts 수정 — DEMO_TEMPLATES를 templates.ts에서 import
A-3. supabase/migrations/006_seed_templates.sql 작성 — 시드 + increment 함수
A-4. Demo 모드에서 Settings > Templates 확인 — 73+ 항목 표시
```

### Phase B: UI 개선 + 사용량 추적

```
B-1. src/app/api/templates/route.ts — GET에 limit 파라미터 추가
B-2. src/app/api/templates/[id]/use/route.ts 생성 — usage_count 증가 API
B-3. src/app/(protected)/settings/TemplatesTab.tsx — 카테고리 필터 탭 + 그룹핑
B-4. src/app/(protected)/reports/[id]/TemplatePanel.tsx — Apply 시 usage API 호출
B-5. src/app/(protected)/reports/new/NewReportForm.tsx — 추천 템플릿 UI
```

### Phase C: AI 연동

```
C-1. src/app/api/ai/analyze/route.ts — 관련 템플릿 Top-3 조회 + 프롬프트 주입
```

### Phase D: 검증

```
D-1. pnpm typecheck 통과
D-2. pnpm lint 통과 (src/)
D-3. pnpm build 통과
D-4. Demo 모드: Templates 목록 73+ 확인
D-5. Demo 모드: Report Detail > Apply Template 동작 확인
D-6. Demo 모드: New Report > 위반 유형별 추천 표시 확인
```

---

## 9. Test Checklist (Gap Analysis 기준)

| # | 검증 항목 | 기대 결과 |
|---|----------|----------|
| T1 | `pnpm typecheck` | 0 errors |
| T2 | `pnpm lint` (src/) | 0 errors |
| T3 | `pnpm build` | Build success |
| T4 | `src/lib/demo/templates.ts` 존재 | 73+ 템플릿 객체 |
| T5 | `006_seed_templates.sql` 존재 | 유효한 SQL, 73+ INSERT |
| T6 | V01~V19 모두 최소 1개 템플릿 매핑 | grep 검증 |
| T7 | TemplatesTab에 카테고리 필터 존재 | `categoryFilter` 상태 |
| T8 | `/api/templates/[id]/use/route.ts` 존재 | POST 핸들러 |
| T9 | TemplatePanel Apply에 usage API 호출 | fetch 확인 |
| T10 | NewReportForm에 추천 템플릿 UI | `suggestedTemplates` 상태 |
| T11 | AI analyze에 템플릿 프롬프트 주입 | `Reference Report Templates` 문자열 |
| T12 | GET /api/templates에 limit 파라미터 | `searchParams.get('limit')` |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-03 | Initial draft — 3 new files, 6 modified files, 73+ templates | Claude |
