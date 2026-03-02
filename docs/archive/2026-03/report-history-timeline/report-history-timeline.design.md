# Report History Timeline (F16) Design Document

> **Summary**: Report Detail 페이지에 신고 라이프사이클 타임라인 UI 추가 — report 필드 기반 이벤트 재구성 + 세로 타임라인 컴포넌트
>
> **Project**: Sentinel
> **Version**: 0.3
> **Author**: Claude (AI)
> **Date**: 2026-03-01
> **Status**: Draft
> **Planning Doc**: [report-history-timeline.plan.md](../../01-plan/features/report-history-timeline.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- Report의 전체 라이프사이클을 시각적 타임라인으로 표시
- 별도 audit_logs 테이블 의존 없이 report 필드에서 이벤트 재구성 (현재 audit_log 삽입이 구현되지 않았으므로)
- 기존 ReportDetailContent에 자연스럽게 통합
- 모바일/데스크탑 반응형 지원

### 1.2 Design Principles

- **Zero New Tables**: report 레코드 기존 필드(created_at, approved_at, rejected_at 등)에서 타임라인 이벤트를 서버사이드에서 재구성
- **Server-First**: page.tsx에서 이벤트 배열을 빌드하여 props로 전달 (추가 API 엔드포인트 불필요)
- **Progressive Enhancement**: 향후 audit_logs 기반으로 전환 시 이벤트 타입만 확장하면 됨

---

## 2. Architecture

### 2.1 데이터 흐름

```
page.tsx (Server Component)
  │
  ├─ report 데이터 fetch (기존)
  │
  ├─ buildTimelineEvents(report) → TimelineEvent[]
  │   ├─ created_at → "created" 이벤트
  │   ├─ ai_violation_type 존재 → "ai_analyzed" 이벤트
  │   ├─ status === 'pending_review' → "submitted_review" 이벤트
  │   ├─ approved_at → "approved" 이벤트
  │   ├─ rejected_at → "rejected" 이벤트
  │   ├─ cancelled_at → "cancelled" 이벤트
  │   ├─ edited_at → "draft_edited" 이벤트
  │   ├─ sc_case_id → "submitted_sc" 이벤트
  │   └─ 정렬: timestamp ASC
  │
  └─ <ReportDetailContent timeline={events} .../>
       └─ <ReportTimeline events={events} />
```

### 2.2 컴포넌트 구조

```
reports/[id]/
  ├─ page.tsx              (수정: buildTimelineEvents + timeline prop)
  ├─ ReportDetailContent   (수정: timeline prop 수신 + ReportTimeline 렌더)
  ├─ ReportActions.tsx     (변경 없음)
  └─ ReportTimeline.tsx    (신규: 타임라인 UI 컴포넌트)
```

---

## 3. Data Model

### 3.1 TimelineEvent 타입

```typescript
// src/types/reports.ts에 추가

export const TIMELINE_EVENT_TYPES = [
  'created',
  'ai_analyzed',
  'submitted_review',
  'draft_edited',
  'approved',
  'rejected',
  'cancelled',
  'submitted_sc',
  'rewritten',
] as const

export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number]

export type TimelineEvent = {
  type: TimelineEventType
  timestamp: string
  actor: string | null    // 사용자 이름 (null이면 System/AI)
  detail: string | null   // 상세 내용 (반려 사유, AI 결과 등)
}
```

### 3.2 이벤트 추출 로직 (buildTimelineEvents)

report 레코드의 기존 필드에서 이벤트를 추출:

| 조건 | 이벤트 타입 | timestamp 소스 | actor | detail |
|------|------------|---------------|-------|--------|
| 항상 | `created` | `created_at` | creatorName | null |
| `ai_violation_type !== null` | `ai_analyzed` | `created_at` + 1s | null (AI) | `V{code} ({confidence}%)` |
| `edited_at !== null` | `draft_edited` | `edited_at` | edited_by → user name | null |
| `status !== 'draft'` && no approved/rejected | `submitted_review` | 추정 (created_at ~ approved/rejected 중간) | creatorName | null |
| `approved_at !== null` | `approved` | `approved_at` | approved_by → user name | null |
| `rejected_at !== null` | `rejected` | `rejected_at` | rejected_by → user name | rejection_reason |
| `cancelled_at !== null` | `cancelled` | `cancelled_at` | cancelled_by → user name | cancellation_reason |
| `sc_case_id !== null` | `submitted_sc` | `sc_submitted_at` | null (System) | `Case: {sc_case_id}` |

**정렬**: timestamp ASC (가장 오래된 이벤트가 위)

---

## 4. API Design

### 4.1 추가 API 없음

타임라인 데이터는 page.tsx (Server Component)에서 직접 구성. 이미 fetch하는 report 데이터에 필요한 모든 필드가 포함되어 있으므로 추가 API 엔드포인트는 불필요.

### 4.2 page.tsx 수정사항

기존 report select 쿼리에 추가 필드 포함:

```typescript
// 기존
.select('*, listings!...(asin, title, marketplace, seller_name), users!...(name, email)')

// 변경 후 — 추가 필드
.select(`
  *,
  listings!reports_listing_id_fkey(asin, title, marketplace, seller_name),
  users!reports_created_by_fkey(name, email),
  approved_by_user:users!reports_approved_by_fkey(name),
  rejected_by_user:users!reports_rejected_by_fkey(name),
  cancelled_by_user:users!reports_cancelled_by_fkey(name),
  edited_by_user:users!reports_edited_by_fkey(name)
`)
```

> **주의**: reports 테이블에 approved_by, rejected_by, cancelled_by, edited_by FK가 있는 경우에만 가능. FK가 없으면 user ID만 표시하거나 별도 조회.

### 4.3 Fallback 전략 (FK 없는 경우)

FK join이 실패하면 actor를 null로 설정하고 "System"으로 표시. 향후 FK 추가 시 자동으로 이름 표시됨.

---

## 5. UI/UX Design

### 5.1 ReportTimeline 컴포넌트

```
┌─────────────────────────────────────────────────┐
│ 📋 Activity Timeline                             │
├─────────────────────────────────────────────────┤
│                                                  │
│  ● Report Created                    Feb 28, 11am│
│  │  by Demo Admin                                │
│  │                                               │
│  ◆ AI Analysis Complete              Feb 28, 11am│
│  │  V01: Trademark Infringement (92%)            │
│  │                                               │
│  ○ Submitted for Review              Feb 28, 12pm│
│  │  by Demo Admin                                │
│  │                                               │
│  ● Approved                          Mar 1, 3pm  │
│  │  by Jane Smith                                │
│  │                                               │
│  ◆ Submitted to Seller Central       Mar 1, 3pm  │
│     Case: SC-12345                               │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 5.2 이벤트 유형별 스타일

| 이벤트 | 노드 색상 | 아이콘 모양 |
|--------|----------|-----------|
| created | `text-th-accent` (blue) | ● solid circle |
| ai_analyzed | `text-purple-500` | ◆ diamond |
| submitted_review | `text-th-text-muted` (gray) | ○ hollow circle |
| draft_edited | `text-amber-500` | ● solid |
| approved | `text-st-success-text` (green) | ● solid |
| rejected | `text-st-danger-text` (red) | ● solid |
| cancelled | `text-th-text-muted` (gray) | ● solid |
| submitted_sc | `text-purple-500` | ◆ diamond |
| rewritten | `text-amber-500` | ● solid |

### 5.3 레이아웃 구조

```html
<ol className="relative border-s border-th-border">
  {events.map(event => (
    <li className="mb-6 ms-6">
      {/* 노드 (원형 도트) */}
      <span className="absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full bg-surface-card ring-4 ring-th-bg">
        {/* 이벤트 유형별 아이콘 */}
      </span>
      {/* 이벤트 내용 */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-th-text">{eventTitle}</h3>
          {event.actor && <p className="text-xs text-th-text-muted">by {event.actor}</p>}
          {event.detail && <p className="mt-1 text-xs text-th-text-secondary">{event.detail}</p>}
        </div>
        <time className="text-xs text-th-text-muted whitespace-nowrap">{formattedDate}</time>
      </div>
    </li>
  ))}
</ol>
```

### 5.4 반응형

- **데스크탑**: 타임라인 라인 왼쪽, 이벤트 내용 오른쪽, 시간 우측 정렬
- **모바일**: 동일 레이아웃 (세로 타임라인은 모바일에서도 자연스러움), 시간을 이벤트 제목 아래로 이동

---

## 6. Error Handling

| 상황 | 처리 |
|------|------|
| 이벤트 0개 (신규 report) | "created" 이벤트는 항상 존재하므로 최소 1개 보장 |
| FK join 실패 | actor를 null로 fallback, "System"으로 표시 |
| 타임스탬프 누락 | 해당 이벤트 건너뜀 (타임스탬프 없으면 타임라인에 표시 불가) |
| 데모 모드 | 목업 이벤트 배열 제공 |

---

## 7. Security

- 타임라인은 Report Detail과 동일한 권한으로 접근 (인증된 사용자 전원)
- 추가 API 없으므로 추가 보안 고려 불필요
- 사용자 이름만 표시 (이메일, ID 미표시)

---

## 8. i18n

### 8.1 신규 키

```typescript
// reports.timeline.*
'reports.timeline.title': 'Activity Timeline'
'reports.timeline.created': 'Report Created'
'reports.timeline.aiAnalyzed': 'AI Analysis Complete'
'reports.timeline.submittedReview': 'Submitted for Review'
'reports.timeline.draftEdited': 'Draft Edited'
'reports.timeline.approved': 'Approved'
'reports.timeline.rejected': 'Rejected'
'reports.timeline.cancelled': 'Cancelled'
'reports.timeline.submittedSC': 'Submitted to Seller Central'
'reports.timeline.rewritten': 'AI Re-write Complete'
'reports.timeline.byActor': 'by {name}'
'reports.timeline.system': 'System'
'reports.timeline.ai': 'AI'
```

### 8.2 한국어

```typescript
'reports.timeline.title': '활동 타임라인'
'reports.timeline.created': '신고 생성'
'reports.timeline.aiAnalyzed': 'AI 분석 완료'
'reports.timeline.submittedReview': '검토 요청'
'reports.timeline.draftEdited': '드래프트 수정'
'reports.timeline.approved': '승인'
'reports.timeline.rejected': '반려'
'reports.timeline.cancelled': '취소'
'reports.timeline.submittedSC': 'Seller Central 신고'
'reports.timeline.rewritten': 'AI 재작성 완료'
'reports.timeline.byActor': '{name}'
'reports.timeline.system': '시스템'
'reports.timeline.ai': 'AI'
```

---

## 9. Demo Mode

### 9.1 데모 이벤트 데이터

report별 상태에 맞는 목업 타임라인:

- **rpt-001** (pending_review): created → ai_analyzed → submitted_review
- **rpt-002** (draft): created → ai_analyzed (disagreement)
- **rpt-003** (approved): created → ai_analyzed → submitted_review → approved
- **rpt-004** (rejected): created → ai_analyzed → submitted_review → rejected

---

## 10. Implementation Order

| # | Item | File | Est. LoC | Dependency |
|---|------|------|---------|------------|
| 1 | TimelineEvent 타입 추가 | `src/types/reports.ts` | ~20 | — |
| 2 | buildTimelineEvents 유틸 함수 | `src/lib/timeline.ts` (신규) | ~70 | 1 |
| 3 | i18n 키 추가 (EN/KO) | `src/lib/i18n/locales/{en,ko}.ts` | ~28 | — |
| 4 | ReportTimeline 컴포넌트 | `src/app/(protected)/reports/[id]/ReportTimeline.tsx` (신규) | ~80 | 1, 3 |
| 5 | page.tsx 수정 — timeline 빌드 + props 전달 | `src/app/(protected)/reports/[id]/page.tsx` | ~20 | 2 |
| 6 | ReportDetailContent 수정 — 타임라인 카드 통합 | `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` | ~10 | 4, 5 |
| 7 | 데모 모드 목업 이벤트 | `src/lib/demo/data.ts` | ~30 | 2 |

**예상 총 LoC**: ~258

---

## 11. Verification

- [ ] `pnpm typecheck` — 0 errors
- [ ] `pnpm build` — success
- [ ] 브라우저 확인:
  - `/reports/rpt-001` — 3개 이벤트 (created, ai_analyzed, submitted_review)
  - `/reports/rpt-003` — 4개 이벤트 (+ approved)
  - `/reports/rpt-004` — 4개 이벤트 (+ rejected + rejection_reason 표시)
  - 모바일 반응형 레이아웃

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-01 | Initial draft | Claude (AI) |
