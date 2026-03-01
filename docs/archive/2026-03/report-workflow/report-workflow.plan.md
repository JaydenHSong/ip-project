# Plan: Report Approval Workflow & State Lifecycle

> **Feature**: report-workflow
> **Requirements**: F12 (검토/승인 워크플로우), F20a (상태 라이프사이클), F30 (AI 강화 재신고)
> **Priority**: P0 (MS2 Gate 전제조건)
> **Created**: 2026-03-01
> **Status**: Draft

---

## 1. Problem Statement

현재 Report 관련 **타입과 백엔드 API는 완전 구현**되었으나, **UI 핸들러가 모두 stub** (`router.refresh()`)이며 상태 전환이 실제로 동작하지 않음. MS2 Gate 질문 "AI가 위반 판단 + 신고서 드래프트 → 승인/반려 → SC 신고 접수까지 동작하는가?"에 답하려면 전체 워크플로우 파이프라인을 연결해야 함.

---

## 2. Current State Analysis

### 이미 있는 것 (재사용)
| 영역 | 파일 | 상태 |
|------|------|------|
| Report 타입 | `src/types/reports.ts` | 완전 (11개 상태, 모든 필드) |
| API 타입 | `src/types/api.ts` | 대부분 (Approve/Reject/Cancel Request 존재) |
| Approve API | `src/app/api/reports/[id]/approve/route.ts` | 완전 구현 |
| Reject API | `src/app/api/reports/[id]/reject/route.ts` | 완전 구현 |
| Cancel API | `src/app/api/reports/[id]/cancel/route.ts` | 완전 구현 |
| PATCH API | `src/app/api/reports/[id]/route.ts` | 완전 구현 (draft 편집) |
| Report Detail UI | `ReportDetailContent.tsx` | 부분 (표시는 됨, save stub) |
| Action Buttons UI | `ReportActions.tsx` | 부분 (버튼 있음, 핸들러 stub) |
| AI Rewrite | `src/app/api/ai/rewrite/route.ts` | 완전 구현 |
| AI Learn | `src/app/api/ai/learn/route.ts` | 완전 구현 |
| Notifications | `src/lib/notifications/google-chat.ts` | 기본 함수 존재 |

### 없는 것 (새로 구현)
| 영역 | 설명 |
|------|------|
| **UI → API 연결** | ReportActions 5개 핸들러 전부 stub |
| **Save 연결** | ReportDetailContent.handleSave stub |
| **Reject UI** | 반려 버튼 + rejection_category 선택 UI 없음 |
| **Submit Review API** | draft → pending_review 전용 엔드포인트 없음 |
| **Submit to SC API** | approved → submitted SC 접수 엔드포인트 없음 |
| **Resubmit API** | 재신고 (unresolved → resubmitted) 없음 |
| **알림 호출** | notifyDraftReady 등 실제 호출 위치 없음 |
| **상태별 UI** | cancelled/monitoring/resolved 상태 표시 부족 |

---

## 3. Requirements

### F12 — 검토/승인 워크플로우

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| F12-1 | Editor가 Draft → Submit for Review 가능 | P0 |
| F12-2 | Admin/Editor가 Pending Review → Approve 가능 | P0 |
| F12-3 | Admin/Editor가 Pending Review → Reject 가능 (사유+카테고리 필수) | P0 |
| F12-4 | Rewrite 요청: 피드백 → AI 재작성 → 새 드래프트 반영 | P0 |
| F12-5 | 드래프트 직접 편집 후 저장 (PATCH) | P0 |
| F12-6 | 직접 수정 후 즉시 승인 (edit + approve 원샷) | P1 |
| F12-7 | Cancel (draft/pending_review/approved 상태에서만) | P0 |

### F20a — 상태 라이프사이클

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| F20a-1 | draft → pending_review 전환 | P0 |
| F20a-2 | pending_review → approved/rejected 전환 | P0 |
| F20a-3 | rejected → draft (재수정 후 재제출 가능) | P1 |
| F20a-4 | approved → submitted (SC 접수 API) | P0 |
| F20a-5 | 모든 상태에 대한 UI 배지/표시 | P0 |
| F20a-6 | 상태 변경 시 Google Chat 알림 | P1 |

### F30 — AI 강화 재신고 (부분)

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| F30-1 | Rewrite 모달에서 피드백 → /api/ai/rewrite 호출 | P0 |
| F30-2 | 승인된 드래프트로 Opus 학습 트리거 | P1 |

---

## 4. Implementation Scope

