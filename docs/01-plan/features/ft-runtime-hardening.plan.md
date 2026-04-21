# ft-runtime-hardening Planning Document

> **Summary**: Cross-cutting PDCA to fix 4 recurring runtime infrastructure defects identified across 5 scope audits (Campaigns, Autopilot, Optimization, Reports, Dashboard).
>
> **Project**: arc-ads (A.R.C. — AD Optimizer module)
> **Version**: Phase 2+ (post-roadmap batch closure)
> **Author**: Jayden Song
> **Date**: 2026-04-21
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | AD Optimizer의 `/ads/*` 전 페이지가 production에서 실제 데이터 없이 렌더링됨. TypeScript/lint는 통과하지만 런타임에서 4가지 인프라 결함이 누적되어 자동화 파이프라인 전체가 동작 중지 상태. |
| **Solution** | 10개 route의 스키마 프리픽스 버그, 4개 cron의 HTTP verb 오류, 1개 스케줄 불일치, 3개 Dashboard 파일의 cross-schema 클라이언트 오용을 **단일 PDCA로 일괄 수정**. |
| **Function/UX Effect** | Dashboard 즉시 정상 렌더링 (brands/ACoS heatmap/ROAS 실데이터). Autopilot/Reports cron 복구 → 24-48h 내 `ads.report_snapshots` 재populate → Optimization/Campaigns KPI 정상화. |
| **Core Value** | 이미 구현되어 있지만 죽어있는 ~11,800 LOC (ad-optimizer Phase 1) + 3,000 LOC (Phase 2/3)의 ROI 회복. no-writeback 정책 해제를 위한 선결 조건. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 5개 스코프 감사 결과 평균 66% Match Rate, 23 Critical 발견. 4대 반복 패턴이 전 모듈에 퍼져 있어 피처별 iterate보다 인프라 단일 PDCA가 blast radius 작고 효과적. |
| **WHO** | arc-ads 개발자 (AD 기능 안정성 확보), Spigen 마케터/디렉터/CEO (실제 데이터 보이는 대시보드 사용자). |
| **RISK** | B2 Cron GET 수정 시 기존 POST-based 수동 트리거와의 충돌 가능성. B4 Dashboard client 분리 시 RLS 우회 admin 클라이언트 2개 사용으로 tenant 경계 코드 검토 필수. |
| **SUCCESS** | SC-1~SC-4: 10 route adsTable 적용, 4 cron GET 응답, Dashboard CEO brands>0, preview 24h 후 report_snapshots 새 row. |
| **SCOPE** | B1(10 route schema fix) + B2(4 cron GET) + B3(1 schedule fix) + B4(3 dashboard helper split). Zod/system_configs/UI wiring은 별도 PDCA. |

---

## 1. Overview

### 1.1 Purpose

4대 런타임 인프라 결함을 **1회 집중 수정**으로 해소하여 AD Optimizer 전체가 production에서 기대한 대로 동작하도록 복구한다.

### 1.2 Background

2026-04-06 Phase 1 완료(97%), 2026-04-20 9개 PDCA batch archive 직후, 5개 스코프 1:1 구현 검증 결과 TypeScript는 통과하지만 런타임은 대부분 비정상임이 확인됨.

**4대 반복 결함**:
1. `.from('ads.xxx')` + `createAdminClient()` (public schema) → 스키마 프리픽스가 리터럴 테이블명으로 해석되어 `PGRST205` 에러 → **10개 route 영향**
2. Cron route `POST`만 export. Vercel Cron은 `GET` 호출 → 405 → **4개 cron 영구 실패**
3. `vercel.json` autopilot-run 스케줄이 `*/30 * * * *`인데 설계는 hourly → Write-Back 2배 빈도
4. Dashboard helper가 public 전용 테이블(`brand_markets`, `org_units`)을 ads 클라이언트로 조회 → 항상 빈 결과 → **CEO/Director 대시보드 전 블록 empty**

이 결함들은 모두 TypeScript 체크로는 탐지 불가. commit 87cc1be에 도입된 `adsTable()` helper가 소급 적용되지 않았기 때문.

