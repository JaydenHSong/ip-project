# ft-optimization-ui-wiring Planning Document

> **Summary**: 5-scope audit에서 57%로 최악이었던 Optimization 스코프의 UI wiring 완결. 이미 구현된 컴포넌트들(3 모달 + AI 버튼들 + 히트맵)을 실제 user-reachable 경로에 연결하고 중요 메트릭 버그 수정.
>
> **Project**: arc-ads (A.R.C. — AD Optimizer module)
> **Version**: Phase 2+ (post ft-runtime-hardening archival)
> **Author**: Jayden Song
> **Date**: 2026-04-23
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Optimization 스코프가 57% Match Rate. 컴포넌트는 다 만들어 놨지만(M03/M04/M05 모달 589 LOC + AI Apply 버튼 + 히트맵) **wiring 누락으로 사용자가 도달 불가**. KPI도 `est_revenue_impact = 0` 하드코딩, `auto_count` = `broad_count` 중복 등 잘못된 값 표시. |
| **Solution** | 3 orphan 모달(M03/M04/M05)을 S04/S05 적절한 CTA에 연결, AI Budget Apply/Dismiss + Dayparting Apply AI Schedule + 히트맵 셀 클릭을 실제 API 호출로 연결, Skip All을 서버 `/skip`으로 일관 호출, S11 Brand/Market 필터 + S04 bulk bar 신설, `auto_count`/`est_revenue_impact` 계산 버그 수정. |
| **Function/UX Effect** | "있는데 안 보이는" UI 589 LOC가 실제 도달 가능해짐. S04/S05/S06/S07/S11 5개 서브탭 모두 Design §5.3 체크리스트 완전 충족. Spigen 마케터가 Optimization 페이지에서 실제 작업 가능해짐 — 룰 생성, 알림 상세, 낭비 분석, AI 예산/스케줄 적용. |
| **Core Value** | "코드로는 만들었는데 고객은 못 쓴다"의 완결. 57% → 90%+ 회복. 이미 투입된 589 LOC 개발 비용 ROI 회수. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Optimization audit 57% — 5-scope 최악. 모달/AI 버튼/히트맵 구조물 존재하나 사용자 도달 불가 (orphan or onClick 누락). 즉시 해결 가치 높음 |
| **WHO** | Spigen 마케터 (AD 최적화 운영자), editor+ 역할. CEO/Director 대시보드와 별개로 실무 운영 화면 |
| **RISK** | 3개 orphan 모달(~589 LOC)의 prop 인터페이스와 caller 페이지(S04/S05)의 state 흐름이 맞지 않을 수 있음. 모달 내부 submit 로직이 이미 정상이어도 caller가 올바른 props/callbacks를 주입해야 함 |
| **SUCCESS** | SC-1~SC-9 — 3 모달 도달 + 5 AI 버튼 작동 + 히트맵 클릭 + Skip All 서버 연동 + KPI 정확성 + S11 필터 |
| **SCOPE** | C2(3 모달 wiring) + C3(Budget Apply) + C4(Dayparting Apply) + C5(히트맵 클릭) + I3(S11 filter) + I4(auto_count) + I5/I6(Skip All) + I8(est_revenue) + S04 bulk bar. Out: Zod(별도), I7 Marketing Stream(Amazon 기능) |

---

## 1. Overview

### 1.1 Purpose

Optimization 스코프에서 "구현은 완료했으나 사용자가 실제로 도달/사용할 수 없는" 기능들을 모두 user-reachable 경로로 연결하여 Match Rate 57% → 90%+ 복구. 5-scope audit의 잔여 최악 항목을 해소.

### 1.2 Background

2026-04-21 5-scope gap analysis에서 Optimization이 57%로 전체 최악. 주요 원인 분석 결과:
- **C1 schema bug**: ✅ ft-runtime-hardening(2026-04-23 완료)으로 해결됨
- **C2 3 모달 orphan**: `rule-create-modal`, `alert-detail-modal`, `underspend-modal` — 총 589 LOC 완전 구현되어 있으나 **전체 src/에서 import 0회**. S04 "+ New Rule" CTA, S03/S05 alert-dot 클릭, S05 Underspend Watch row "Analyze →" 버튼이 모두 미구현
- **C3/C4/C5**: AI 버튼들 onClick 자체가 없거나 히트맵 셀 인터랙션 없음
- **I4/I8**: 계산 로직 버그로 KPI 값 잘못 표시
- **I5/I6**: Skip All은 로컬 state만 갱신, 서버에 저장 안 되어 새로고침 시 복귀

