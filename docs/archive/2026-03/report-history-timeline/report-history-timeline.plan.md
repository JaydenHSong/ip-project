# Report History Timeline (F16) Planning Document

> **Summary**: 신고 상세 페이지에 시간순 이력 타임라인 UI 추가 — 상태 변경, AI 분석, 편집, 승인/반려 등 모든 이벤트를 시각적 타임라인으로 표시
>
> **Project**: Sentinel
> **Version**: 0.3
> **Author**: Claude (AI)
> **Date**: 2026-03-01
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

현재 Report Detail 페이지는 `created_at`, `approved_at`, `rejected_at` 등 핵심 타임스탬프만 grid 레이아웃으로 표시한다. 신고의 전체 라이프사이클(Draft → Review → Approve/Reject/Re-write → Submitted → Monitoring → Resolved)을 시각적 타임라인으로 보여주어 누가 언제 어떤 액션을 했는지 한눈에 파악할 수 있게 한다.

### 1.2 Background

- **F16** (신고 이력 및 상태 추적, P0) — 기획 문서 명시 기능
- 기존 OMS 시스템에도 "Activity Log" 탭이 있었음 (누가 언제 생성/수정했는지 이력)
- Report 상태 전환이 복잡함 (11개 상태) — 타임라인 없이는 이력 추적 어려움
- `audit_logs` 테이블이 이미 존재하여 report 관련 이벤트를 필터링 가능

### 1.3 Related Documents

- Sentinel_Project_Context.md — F16 정의, Activity Log 탭, 모니터링 타임라인 UI
- `src/types/reports.ts` — ReportStatus 11개 상태 정의
- `src/app/api/audit-logs/route.ts` — 기존 감사 로그 API
- `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` — 현재 Report Detail UI

---

## 2. Scope

### 2.1 In Scope

- [ ] FR-01: Report 관련 audit_logs 데이터를 시간순 타임라인으로 표시
- [ ] FR-02: 이벤트 유형별 아이콘/컬러 차별화 (상태변경, AI분석, 편집, 승인, 반려 등)
- [ ] FR-03: 각 이벤트에 액터(누가), 시간, 상세내용 표시
- [ ] FR-04: Report Detail 페이지 하단에 타임라인 카드 통합
- [ ] FR-05: 모바일 반응형 타임라인 레이아웃
- [ ] FR-06: API — Report ID 기준 audit_logs 필터링 엔드포인트

### 2.2 Out of Scope

- 실시간 업데이트 (WebSocket/SSE) — 페이지 새로고침으로 충분
- 팔로업 모니터링 이벤트 (MS3 범위)
- 타임라인 댓글/멘션 기능
- audit_logs 테이블 스키마 변경 (기존 구조 활용)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Report ID 기준 audit_logs 조회 API (GET /api/reports/[id]/history) | High | Pending |
| FR-02 | 타임라인 컴포넌트 — 세로 타임라인, 이벤트 노드 + 연결선 | High | Pending |
| FR-03 | 이벤트 유형별 아이콘 매핑 (created, status_changed, ai_analyzed, edited, approved, rejected, cancelled, submitted, rewritten) | High | Pending |
| FR-04 | 이벤트 상세 정보 표시 (old_status → new_status, 반려 사유, AI 결과 등) | Medium | Pending |
| FR-05 | Report Detail 페이지에 "Activity Timeline" 카드 추가 | High | Pending |
| FR-06 | i18n 지원 (EN/KO) | Medium | Pending |
| FR-07 | 데모 모드 지원 (DEMO_MODE=true일 때 목업 데이터) | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 타임라인 로드 < 500ms | 브라우저 DevTools |
| Accessibility | 타임라인 시맨틱 마크업 (ol/li), screen reader 대응 | 수동 검증 |
| Responsive | 모바일 320px ~ 데스크탑 1440px 대응 | 브라우저 확인 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] API 엔드포인트 작동 (GET /api/reports/[id]/history)
- [ ] 타임라인 UI 렌더링 (최소 5개 이벤트 유형 지원)
- [ ] 모바일/데스크탑 반응형 레이아웃
- [ ] i18n 키 추가 (EN/KO)
- [ ] 데모 모드 호환
- [ ] pnpm typecheck + pnpm build 통과