### 1.3 Related Documents

- Gap analyses (세션 내, 문서화 안 함): Campaigns 78% / Autopilot 66% / Optimization 57% / Reports 58% / Dashboard 69%
- `docs/archive/2026-04/*/` — 15개 아카이브 PDCA (특히 ad-optimizer, autopilot-ai-engine, phase4-report-sync-data-integration, ads-dashboard-s01-s03-matching)
- [adsTable helper (commit 87cc1be)](src/lib/supabase/table-names.ts)
- [CLAUDE.md Module Isolation rule](CLAUDE.md)

---

## 2. Scope

### 2.1 In Scope

**B1 — 스키마 프리픽스 버그 수정 (10 route)**
- [ ] [src/app/api/ads/campaigns/[id]/goal-mode/route.ts:34,54](src/app/api/ads/campaigns/[id]/goal-mode/route.ts#L34)
- [ ] [src/app/api/ads/autopilot/ai-reviews/route.ts:24](src/app/api/ads/autopilot/ai-reviews/route.ts#L24)
- [ ] [src/app/api/ads/autopilot/[id]/settings/route.ts:50](src/app/api/ads/autopilot/[id]/settings/route.ts#L50)
- [ ] [src/app/api/ads/cron/autopilot-run/route.ts:23](src/app/api/ads/cron/autopilot-run/route.ts#L23)
- [ ] [src/app/api/ads/cron/ai-weekly-review/route.ts:21](src/app/api/ads/cron/ai-weekly-review/route.ts#L21)
- [ ] [src/app/api/ads/cron/keyword-pipeline/route.ts:22](src/app/api/ads/cron/keyword-pipeline/route.ts#L22)
- [ ] [src/app/api/ads/recommendations/[id]/approve/route.ts:32-44](src/app/api/ads/recommendations/[id]/approve/route.ts#L32)
- [ ] [src/app/api/ads/reports/snapshots/route.ts:19,22](src/app/api/ads/reports/snapshots/route.ts#L19)
- [ ] [src/app/api/ads/reports/export/route.ts:25,28](src/app/api/ads/reports/export/route.ts#L25)
- [ ] Cron → engine `db` threading (`src/modules/ads/cron/*.ts`, `src/modules/ads/engine/autopilot/orchestrator.ts:178`, `keyword-pipeline.ts:49`)

**B2 — Cron HTTP verb fix (4 cron route)**
- [ ] [src/app/api/ads/cron/autopilot-run/route.ts:8](src/app/api/ads/cron/autopilot-run/route.ts#L8) — add GET handler
- [ ] [src/app/api/ads/cron/keyword-pipeline/route.ts:8](src/app/api/ads/cron/keyword-pipeline/route.ts#L8)
- [ ] [src/app/api/ads/cron/ai-weekly-review/route.ts:7](src/app/api/ads/cron/ai-weekly-review/route.ts#L7)
- [ ] [src/app/api/ads/cron/sync-reports/route.ts:6](src/app/api/ads/cron/sync-reports/route.ts#L6)
- [ ] 기존 수동 트리거(`/api/ads/amazon/sync-reports`) 동작 유지 확인

**B3 — Vercel cron schedule fix**
- [ ] [vercel.json:29](vercel.json#L29) — `*/30 * * * *` → `0 * * * *` (autopilot-run)

**B4 — Dashboard cross-schema client split (3 파일)**
- [ ] [src/modules/ads/features/dashboard/queries/get-ceo-dashboard.ts](src/modules/ads/features/dashboard/queries/get-ceo-dashboard.ts) — `publicDb` 주입해서 `brand_markets` 는 public client로
- [ ] [src/modules/ads/features/dashboard/queries/get-director-dashboard.ts](src/modules/ads/features/dashboard/queries/get-director-dashboard.ts) — 동일 + `org_units` public client로
- [ ] [src/modules/ads/features/dashboard/queries/compute-prev-period.ts](src/modules/ads/features/dashboard/queries/compute-prev-period.ts) — cross-schema 참조 점검

**E2E 테스트 추가**
- [ ] `tests/e2e/runtime-hardening.spec.ts` — L1 API + L2 UI smoke test
  - L1: 10 route 각각에 대한 `curl` 응답 코드 확인
  - L1: 4 cron route GET 호출 시 200 (CRON_SECRET 포함)
  - L2: `/ads/dashboard` CEO view에 brand ≥ 1 렌더링
  - L2: `/ads/reports` page가 "No data" 아닌 spend 값 표시

### 2.2 Out of Scope

- Zod validation 전면 도입 (별도 PDCA — `ft-zod-validation`)
- `system_configs` 이관 (별도 PDCA — `ft-config-migration`; 하드코딩 값 15개 이상)
- UI 배선 누락 (별도 scope별 iterate):
  - Campaigns: M01a product selector, Duplicate button, Bulk bar
  - Autopilot: Goal Mode selector in settings-tab, rollback Amazon 반영
  - Optimization: M03/M04/M05 모달 wiring, AI Budget/Dayparting onClick
  - Reports: Export 버튼 UI
  - Dashboard: Pending Actions CTA
- Amazon Write-Back 정책 해제 (no-writeback 정책 유지 — feedback_no_writeback.md)
- Module isolation 완전 검증 (C-2 autopilot cross-module 위험은 B1 수정으로 완화)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 10개 route 모두 `createAdsAdminClient()` + `.from('xxx')` 또는 `adsTable()` helper 사용 | High | Pending |
| FR-02 | 4개 cron route 모두 Vercel GET 호출에 응답 (200) + CRON_SECRET 검증 유지 | High | Pending |
| FR-03 | `vercel.json` autopilot-run schedule = `0 * * * *` | High | Pending |
| FR-04 | CEO Dashboard가 owner 세션에서 `brands.length >= 1` 반환 | High | Pending |
| FR-05 | Director Dashboard가 admin 세션에서 `team_performance.length >= 1` 반환 | High | Pending |
| FR-06 | `tests/e2e/runtime-hardening.spec.ts` L1+L2 테스트 통과 | High | Pending |
| FR-07 | Preview 배포 후 24h 내 `ads.report_snapshots`에 새 row ≥ 1개 생성 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Backward Compat | 기존 수동 트리거(`/api/ads/amazon/sync-reports`) 정상 작동 | curl 200 응답 |
| Module Isolation | CLAUDE.md 규칙 준수 — ads 모듈 코드가 public 테이블 조회 시 반드시 `createAdminClient()` 명시 사용 | Grep `createAdsAdminClient` 후 `public.*` 테이블명 교차 검증 |
| Performance | cron 실행 시간 `maxDuration=300` 이내 | Vercel function log |
| File Size | 수정 파일 모두 250 LOC 이하 유지 | `pnpm harness:ads:staged` |
| Type Safety | `any` 사용 금지, `pnpm typecheck` pass | `pnpm typecheck && pnpm lint && pnpm build` |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] **SC-1 (B1)**: 10개 route 수정 + 해당 route에 대한 `curl` 호출이 더 이상 `PGRST205` 반환하지 않음
- [ ] **SC-2 (B2)**: 4개 cron에 GET 호출 시 200 응답 (CRON_SECRET 헤더 포함) + 기존 POST 경로는 유지
- [ ] **SC-3 (B3)**: `vercel.json:29` = `0 * * * *` 반영 + preview에서 1시간 뒤 autopilot-run 한 번 실행 확인
- [ ] **SC-4 (B4)**: CEO 세션으로 `GET /api/ads/dashboard/ceo` → `.data.brands` 배열 길이 ≥ 1
- [ ] **SC-5 (B4)**: admin 세션으로 `GET /api/ads/dashboard/director` → `.data.team_performance` 배열 길이 ≥ 1
- [ ] **SC-6 (E2E)**: Playwright `tests/e2e/runtime-hardening.spec.ts` 전 케이스 pass (preview 환경 기준)
- [ ] **SC-7 (데이터 파이프라인)**: preview 배포 후 24-48h 내 `ads.report_snapshots`에 새 row + `ads.automation_log`에 autopilot 실행 흔적 확인
- [ ] 코드 리뷰 완료
- [ ] `docs/04-report/ft-runtime-hardening.report.md` 작성

### 4.2 Quality Criteria

- [ ] `pnpm typecheck && pnpm lint && pnpm build` 전부 통과
- [ ] 수정 파일 모두 250 LOC 이하
- [ ] Zero lint errors
- [ ] `pnpm harness:ads:staged` 통과
- [ ] PDCA Gap analysis Match Rate ≥ 90%

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **R-1** B2 cron GET 추가 후 기존 POST 경로와의 동작 차이 | High | Low | `export const GET = POST` 공유 패턴 사용. 단일 핸들러로 통일해 diff 최소화. |
| **R-2** B4 client 분리 후 admin 클라이언트 2개 쓰면서 RLS 우회 이중 경로 생성 | Medium | Medium | `markets/route.ts` 기존 패턴 참고. 분리 시 tenant 필터 명시적으로 유지. 코드 리뷰 필수. |
| **R-3** cron 수정 후 Amazon API에 과도한 호출 (schedule 수정과 맞물려) | High | Low | no-writeback 정책 유지 (`feedback_no_writeback.md`). cron은 read-only 상태에서 데이터만 동기화. |
| **R-4** preview에서 cron이 안 돌아서 SC-7 검증 불가 | Medium | Medium | Vercel 무료 tier는 preview cron 제한 있음. `VERCEL_CRON_ENABLED` 확인. 안 되면 수동 trigger로 검증. |
| **R-5** `adsTable()` helper가 모든 케이스 커버 안 함 | Low | Low | 이미 87cc1be에서 도입. 커버 안 되는 edge case 발견 시 helper 확장. |
| **R-6** Dashboard가 B4 fix 후에도 여전히 빈 상태 (B1의 report_snapshots 테이블 자체가 빔) | High | High | SC-7 24-48h 대기는 이 리스크 대응. prod 배포 전 preview에서 실제 데이터 들어오는지 확인. |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| 10 API routes | API handler | `createAdminClient()` → `createAdsAdminClient()` + table name 언스키마화 |
| 4 cron routes | API handler | GET 메서드 추가 (POST 유지) |
| `vercel.json` | Config | autopilot-run schedule 30분 → 1시간 |
| 3 dashboard helpers | Query module | 클라이언트 분리 (ads vs public) |
| `tests/e2e/runtime-hardening.spec.ts` | 신규 테스트 | L1+L2 e2e 커버리지 |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| goal-mode route | PATCH | 현재 UI consumer 없음 (settings-tab에 selector 미구현) | None (이미 dead) |
| autopilot ai-reviews route | GET | `autopilot-detail.tsx:86` `<AiReviewCard/>` | Fix 후 카드 실데이터 |
| autopilot settings route | PUT | 미확인 (별도 검증 필요) | Needs verification |
| recommendations/approve route | POST | `optimization/page.tsx:30-36`, `recommendations/page.tsx:12-18` | Fix 후 Amazon writeback 경로 활성 (no-writeback 정책 때문에 실호출은 모의 API만) |
| reports/snapshots route | GET | **현재 consumer 0** (orphan) | None (dead code) |
| reports/export route | POST | **현재 consumer 0** (Export 버튼 미구현) | None |
| autopilot-run cron | GET (new) | Vercel Cron scheduler | 정상 작동 시작 |
| sync-reports cron | GET (new) | Vercel Cron scheduler | `ads.report_snapshots` 재populate 시작 |
| Dashboard CEO query | GET | `dashboard/page.tsx` → `useAdsDashboardPageData` | Fix 후 brands/charts 실렌더 |
| Dashboard Director query | GET | 동일 | Fix 후 team perf/pacing 실렌더 |

### 6.3 Verification

- [ ] 모든 consumer가 fix 후 정상 작동 확인 (수동 smoke + Playwright)
- [ ] Auth/role 가드 변경 없음 확인
- [ ] Response shape 변경 없음 확인 (클라이언트 쪽 parse 로직 유지)
- [ ] `ads.automation_log` 스키마 변경 없음 (cron만 실제 실행 시작)

---

## 7. Architecture Considerations

### 7.1 Project Level

Dynamic (현 프로젝트 고정, 변경 없음).

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Schema 클라이언트 패턴 | ① `createAdsAdminClient()` + unqualified table ② `adsTable()` helper + 공용 client | **②** (primary) + ① (fallback) | 87cc1be가 도입한 helper 우선. 이미 배포된 약속 유지. |
| Cron verb 통일 | ① GET only ② GET + POST 양쪽 ③ shared handler re-export | **③** `export const GET = POST` | 최소 diff, 기존 POST 수동 호출 호환. |
| Dashboard client 분리 | ① route 레벨에서 public/ads 각각 주입 ② helper 내부에서 두 클라이언트 생성 | **②** | route 변경 최소화. helper 책임 캡슐화. |
| Test framework | ① 없음 ② Playwright | **②** | 재발 방지. 사용자가 테스팅 추가 선택. |

### 7.3 Folder Structure

기존 구조 유지. 신규 파일 1개:
- `tests/e2e/runtime-hardening.spec.ts`

---

## 8. Implementation Strategy

### 8.1 Session Split

| Session | 스코프 | 예상 시간 |
|---------|--------|----------|
| S1 | B1 — 10 route schema fix | ~1h |
| S2 | B2 + B3 — 4 cron GET + vercel.json schedule | ~30min |
| S3 | B4 — 3 dashboard helper 분리 | ~45min |
| S4 | E2E 테스트 작성 + 로컬 실행 | ~1h |
| S5 | Preview 배포 + 24-48h 관찰 | 대기 |
| S6 | 관찰 결과 반영 + prod 배포 | ~30min |

### 8.2 Deployment Strategy

1. **Preview 배포** (`npx vercel`) → URL 공유
2. **즉시 수동 curl 검증** — gap-detector L1 테스트 실행, 모든 route PGRST205 사라짐 확인
3. **Playwright L2 테스트** — preview URL 대상으로 실행
4. **24-48h Cron cycle 관찰**:
   - `sync-reports` (30분 주기) → preview DB의 `ads.report_snapshots`에 새 row 확인
   - `autopilot-run` (1시간 주기) → `ads.automation_log`에 실행 흔적 확인
5. **관찰 통과 시 prod 배포** (`npx vercel --prod`)
6. **Prod 배포 후 24h 재검증** — 실제 Spigen 데이터로 동일 SC-1~7 확인

---

## 9. Out of Scope Follow-ups

다음 PDCA에서 처리:

| PDCA | 내용 | 우선순위 |
|------|------|----------|
| `ft-zod-validation` | 전 POST/PUT에 Zod 스키마 추가. Design §7 Security 준수. | High (이번 PDCA 완료 후 즉시) |
| `ft-config-migration` | 하드코딩 magic number 15+개를 `public.system_configs`로 이관 | Medium |
| `ft-optimization-ui-wiring` | M03/M04/M05 모달 wiring + AI 버튼 onClick 5개 | High (가장 나쁜 scope) |
| `ft-campaigns-m01-product-selector` | M01 Step 1에 Product/ASIN 선택기 추가 | Medium |
| `ft-autopilot-rollback-amazon` | rollback이 Amazon 실제 반영 (SC-08 미달) | Medium — no-writeback 정책 해제 후 |
| `ft-dashboard-freshness-banner` | report_snapshots 48h 이상 stale 시 배너 표시 | Low |

---

## 10. Next Steps

1. [ ] `/pdca design ft-runtime-hardening` — 3가지 아키텍처 옵션 검토 (변경 최소화 vs helper 통합 vs 전면 리팩터)
2. [ ] `/pdca do ft-runtime-hardening --scope b1` — B1부터 세션별 구현
3. [ ] Preview 배포 및 관찰
4. [ ] Gap analysis 및 prod 배포

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-21 | Initial draft from 5-scope gap analyses (Campaigns 78% / Autopilot 66% / Optimization 57% / Reports 58% / Dashboard 69%) | Jayden Song |
