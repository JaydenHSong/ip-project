# Report Detail UX Improvements — Design

> **Feature**: Clone, 레이아웃, Autosave 버그, 페이지네이션, report_number, 리사이즈 컬럼
> **Plan**: [report-detail-ux.plan.md](../../01-plan/features/report-detail-ux.plan.md)
> **Created**: 2026-03-11
> **Status**: Completed

---

## 1. Implementation Items

| # | Item | Files | Description |
|---|------|-------|-------------|
| D1 | Clone API | `src/app/api/reports/[id]/clone/route.ts` | 기존 케이스 복사 → 새 draft |
| D2 | Clone 버튼 | `ReportActions.tsx` | submitted~archived 상태에서 Clone as New 버튼 |
| D3 | 레이아웃 재구성 | `ReportDetailContent.tsx` | Title 분리, BR Form Fields 통합 섹션 |
| D4 | Recommended Template 이동 | `ReportDetailContent.tsx` | Templates 패널 내부로 이동 |
| D5 | Autosave 버그 수정 | `ReportDetailContent.tsx` | 에러 복구 + approve 시 항상 body 전송 |
| D6 | BR Case ID 라벨 | `ReportDetailContent.tsx` | BR Case → BR Case ID |
| D7 | PD Reported 태그 | `ReportDetailContent.tsx` | 풀 배너 → 인라인 태그 (status badge 옆) |
| D8 | 페이지네이션 | `completed/page.tsx`, `CompletedReportsContent.tsx` | 서버사이드 count+range, PaginationLink |
| D9 | report_number | DB migration, `ReportsContent.tsx`, `CompletedReportsContent.tsx` | 시퀀스 기반 고유 번호 |
| D10 | 리사이즈 컬럼 | `useResizableColumns.ts`, 6개 테이블 | 드래그 리사이즈 + localStorage + auto-fit |

---

## 2. Detailed Design

### D1: Clone API

```typescript
POST /api/reports/:id/clone
Auth: owner, admin, editor

// 복사 필드
listing_id, user_violation_type, violation_category, confirmed_violation_type,
draft_title, draft_subject, draft_body, note

// 새로 설정
status: 'draft'
parent_report_id: 원본 id
created_by: 현재 사용자
note: '[Cloned from {id}]' 또는 '[Cloned] {원본 note}'

// 응답
{ data: { id: string } }
```

### D2: Clone 버튼 위치

`ReportActions` 컴포넌트에서 Delete 버튼 앞에 표시:

| Status | 표시 버튼 |
|--------|----------|
| submitted | Clone as New |
| monitoring | BR 재신고, **Clone as New** |
| resolved | BR 재신고, **Clone as New** |
| unresolved | 강제 재제출, **Clone as New** |
| archived | **Clone as New** |

클릭 시 → API 호출 → 성공 시 새 report 페이지로 `router.push`

### D3: Draft Editor 레이아웃 재구성

**Before**:
```
[Title Input]
[Subject Input]
[Body Textarea]
── BR Form Fields ──
  [Product URLs]
  [Seller URL / Policy URL / ASINs / Order ID]
```

**After**:
```
[Title Input]  ← 독립 (섹션 밖)

── BR Form Fields ──  ← 통합 bordered 섹션
  [Subject Input]
  [Body Textarea]
  [Product URLs]
  [Seller URL / Policy URL / ASINs / Order ID]
  [Autosave indicator]
```

**Desktop (side-by-side)**:
- 왼쪽: Title (상단) + BR Form Fields 섹션
- 오른쪽: Templates 패널 (Recommended Template 배너 포함)

**Mobile (tabs)**:
- Edit 탭: Title (상단) + BR Form Fields 섹션
- Templates 탭: Recommended Template 배너 + BrTemplateList

### D4: Recommended Template 이동

**Before**: Draft 카드 위에 독립 배너로 표시
**After**: Templates 패널 내부 상단에 표시 (BrTemplateList 위)

조건: `suggestedTemplate && !templateDismissed && !editBody`

### D5: Autosave 버그 수정

**문제 1**: PATCH 실패 시 `autoSaveStatus`가 'saving'에서 복구 안 됨
```typescript
// Before
if (res.ok) { ... }
// catch만 idle로 복구

// After
if (res.ok) { ... } else { setAutoSaveStatus('idle') }
```

**문제 2**: Approve 시 `hasChanges` 조건으로 body 누락 가능
```typescript
// Before
...(hasChanges ? { edited_draft_body: editBody } : {})

// After
edited_draft_title: editTitle,
edited_draft_subject: editSubject,
edited_draft_body: editBody,  // 항상 전송
```

**문제 3**: Approve 클릭 시 autosave 타이머와 레이스 컨디션
```typescript
// handleSubmit 시작 시 pending timer 취소
if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
```

### D6: BR Case ID 라벨

`ReportDetailContent.tsx`:
```
Before: <h2>BR Case</h2>
After:  <h2>BR Case ID</h2>
```

### D7: PD Reported 인라인 태그

**Before**: `submitted` 상태에서 큰 녹색 배너 (아이콘 + 텍스트 + 설명)
**After**: StatusBadge 옆에 작은 태그로 표시

```
[Submitted] [✓ PD Reported]  ← 같은 라인, 태그 스타일
```