### 1.3 Related Documents

- 최근 완료: [archive/2026-04/ft-runtime-hardening/](../../archive/2026-04/ft-runtime-hardening/) — 인프라 패턴 확립 (AdsAdminContext)
- 원본 Gap: 2026-04-21 Optimization 스코프 audit 결과 (5 Critical, 9 Important)
- Design reference: [archive/2026-04/ad-optimizer/ad-optimizer.design.md](../../archive/2026-04/ad-optimizer/ad-optimizer.design.md) — S04~S07, S11 + M03/M04/M05 명세

---

## 2. Scope

### 2.1 In Scope

**C-블록 (Critical — UI 도달 경로 복구)**

- [ ] **C2-a: M03 Rule Create 모달 wiring** — S04 `bid-optimization.tsx` Strategy Strip에 "+ New Rule" 버튼 추가 → M03 open
- [ ] **C2-b: M04 Alert Detail 모달 wiring** — S05 `daily-budget-pacing.tsx` alert-dot 클릭 시 M04 open, 그리고 Dashboard Director pending actions에도 연결
- [ ] **C2-c: M05 Underspend 모달 wiring** — S05 Underspend Watch 행 "Analyze →" 버튼 → M05 open
- [ ] **C3: AI Budget Recommendation Apply/Dismiss** — [daily-budget-pacing.tsx:110-116](src/modules/ads/features/optimization/components/daily-budget-pacing.tsx#L110) onClick 추가 → PATCH `/api/ads/campaigns/:id` (daily_budget 업데이트) / Dismiss는 localStorage dismiss flag
- [ ] **C4: Dayparting Apply AI Schedule / Adjust** — [dayparting-schedule.tsx:217-223](src/modules/ads/features/optimization/components/dayparting-schedule.tsx#L217) onClick 추가 → PATCH schedule API
- [ ] **C5: Dayparting 히트맵 셀 click toggle** — `dayparting-schedule.tsx` inline grid를 shared `heatmap-grid.tsx` (이미 `onCellToggle` 지원)로 교체

**I-블록 (Important — 메트릭 정확성 + UX)**

- [ ] **I3: S11 Filter Row에 Brand/Market 추가** — `ai-recommendations.tsx:141-163` 필터 UI 확장 (현재 Campaign만)
- [ ] **I4: `auto_count` 계산 버그** — [queries.ts:181](src/modules/ads/features/optimization/queries.ts#L181) `match_type === 'broad'` → `'auto'` 수정
- [ ] **I5/I6: Skip All 서버 연동** — S04 (bid-optimization), S06 (keywords-management), S11 (ai-recommendations) 3군데 Skip All → POST `/api/ads/recommendations/:id/skip` 각 row별 호출. 현재는 로컬 state만
- [ ] **I8: `est_revenue_impact` 계산** — [queries.ts:147-148](src/modules/ads/features/optimization/queries.ts#L147) 하드코딩 0 → 실제 값 계산 (estimated_impact × avg_order_value 추정)

**S-블록 (UI 추가)**

- [ ] **S04 bulk bar + checkbox column** — `bid-optimization.tsx` 추천 테이블에 체크박스 컬럼 추가 + Approve All / Skip All 버튼 페어

**테스트**

- [ ] `tests/e2e/optimization-ui.spec.ts` 신규 — 3 모달 open, AI 버튼 클릭, 히트맵 토글, Skip All API 호출 검증

### 2.2 Out of Scope

- **I1 Zod 검증** → 별도 PDCA `ft-zod-validation` (전 POST/PUT 일괄)
- **I2 Guardrail 집행** → 별도 (Amazon writeback 정책 해제 후)
- **I7 Hourly spend real data** → Amazon Marketing Stream 연동 대기
- **C1 schema bug** → ft-runtime-hardening 완결
- **M3 shared components** — `heatmap-grid.tsx` 외 다른 미사용 shared는 C5 처리 중에 케이스별 판단

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | S04에 "+ New Rule" CTA 버튼, 클릭 시 M03 모달 open | High | Pending |
| FR-02 | S05 alert-dot 클릭 시 M04 모달 open (alert 상세 표시) | High | Pending |
| FR-03 | S05 Underspend Watch "Analyze →" 버튼, 클릭 시 M05 모달 open | High | Pending |
| FR-04 | S05 AI Budget Rec Apply 클릭 → daily_budget PATCH + toast | High | Pending |
| FR-05 | S05 AI Budget Rec Dismiss 클릭 → 해당 추천 localStorage로 숨김 | Medium | Pending |
| FR-06 | S07 "Apply AI Schedule" 클릭 → dayparting schedule PATCH + 히트맵 refresh | High | Pending |
| FR-07 | S07 히트맵 셀 클릭 → 해당 슬롯 weight 토글 (shared heatmap-grid 사용) | High | Pending |
| FR-08 | S11 Filter Row에 Brand/Market 다중선택 필터 추가 | Medium | Pending |
| FR-09 | `auto_count`가 `match_type === 'auto'` 실제 카운트 | Medium | Pending |
| FR-10 | S04/S06/S11 Skip All이 각 row에 대해 POST `/api/ads/recommendations/:id/skip` 호출 | High | Pending |
| FR-11 | `est_revenue_impact` 실제 값 (합리적 추정 로직) | Medium | Pending |
| FR-12 | S04에 체크박스 컬럼 + bulk bar (Approve All / Skip All) | High | Pending |
| FR-13 | `tests/e2e/optimization-ui.spec.ts` 전 FR 커버 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Auth | editor+ 역할만 Apply/Approve/Skip 가능 (CLAUDE.md §RBAC) | `withAuth(['editor','admin','owner'])` 유지 |
| File Size | 수정 파일 모두 250 LOC 이하 (CLAUDE.md) | 대규모 파일은 helper 분리 |
| Type Safety | `pnpm typecheck` pass | `pnpm typecheck && pnpm lint && pnpm build` |
| Regression | 다른 스코프(Campaigns/Autopilot/Dashboard) 기존 동작 유지 | ft-runtime-hardening e2e 재실행 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] **SC-1**: M03/M04/M05 3 모달 모두 prod에서 trigger 도달 가능 (Playwright 검증)
- [ ] **SC-2**: S05 AI Budget Apply/Dismiss 버튼 작동 (네트워크 요청 or localStorage 변경 확인)
- [ ] **SC-3**: S07 Apply AI Schedule + 히트맵 셀 클릭 작동 (PATCH 발생 + UI 반영)
- [ ] **SC-4**: S04/S06/S11 Skip All 시 서버 호출 → 새로고침 후 state 유지 (DB `status=skipped` 확인)
- [ ] **SC-5**: S04에 체크박스 컬럼 + bulk bar 노출, bulk 액션 작동
- [ ] **SC-6**: `auto_count` 실제 'auto' match_type 카운트 반환 (DB query 검증)
- [ ] **SC-7**: `est_revenue_impact` KPI가 0 아닌 합리적 값 표시
- [ ] **SC-8**: S11 Filter Row에 Brand/Market 다중선택 UI + 필터링 작동
- [ ] **SC-9**: `tests/e2e/optimization-ui.spec.ts` 전 케이스 pass (preview 환경)
- [ ] 코드 리뷰 + typecheck + build 통과
- [ ] `docs/04-report/ft-optimization-ui-wiring.report.md` 작성

### 4.2 Quality Criteria

- [ ] Zero regression — ft-runtime-hardening e2e 재실행 통과
- [ ] 수정 파일 모두 250 LOC 이하
- [ ] PDCA Gap analysis Match Rate ≥ 90% (target 93%+)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **R-1** M03/M04/M05 모달의 prop 인터페이스가 caller의 state 흐름과 안 맞음 | High | Medium | 모달별 공개 props 먼저 읽고, caller에 필요한 state/callbacks만 주입. 필요 시 adapter 함수 작성 |
| **R-2** Skip All 다량 호출(N rows) 시 race condition / 부분 실패 | Medium | Medium | `Promise.allSettled()` + 성공/실패 토스트 요약. partial success도 UI에 반영 |
| **R-3** Dayparting heatmap shared component 교체 시 기존 inline grid 스타일과 불일치 | Low | Medium | shared `heatmap-grid.tsx`가 prop으로 styling 수용하는지 확인, 필요 시 variant prop 추가 |
| **R-4** `est_revenue_impact` 추정 공식이 마케터 기대와 다름 | Medium | Low | 초기 공식: `estimated_impact_pct × avg_campaign_sales_7d`. 문서에 명시, 추후 튜닝 follow-up |
| **R-5** `auto_count` 수정 후 S06 stats strip 숫자가 변동 — 기존 화면 디자인 검증 | Low | Low | 변경 전/후 값 QA 문서 기록 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change |
|----------|------|--------|
| 3 optimization component 파일 | UI | 모달 wiring + CTA 버튼 |
| `daily-budget-pacing.tsx` | UI + API call | Apply/Dismiss onClick |
| `dayparting-schedule.tsx` | UI | heatmap-grid 교체 + AI 버튼 onClick |
| `ai-recommendations.tsx` | UI + Filter | Brand/Market 필터 + Skip All API |
| `bid-optimization.tsx` | UI | 체크박스 + bulk bar + Skip All API |
| `keywords-management.tsx` | UI | Skip All API |
| `queries.ts` | Logic | auto_count, est_revenue 계산 |
| E2E test | 신규 테스트 | `tests/e2e/optimization-ui.spec.ts` |

### 6.2 Current Consumers

| Resource | Operation | Path | Impact |
|----------|-----------|------|--------|
| `/api/ads/recommendations/:id/skip` | POST | 서버는 구현 완료, 클라이언트는 호출 안 함 | Fix: UI에서 호출하도록 wiring |
| `/api/ads/campaigns/:id` | PATCH (daily_budget) | 기존 설정 경로 존재 | 재사용 |
| `/api/ads/rules` | POST (M03 submit) | M03 내부 로직 존재 | 재사용 |
| `/api/ads/dayparting/schedules/:id` | PATCH | 경로 확인 필요 | 확인 후 재사용 |

### 6.3 Verification

- [ ] ft-runtime-hardening e2e 재실행 (regression)
- [ ] 3 모달 open/close 시 unrelated API 호출 없음 확인
- [ ] Skip All 다량 호출 시 rate-limit 안 걸림 확인

---

## 7. Architecture Considerations

Dynamic (기존). 신규 인프라 파일 없음 — 기존 `AdsAdminContext` + `withAuth` 패턴 재사용.

### 7.1 Key Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 모달 state 관리 | ① Caller에서 `useState` + prop drilling ② Context ③ URL query param | ① useState | 페이지 단일, 간단함. URL은 refactor 필요 |
| Skip All 일괄 호출 | ① Promise.all ② allSettled + 요약 ③ 서버에 bulk endpoint 신설 | ② allSettled | Partial failure 안전 처리. 서버 변경 없음 |
| Dismiss flag 저장 | ① localStorage ② DB column ③ server-side user preferences | ① localStorage | 사용자별 임시 숨김 — 서버 영속화 필요도 낮음 |
| Heatmap 교체 | ① shared 사용 ② inline 유지 + onClick만 추가 | ① shared | `heatmap-grid.tsx` 이미 onCellToggle 지원. Dead code 활용 |
| `est_revenue_impact` 공식 | ① 하드코딩 제거만 (null) ② 추정 공식 ③ avg AOV 테이블 조회 | ② 추정 공식 | `estimated_impact × avg_sales_7d / 100` — 단순+합리적. 추후 튜닝 |

---

## 8. Implementation Strategy

### 8.1 Session Split

| Session | scope key | 내용 | 예상 |
|---------|-----------|------|------|
| S1 | `modals` | C2 3개 모달 wiring (M03/M04/M05 caller 주입) | 1.5h |
| S2 | `ai-buttons` | C3 Budget Apply/Dismiss + C4 Dayparting Apply | 45min |
| S3 | `heatmap` | C5 shared heatmap-grid 교체 | 30min |
| S4 | `skip-api` | I5/I6 S04+S06+S11 Skip All 서버 연동 | 45min |
| S5 | `metrics` | I4 auto_count + I8 est_revenue_impact | 30min |
| S6 | `filters-bulkbar` | I3 S11 Brand/Market + S04 bulk bar + checkbox | 1h |
| S7 | `e2e` | Playwright spec 작성 + 로컬 run | 1h |
| S8 | `deploy` | Preview → smoke → prod | 대기 + 30min |

**총**: ~5-6h (선행 ft-runtime-hardening 수준)

### 8.2 Deployment Strategy

1. Preview 배포 → Playwright e2e 실행 (11+ tests green)
2. Preview에서 수동 클릭 smoke (3 모달 + AI 버튼 + 히트맵)
3. Prod 배포
4. Prod에서 /ads/optimization 4 tabs + /ads/optimization/recommendations 수동 확인

---

## 9. Next Steps

1. [ ] `/pdca design ft-optimization-ui-wiring` — 3 아키텍처 옵션 비교
2. [ ] `/pdca do --scope modals` 부터 시작
3. [ ] Preview + prod 검증
4. [ ] `/pdca analyze` → Match Rate 확인

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-23 | Initial draft post ft-runtime-hardening archival. Scope: C2-C5 + I3/I4/I5/I6/I8 + S04 bulk bar | Jayden Song |
