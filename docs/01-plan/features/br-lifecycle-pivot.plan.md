# BR Lifecycle Pivot — Plan

> **Summary**: BR 리포트 상태 체계 재정비 — submitted 제거, Answered 탭 추가, Completed 정의 명확화
>
> **Project**: Sentinel (ip-project)
> **Version**: 0.9.0-beta
> **Author**: PM
> **Date**: 2026-03-14
> **Status**: Approved

---

## 1. Overview

### 1.1 Purpose

현재 BR 리포트 상태 체계에 두 가지 구조적 결함이 있다.

1. `submitted`는 BR 크롤러 제출 직후 수 초~수 분 내에 `monitoring`으로 전환되는데, Completed Reports에 포함되어 있어 혼란을 야기한다.
2. `monitoring` 상태도 Completed Reports에 포함되어 있어, 실제로 활성 케이스가 완료 목록에 노출된다.
3. 아마존이 답장을 보낸 케이스(`br_case_status = 'answered'`)에 대한 전용 뷰가 없어, Admin이 답장 필요 케이스를 놓치기 쉽다.

### 1.2 Background

v2 워크플로우 피벗(2026-03-11) 이후 BR 단일 트랙이 확정되었다. 실제 운영 사이클은 다음과 같다.

```
Draft → Pending → Approved → [BR Submitting] → Monitoring
  → (Amazon 답장) → Answered
  → Admin 확인 후 Reply → back to Monitoring
  → Admin 판단 → Close(resolved/unresolved/escalated)
```

현재 코드에서 `submitted` 상태는 두 경로로 사용된다.
- `br-result/route.ts`: BR 제출 성공 시 즉시 `monitoring`으로 전환 (submitted를 거치지 않음)
- `start-monitoring/route.ts`: 수동으로 `submitted → monitoring` 전환 (레거시 경로)
- `approve/route.ts`: 비BR 리포트의 경우 `approved → submitted`로 전환

`submitted`의 실제 수명이 매우 짧거나 비BR 경로 전용임을 감안하면, 이를 `monitoring`으로 통합하거나 명확히 분리하는 것이 합리적이다.

### 1.3 Related Documents

- v2 Workflow Pivot Plan: `docs/01-plan/features/v2-workflow-pivot.plan.md`
- Miro Board: https://miro.com/app/board/uXjVGzbA7VM=/

---

## 2. Scope

### 2.1 In Scope

- [ ] Reports 큐 페이지: STATUS_TABS에서 `submitted` 탭 제거, `monitoring` 탭 유지
- [ ] Reports 큐 페이지: "Answered" 탭 추가 (`br_case_status = 'answered'` 필터)
- [ ] Completed Reports 페이지: COMPLETED_STATUSES에서 `submitted`, `monitoring` 제거
- [ ] Completed Reports 페이지: STATUS_TABS에서 `submitted`, `monitoring`, `resubmitted` 탭 정리
- [ ] `start-monitoring` API: `submitted` 선제조건 제거 또는 `monitoring` 상태도 허용
- [ ] Dashboard stats API: statusPipeline에서 `submitted` 제거
- [ ] Dashboard stats API: `approvedCount` 계산에서 `submitted` 제거
- [ ] BrCaseQueueBar: `answered` smart_queue 항목 추가 (선택적)
- [ ] StatusBadge: `submitted` 뱃지 레이블/스타일 재검토
- [ ] DB 마이그레이션: 기존 `submitted` 상태 레코드를 `monitoring`으로 일괄 업데이트
- [ ] `REPORT_STATUSES` 상수: `submitted` 제거 여부 결정 (하위 호환 고려)

### 2.2 Out of Scope

