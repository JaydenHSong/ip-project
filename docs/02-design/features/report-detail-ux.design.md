# Report Detail UX Improvements — Design

> **Feature**: Clone 기능, BR Form Fields 레이아웃, Body 세이브 버그, PD Reported 태그
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

---

## 3. 수정 파일 목록

```
src/app/api/reports/[id]/clone/route.ts     — NEW: Clone API
src/app/(protected)/reports/[id]/
  ReportActions.tsx                          — Clone 버튼 + handleClone
  ReportDetailContent.tsx                    — 레이아웃 재구성, autosave 수정, BR Case ID
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-11 | Initial — 전체 구현 완료 | Claude |