- 녹색 pill 스타일 (`bg-st-success-bg text-st-success-text`)
- 체크 아이콘 + "PD Reported" 텍스트
- regular/embedded 헤더 모두 적용

### D8: 완료 리포트 페이지네이션

**Server Component** (`completed/page.tsx`):
```typescript
const PAGE_SIZE = 100

// Count query (별도)
let countQuery = supabase
  .from('reports')
  .select('id', { count: 'exact', head: true })
  .in('status', statusFilter)

// Data query with range
.range(from, to)
```

**Client Component** (`CompletedReportsContent.tsx`):
- Props: `page`, `totalPages`, `totalCount`, `pageSize`
- 타이틀에 총 건수 표시: `Completed Reports (26,035)`
- `PaginationLink` 컴포넌트: 이전/다음 + 페이지 번호 (최대 7개 표시)
- `getPaginationRange` 헬퍼: 현재 페이지 중심으로 범위 계산

### D9: report_number

**DB 스키마**:
```sql
ALTER TABLE reports ADD COLUMN report_number INTEGER;
CREATE SEQUENCE reports_report_number_seq;
-- 기존 26,984건 백필 (created_at ASC 순서)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn FROM reports
)
UPDATE reports SET report_number = numbered.rn FROM numbered WHERE reports.id = numbered.id;
ALTER TABLE reports ALTER COLUMN report_number SET DEFAULT nextval('reports_report_number_seq');
ALTER TABLE reports ALTER COLUMN report_number SET NOT NULL;
CREATE UNIQUE INDEX idx_reports_report_number ON reports(report_number);
```

**프론트 표시**:
- 헤더: `No.` (Code 아님)
- 값: `{String(report.report_number).padStart(5, '0')}` — 예: `00001`
- `RPT-` 프리픽스는 백엔드 전용

### D10: 리사이즈 테이블 컬럼

**훅** (`src/hooks/useResizableColumns.ts`):
```typescript
useResizableColumns({
  storageKey: string,        // localStorage 키
  defaultWidths: number[],   // 기본 컬럼 너비 배열 (px)
  minWidth?: number,         // 최소 너비 (기본 40px)
})
→ { containerRef, tableStyle, getColStyle, getResizeHandleProps, resetWidths }
```

**핵심 동작**:
- `containerRef`: 스크롤 컨테이너 div에 부착 → 첫 로드 시 너비 측정
- 첫 로드 (저장값 없음): `scaleToFit()` → 기본 비율 유지하며 컨테이너 100% 채움
- 드래그: `handleMouseDown` → `mousemove` → `widths[index]` 업데이트
- `tableStyle`: `width: sum(widths)` — 정확한 픽셀로 잡아 반대쪽 안 움직임
- 저장: `localStorage.setItem('col-widths:{key}', JSON.stringify(widths))`
- 더블클릭: 해당 컬럼을 현재 컨테이너 기준 기본 비율로 복원

**리사이즈 핸들**:
- 위치: `right: -3px` (컬럼 경계 중앙), `height: 200vh` (테이블 전체 높이)
- 호버: `bg-th-accent/30` — 컬럼 전체 경계선이 빛남
- 드래그 중: `cursor: col-resize`, `user-select: none`

**SortableHeader 수정**:
- `children` prop 추가 → 리사이즈 핸들을 children으로 전달
- `className`에 `relative` 추가

**적용 테이블 6개**:

| 페이지 | storageKey | 파일 |
|--------|-----------|------|
| Reports Queue | `reports-queue-v3` | `ReportsContent.tsx` |
| Completed Reports | `reports-completed-v3` | `CompletedReportsContent.tsx` |
| Archived Reports | `reports-archived` | `ArchivedReportsContent.tsx` |
| Campaigns | `campaigns` | `CampaignsContent.tsx` |
| IP Registry | `patents` | `PatentsContent.tsx` |
| Notices | `notices` | `NoticesContent.tsx` |

---

## 3. 수정 파일 목록

```
src/hooks/useResizableColumns.ts              — NEW: 리사이즈 컬럼 훅
src/app/api/reports/[id]/clone/route.ts        — NEW: Clone API
src/app/(protected)/reports/[id]/
  ReportActions.tsx                            — Clone 버튼 + handleClone
  ReportDetailContent.tsx                      — 레이아웃 재구성, autosave 수정, BR Case ID
src/app/(protected)/reports/
  ReportsContent.tsx                           — report_number, 리사이즈 컬럼
  completed/page.tsx                           — 서버사이드 페이지네이션
  completed/CompletedReportsContent.tsx         — 페이지네이션 UI, report_number, 리사이즈
  archived/ArchivedReportsContent.tsx           — 리사이즈 컬럼
src/app/(protected)/campaigns/CampaignsContent.tsx  — 리사이즈 컬럼
src/app/(protected)/patents/PatentsContent.tsx      — 리사이즈 컬럼
src/app/(protected)/notices/NoticesContent.tsx       — 리사이즈 컬럼
src/components/ui/Card.tsx                     — forwardRef 지원
src/components/ui/SortableHeader.tsx            — children prop + relative
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-11 | Initial — Clone, 레이아웃, autosave 버그, PD 태그 | Claude |
| 2.0 | 2026-03-11 | 페이지네이션, report_number, 리사이즈 컬럼 추가 | Claude |