- `resubmitted`, `escalated` 상태의 의미 재정의 (별도 태스크)
- BR 케이스 자동 닫기 로직 (v2 phase 3)
- Answered 탭에서 Reply 인라인 작성 UI (현재는 detail 페이지로 이동)
- `br_case_status = 'answered'`에 대한 알림 시스템 연동

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Completed Reports에 `submitted`, `monitoring` 상태 리포트가 표시되지 않아야 한다 | Must | Pending |
| FR-02 | Reports 큐에 "Answered" 탭이 추가되어 `br_case_status = 'answered'` 케이스만 표시되어야 한다 | Must | Pending |
| FR-03 | 기존 DB에서 `status = 'submitted'`인 레코드를 `monitoring`으로 마이그레이션해야 한다 | Must | Pending |
| FR-04 | Completed Reports의 "All" 탭은 `resolved`, `unresolved`, `escalated`만 포함해야 한다 | Must | Pending |
| FR-05 | Dashboard stats의 statusPipeline에서 `submitted`가 제거되어야 한다 | Should | Pending |
| FR-06 | `resubmitted` 상태가 여전히 Completed로 분류되어야 하는지 결정 및 반영 | Should | Pending |
| FR-07 | BrCaseQueueBar에 `answered` 카운트가 표시되어야 한다 | Could | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Data Integrity | DB 마이그레이션 후 기존 리포트 데이터 손실 없음 | COUNT 비교 전/후 |
| Backward Compat | 기존 API 응답 구조 유지 (`submitted` 값이 반환될 수 있는 경로 점검) | 타입체크 + 빌드 성공 |
| Build | pnpm typecheck && pnpm lint && pnpm build 성공 | CI |

---

## 4. Impact Analysis (PM 검토 결과)

### 4.1 `submitted` 상태의 실제 사용 현황

코드 리딩 결과:

| 위치 | 현재 동작 | 변경 영향 |
|------|----------|----------|
| `br-result/route.ts` | `br_submitting → monitoring` 직행 (submitted 경유 없음) | 영향 없음 |
| `start-monitoring/route.ts` | `submitted → monitoring` 전환 (수동 레거시 경로) | 선제조건 수정 필요 |
| `approve/route.ts` | 비BR: `approved → submitted` | 비BR 리포트가 있다면 유지 필요 |
| `bulk-approve/route.ts` | 비BR: `approved → submitted` | 동일 |
| `force-resubmit/route.ts` | 재제출 시 `submitted` 사용 | 마이그레이션 후 `monitoring`으로 변경 필요 |
| `reports/[id]/route.ts` | 수동 status 변경으로 `submitted` 허용 | 타입 제거 시 validation 업데이트 |
| `stats/route.ts` | statusPipeline에 `submitted` 포함, approvedCount에 `submitted` 포함 | 제거 필요 |
| `ai/learn/route.ts` | `approved` 또는 `submitted` 상태에서 AI 학습 허용 | `monitoring` 추가로 대체 |

**핵심 발견**: BR 제출 성공 경로(`br-result`)는 이미 `submitted`를 건너뛰고 `monitoring`으로 직행한다. `submitted`는 사실상 레거시이거나 비BR 경로 전용이다.

### 4.2 Completed Reports 정의 변경

현재: `['submitted', 'monitoring', 'resolved', 'unresolved', 'resubmitted', 'escalated']`
변경: `['resolved', 'unresolved', 'escalated']`

- `resubmitted`도 제거 대상인지 확인 필요: 재신고된 케이스는 새 리포트로 만들어지므로, 원본은 `resubmitted`로 종결 처리됨 → Completed에 포함하는 것이 맞음. 유지.
- `escalated`는 에스컬레이션으로 종결된 케이스 → 유지.

**결론**: 변경 후 Completed STATUSES = `['resolved', 'unresolved', 'resubmitted', 'escalated']`

### 4.3 "Answered" 탭 위치 결정

- Reports 큐(active 탭들)에 추가 — `monitoring` 상태 + `br_case_status = 'answered'`
- 탭 순서: All / Draft / BR Submitting / Monitoring / **Answered**
- BrCaseQueueBar의 `new_reply` 스마트 필터와 의미 중복 있음 → Answered 탭은 아마존이 공식 답장을 보낸 케이스(케이스 상태 변경), new_reply는 메시지 기반. 두 가지는 다름. 탭 추가 정당함.

### 4.4 Dashboard 위젯 영향