### 4.2 Quality Criteria

- [ ] Zero lint errors
- [ ] Build succeeds
- [ ] 타입 안전성 보장

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| audit_logs 테이블에 report 이벤트가 미기록 | High | Medium | Report 상태 변경 API에서 audit_log 삽입이 안 되면, 기존 report 필드(approved_at, rejected_at 등)에서 이벤트 재구성 |
| audit_logs 데이터 없는 기존 보고서 | Medium | High | report 자체 타임스탬프(created_at, approved_at 등)를 fallback 타임라인으로 생성 |
| 이벤트가 많을 때 성능 | Low | Low | 최대 50개로 제한 + 최신순 정렬 |

---

## 6. Architecture Considerations

### 6.1 데이터 소스 전략

두 가지 데이터 소스를 결합:

1. **audit_logs 테이블** — entity_type='report' AND entity_id=reportId 로 필터
2. **report 필드 fallback** — created_at, approved_at, rejected_at 등에서 이벤트 재구성

이를 API에서 병합하여 단일 타임라인으로 반환.

### 6.2 이벤트 유형 정의

```typescript
type TimelineEventType =
  | 'created'           // 신고 생성
  | 'ai_analyzed'       // AI 분석 완료
  | 'status_changed'    // 상태 변경
  | 'draft_edited'      // 드래프트 편집
  | 'submitted_review'  // 검토 요청
  | 'approved'          // 승인
  | 'rejected'          // 반려
  | 'cancelled'         // 취소
  | 'rewritten'         // AI 재작성
  | 'submitted_sc'      // SC 신고
```

### 6.3 기존 패턴 재사용

- Card/CardHeader/CardContent 레이아웃
- StatusBadge 스타일 토큰 (st-success, st-warning, st-danger)
- 기존 audit-logs API 패턴

---

## 7. UI Wireframe

```
┌─────────────────────────────────────────┐
│ Activity Timeline                        │
├─────────────────────────────────────────┤
│                                          │
│  ● Created                    Mar 1, 10am│
│  │ Created by John Doe                   │
│  │                                       │
│  ● AI Analyzed                Mar 1, 10am│
│  │ V03 detected (87% confidence)         │
│  │ Disagreement: User V01 ≠ AI V03       │
│  │                                       │
│  ● Submitted for Review       Mar 1, 11am│
│  │ Status: draft → pending_review        │
│  │                                       │
│  ● Draft Edited               Mar 1, 2pm │
│  │ Edited by Jane Smith                  │
│  │                                       │
│  ● Approved                   Mar 1, 3pm │
│  │ Approved by Admin User                │
│  │                                       │
│  ● Submitted to SC            Mar 1, 3pm │
│    Case ID: SC-12345                     │
│                                          │
└─────────────────────────────────────────┘
```

---

## 8. Implementation Plan

| # | Item | Est. LoC | Dependency |
|---|------|---------|------------|
| 1 | TimelineEvent 타입 정의 (types/reports.ts) | ~25 | — |
| 2 | GET /api/reports/[id]/history 엔드포인트 | ~80 | 1 |
| 3 | ReportTimeline 컴포넌트 | ~120 | 1 |
| 4 | i18n 키 추가 (EN/KO) | ~30 | — |
| 5 | ReportDetailContent에 타임라인 통합 | ~15 | 2, 3 |
| 6 | page.tsx에서 history 데이터 fetch + props 전달 | ~20 | 2 |
| 7 | 데모 모드 목업 데이터 | ~30 | 3 |

**예상 총 LoC**: ~320

---

## 9. Next Steps

1. [ ] Write design document (`report-history-timeline.design.md`)
2. [ ] Start implementation
3. [ ] Gap analysis

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-01 | Initial draft | Claude (AI) |