### In Scope (이번 PDCA)
1. ReportActions.tsx 5개 핸들러 실제 API 연결
2. ReportDetailContent.tsx handleSave 실제 API 연결
3. Reject UI 추가 (반려 버튼 + rejection_category 선택)
4. Submit Review API 엔드포인트 신설
5. Submit to SC API 엔드포인트 신설 (상태 전환만, 실제 SC 자동화는 F13a)
6. 모든 상태에 대한 UI 완성 (배지, 이력, 상태별 액션 분기)
7. Google Chat 알림 호출 추가 (approve/reject/submit-review 시)
8. Rewrite 모달 → /api/ai/rewrite API 연결
9. Opus 학습 트리거 (approve 시 /api/ai/learn 비동기 호출)

### Out of Scope
- F13a: SC 자동화 (Playwright SC 폼 자동 입력) — 별도 PDCA
- F16: 신고 이력 타임라인 UI — 별도 PDCA
- F33: 웹 수동 기입 — 별도 PDCA
- Monitoring/Follow-up (submitted → monitoring → resolved/unresolved) — MS3

---

## 5. Technical Approach

### 5.1 API 엔드포인트 추가

```
신규:
POST /api/reports/[id]/submit-review   → draft → pending_review
POST /api/reports/[id]/submit-sc       → approved → submitted (상태만 전환)

기존 (수정 없음):
POST /api/reports/[id]/approve         → pending_review → approved  ✅
POST /api/reports/[id]/reject          → pending_review → rejected  ✅
POST /api/reports/[id]/cancel          → draft/pending_review/approved → cancelled  ✅
PATCH /api/reports/[id]                → 드래프트 편집  ✅
```

### 5.2 UI 핸들러 연결 (ReportActions.tsx)

```typescript
// 기존 stub → 실제 fetch 호출로 교체
handleSubmitReview → POST /api/reports/[id]/submit-review
handleApprove      → POST /api/reports/[id]/approve (+ optional edit)
handleRewrite      → POST /api/ai/rewrite → PATCH /api/reports/[id]
handleCancel       → POST /api/reports/[id]/cancel
handleSubmitSC     → POST /api/reports/[id]/submit-sc
```

### 5.3 Reject UI 추가

- pending_review 상태에서 [Reject] 버튼 추가
- 모달: rejection_category (6개 라디오) + rejection_reason (필수 Textarea)
- POST /api/reports/[id]/reject 호출

### 5.4 알림 연결

```
submit-review → notifyDraftReady(reportId, asin, type)
approve       → notifyApproved(reportId, asin) [신규 함수]
reject        → notifyRejected(reportId, asin, reason) [신규 함수]
submit-sc     → notifySubmittedToSC(reportId, asin) [신규 함수]
```

### 5.5 Opus 학습 트리거

- Approve 시 original_draft_body ≠ draft_body인 경우
- 비동기로 POST /api/ai/learn 호출 (실패해도 approve는 성공)

---

## 6. Success Criteria

| 기준 | 조건 |
|------|------|
| **P0 완료** | Draft → Submit Review → Approve → Submit SC 전체 흐름이 UI에서 동작 |
| **P0 완료** | Reject (사유+카테고리 입력) 흐름이 UI에서 동작 |
| **P0 완료** | Cancel 흐름이 UI에서 동작 |
| **P0 완료** | Rewrite (AI 재작성) 흐름이 UI에서 동작 |
| **P0 완료** | TypeScript typecheck PASS |
| **Match Rate** | 설계 대비 90% 이상 |

---

## 7. Risk & Dependencies

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Supabase RLS 정책이 상태 변경을 차단 | API 실패 | 기존 API 이미 RLS 테스트됨, 동일 패턴 적용 |
| SC 접수 API에서 실제 SC 자동화 기대 | 범위 혼동 | F13a로 분리, 이번엔 상태 전환만 |
| AI rewrite API 실패 시 UI 처리 | UX 저하 | 에러 표시 + 재시도 버튼 |

---

## 8. Estimated Effort

| Phase | 항목 수 | 설명 |
|-------|---------|------|
| Phase A: API 추가 | 3 | submit-review, submit-sc route + 알림 함수 |
| Phase B: UI 연결 | 5 | ReportActions 핸들러 5개 + handleSave |
| Phase C: Reject UI | 2 | Reject 모달 + rejection_category 선택 |
| Phase D: 상태별 UI | 3 | 모든 상태 배지, 이력 표시, 액션 분기 |
| Phase E: 학습/알림 | 2 | Opus 학습 트리거 + 알림 호출 |
| **합계** | **15** | |

---

## 9. Related Documents

| 문서 | 경로 |
|------|------|
| Sentinel Design (archived) | `docs/archive/2026-03/sentinel/sentinel.design.md` |
| AI Analysis (archived) | `docs/archive/2026-03/ai-analysis/` |
| Report Types | `src/types/reports.ts` |
| API Types | `src/types/api.ts` |
| Project Context | `Sentinel_Project_Context.md` |
