# Design: report-slide-panel

## Overview
Reports 테이블에서 row 클릭 시 풀 페이지 이동 대신 SlidePanel로 디테일 표시.
리스트 컨텍스트(필터, 페이지, 스크롤) 유지하면서 상세 확인 가능.

## Architecture Decision

### 접근: 풀 ReportDetailContent 임베딩 (v2 — 최종)

초기 설계는 "경량 Preview Panel"이었으나, 사용자 피드백으로 변경:
- Preview만 보이면 "Open" 한 번 더 눌러야 Draft 편집 가능 → UX 불편
- 결론: **풀 ReportDetailContent를 SlidePanel 안에 그대로 렌더**

구현 방식:
- `GET /api/reports/{id}` → client-side fetch
- 응답 데이터로 `buildTimelineEvents()` 호출하여 timeline 생성
- `ReportDetailContent`에 `embedded` prop 전달 → BackButton/타이틀 숨김
- Template 선택, Draft 편집, AI Write, Autosave 모두 패널 안에서 동작

## SlidePanel 구성

```
┌─ SlidePanel Header ─────────────────────────────┐
│ [X] Report Detail              [Status Badge]    │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌─ ReportDetailContent (embedded=true) ───────┐ │
│  │                                             │ │
│  │ [Status Badge] [Editing] [Actions ▶]        │ │
│  │                                             │ │
│  │ ── Violation Info ─────────────────────     │ │
│  │ ── Listing Card ───────────────────────     │ │
│  │ ── Screenshot ─────────────────────────     │ │
│  │ ── BR Case ────────────────────────────     │ │
│  │ ── Draft Editor (Title + Body + Tabs) ──    │ │
│  │    [Edit] [Templates] [AI Write]            │ │
│  │    (Autosave 활성)                           │ │
│  │ ── BR Form Fields (해당 시) ───────────     │ │
│  │ ── Timeline ───────────────────────────     │ │
│  │ ── Snapshot Viewer (모니터링 시) ──────     │ │
│  │ ── Related Reports ────────────────────     │ │
│  │                                             │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
└──────────────────────────────────────────────────┘
```

## SlidePanel Size 규격

| Size | Width | 용도 |
|------|-------|------|
| sm | max-w-md | 간단한 정보 |
| md | max-w-lg | 기본 |
| lg | max-w-2xl | Campaigns, Patents |
| xl | max-w-[58vw] | 기존 Preview |
| **2xl** | **max-w-[65vw]** | **Report Detail (풀 컨텐츠)** |

## Data Fetching

SlidePanel은 클라이언트에서 API 호출로 데이터 가져옴:
```
GET /api/reports/{id}  → report 전체 데이터 (listing, users 포함)
```

기존 `/api/reports/[id]/route.ts`가 `*, listings, users` 조인해서 반환.
Timeline은 클라이언트에서 `buildTimelineEvents()`로 생성.
Snapshots는 패널에서는 빈 배열 (풀 페이지에서만 로드).

## 변경 파일

### 1. `src/components/features/ReportPreviewPanel.tsx`
- SlidePanel size="2xl" 안에 `ReportDetailContent` 렌더
- Props: `reportId`, `onClose`, `userRole`, `currentUserId`
- fetch → data → props 매핑 → `ReportDetailContent(embedded=true)`
- 로딩: skeleton, 에러: "Report not found"

### 2. `src/app/(protected)/reports/[id]/ReportDetailContent.tsx`
- `embedded?: boolean` prop 추가
- `embedded=true`: BackButton 제거, 타이틀(h1) 제거, StatusBadge + Actions만 표시
- `embedded=false` (기본): 기존 풀 페이지 레이아웃 유지

### 3. `src/app/(protected)/reports/ReportsContent.tsx`
- `previewReportId` 상태 추가
- Desktop row 클릭: `setPreviewReportId(report.id)`
- Mobile card 클릭: 기존 `router.push` 유지
- `<ReportPreviewPanel reportId={...} onClose={...} userRole={...} />`

### 4. `src/app/(protected)/reports/completed/CompletedReportsContent.tsx`
- 동일 패턴 적용

### 5. `src/components/ui/SlidePanel.tsx`
- `2xl` 사이즈 추가: `max-w-[65vw]`

### 6. `src/components/layout/Sidebar.tsx`
- 펼침 폭: `w-[312px]` → `w-56` (224px) — SlidePanel과 공간 확보
- 이름 길면 `truncate`로 `...` 처리 (기존)

## 반응형 처리

| 화면 | 동작 |
|------|------|
| Desktop (md+) | row 클릭 → SlidePanel (65vw) |
| Mobile (<md) | card 클릭 → `router.push` 풀 페이지 이동 |

## 구현 이력

1. v1: 경량 Preview Panel (읽기 전용 요약) — 사용자 피드백으로 폐기
2. v2: 풀 ReportDetailContent 임베딩 — **최종 채택**
   - Draft 편집, Template, AI Write 모두 패널에서 가능
   - `embedded` prop으로 중복 헤더 제거