`/api/dashboard/stats/route.ts`의 `statusPipeline` 배열에 `submitted`가 하드코딩되어 있다. 제거 후 `monitoring` 옆에 `answered`(br_case_status 기반)를 추가하면 더 유용한 파이프라인 뷰가 된다.

### 4.5 `resubmitted` 상태 유효성

v2 워크플로우에서 재신고(클론)는 Admin이 수동으로 새 리포트를 생성하고 원본을 닫는 구조(`parent_report_id`로 연결). `resubmitted`는 원본 리포트의 종결 상태로 여전히 유효하다. 유지.

### 4.6 Extension 영향

Extension은 Draft 생성까지만 관여. `submitted`, `monitoring` 상태 변경은 웹+크롤러 영역. Extension 코드 변경 없음.

### 4.7 Notification System 영향

`src/types/notifications.ts`의 `report_submitted` 타입이 있다. `submitted` 상태 제거 시 이 notification이 트리거되는 시점을 검토해야 한다. 현재 트리거 위치 확인 후 `monitoring` 전환 시점으로 변경 필요할 수 있음.

### 4.8 DB 마이그레이션

현재 DB에 `status = 'submitted'`인 레코드가 존재할 수 있다. 이를 `monitoring`으로 일괄 업데이트. 단, `br_case_id`가 null인 경우(비BR 수동 제출)는 별도 처리 검토.

```sql
-- 검토 쿼리
SELECT count(*), br_case_id IS NULL as no_case
FROM reports
WHERE status = 'submitted'
GROUP BY no_case;
```

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| DB에 `submitted` 레코드가 남아 Completed에서 사라짐 | Medium | Medium | 마이그레이션 전 COUNT 확인, 마이그레이션 후 검증 |
| `start-monitoring` API가 `submitted` 선제조건 체크로 에러 반환 | Low | Low | 선제조건을 `['submitted', 'monitoring']`으로 완화 또는 제거 |
| Dashboard 차트에서 `submitted` 데이터 포인트 유실 | Low | Low | historical 데이터는 DB 레벨에서 유지, 집계 로직만 변경 |
| `report_submitted` notification 트리거 혼선 | Low | Medium | 트리거 시점을 `monitoring` 전환으로 이동 |
| TypeScript 타입 변경으로 빌드 실패 | High | Medium | 타입 변경 후 즉시 typecheck 실행, 56개 파일 참조 전수 조사 |

---

## 6. Decisions (확정)

1. **`submitted` 완전 제거** — 타입 + 56개 파일 수정. 기술 부채 깔끔 정리.
2. **`resubmitted` Completed 유지** — 원본 케이스 종결 상태.
3. **Answered 탭**: `status = 'monitoring' AND br_case_status = 'answered'`
4. **BrCaseQueueBar**: answered 카운트 추가 (Could, 이번 스코프 포함).

---

## 7. Success Criteria

- [ ] Completed Reports 페이지에 `monitoring` 상태 리포트가 표시되지 않음
- [ ] Reports 큐에 "Answered" 탭이 표시되고 아마존 답장 케이스만 노출됨
- [ ] 기존 DB 레코드 마이그레이션 무결성 확인 (COUNT 비교)
- [ ] `pnpm typecheck && pnpm lint && pnpm build` 성공
- [ ] BrCaseQueueBar의 "Total: N monitoring" 카운트 정확성 유지

---

## 8. Implementation Order (제안)

1. **DB 마이그레이션** (Supabase SQL Editor에서 먼저) — `submitted → monitoring`
2. **Completed Reports 수정** — COMPLETED_STATUSES 배열 변경 + STATUS_TABS 정리
3. **Reports 큐 수정** — STATUS_TABS에 Answered 탭 추가, Reports 쿼리 로직 업데이트
4. **API 수정** — stats/route.ts, start-monitoring 선제조건, ai/learn 허용 상태
5. **타입 정리** — `submitted` 제거 결정 시 REPORT_STATUSES + StatusBadge 업데이트
6. **빌드 검증** — typecheck → lint → build

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-14 | Initial draft — 코드 분석 기반 PM 검토 결과 | PM |
