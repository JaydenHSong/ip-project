# BR Case Management — 병렬 개발 총괄

## Status: PENDING
## Assigned Session: (컨트롤 타워 세션)
## Completed At:

---

## 작업 단위 분할

총 11개 기능(R01~R11)을 **6개 병렬 작업 단위**로 분할.
의존 관계를 고려하여 동시 진행 가능한 것끼리 묶음.

### Phase 1 (즉시 병렬 시작 가능 — 3개 팀)

| 작업 단위 | 기능 | 담당 | 예상 시간 | SESSION-BRIEF |
|----------|------|------|:---------:|---------------|
| **Unit A: DB + Types** | 전체 스키마 + 타입 | Dev 1 | 3h | BRCM-UNIT-A |
| **Unit B: Monitor Worker** | R11 크롤러 워커 | Dev 2 | 11h | BRCM-UNIT-B |
| **Unit C: Web UI Phase 1** | R01 + R04 + R07 | Dev 3 | 9h | BRCM-UNIT-C |

### Phase 2 (Phase 1 완료 후 — 3개 팀)

| 작업 단위 | 기능 | 담당 | 예상 시간 | SESSION-BRIEF |
|----------|------|------|:---------:|---------------|
| **Unit D: Thread View** | R03 + R05 | Dev 1 | 9.5h | BRCM-UNIT-D |
| **Unit E: Reply Worker** | R10 크롤러 워커 | Dev 2 | 10h | BRCM-UNIT-E |
| **Unit F: SLA System** | R02 | Dev 3 | 3.5h | BRCM-UNIT-F |

### Phase 3 (Phase 2 완료 후 — 순차)

| 작업 단위 | 기능 | 담당 | 예상 시간 | SESSION-BRIEF |
|----------|------|------|:---------:|---------------|
| **Unit G: Notification** | R06 | - | 8h | (Phase 3 시작 시 작성) |
| **Unit H: AI + Dashboard** | R08 + R09 | - | 15.5h | (Phase 3 시작 시 작성) |

---

## 의존 관계도

```
Phase 1 (병렬)
  Unit A (DB+Types) ──┐
  Unit B (Monitor)  ──┼── Phase 2 시작 조건
  Unit C (Web UI P1) ─┘

Phase 2 (병렬)
  Unit D (Thread) ────┐
  Unit E (Reply)   ───┼── Phase 3 시작 조건
  Unit F (SLA)     ───┘

Phase 3 (순차)
  Unit G (Notification)
  Unit H (AI + Dashboard)
```

---

## 개발자 작업 규칙

1. **시작 시**: SESSION-BRIEF에 `Status: IN_PROGRESS`, `Assigned Session: {세션ID}` 기록
2. **완료 시**: SESSION-BRIEF에 `Status: DONE`, `Completed At: {날짜}` 기록
3. **변경 사항**: 각 Unit의 BRIEF에 실제 변경 파일 목록 기록
4. **블로커**: 다른 Unit 의존성으로 막히면 즉시 BRIEF에 블로커 기록
5. **커밋**: Unit 단위로 커밋, 커밋 메시지에 `[BRCM-Unit-X]` 프리픽스

---

## 설계 문서 위치

- Master Plan: `docs/01-plan/features/br-case-management.plan.md`
- 기능 명세: `docs/02-design/features/br-case-management/R01~R11-*.md`
- SESSION-BRIEF: `docs/01-plan/tasks/SESSION-BRIEF-BRCM-UNIT-*.md`
