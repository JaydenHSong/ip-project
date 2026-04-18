# AD Optimizer S01/S02/S03 1:1 매칭 — Plan

> **Feature**: Paper S01/S02/S03 페이지 구조 1:1 매칭
> **Author**: Jayden Song + Codex
> **Date**: 2026-04-12
> **Status**: Draft (Phase 2 appended 2026-04-13)
> **Scope**: `src/app/(protected)/ads/dashboard/*`, `src/app/(protected)/ads/campaigns/*`, `src/app/api/ads/dashboard/*`  
> **갭 분석 (Check)**: `docs/03-analysis/features/ads-dashboard-s01-s03-matching.gap-analysis.md`

---

## Executive Decision (확정)

- `S01`은 `/ads/dashboard`의 **CEO View**와 1:1 매칭한다.
- `S02`는 `/ads/dashboard`의 **Director View**와 1:1 매칭한다.
- `S03`는 `/ads/campaigns`의 **첫 화면(마케터 진입 화면)**과 1:1 매칭한다.
- **중요 정책**: 마케터는 `Campaigns`를 클릭했을 때 나오는 페이지가 곧 대시보드여야 한다.

---

## 1. As-Is 점검

### 1.1 라우팅/뷰

- `/ads/dashboard`는 현재 `ceo`/`director` 렌더링만 지원.
- `/ads/campaigns`는 캠페인 운영 테이블 중심 UI.
- `/ads` 진입 시 `owner/admin -> /ads/dashboard`, 그 외 -> `/ads/campaigns`.

### 1.2 API

- 존재:
  - `GET /api/ads/dashboard/ceo` (`owner`)
  - `GET /api/ads/dashboard/director` (`admin`, `owner`)
  - `GET /api/ads/dashboard/marketer` (`viewer`~`owner`)
- 갭:
  - `marketer` API는 존재하지만 `/ads/dashboard` 또는 `/ads/campaigns`에서 본격 소비되지 않음.
  - CEO/Director 쿼리 일부 필드는 TODO/placeholder (`tacos`, `delta`, `savings` 등) 상태.

---

## 2. To-Be 구조

### 2.1 페이지 매칭

| Paper | 실제 페이지 | 대상 역할 | 목적 |
|------|-------------|----------|------|
| S01 | `/ads/dashboard` CEO View | owner | 크로스 브랜드/마켓 경영 뷰 |
| S02 | `/ads/dashboard` Director View | admin/owner | 예산/팀 운영 총괄 뷰 |
| S03 | `/ads/campaigns` | editor/viewer_plus/viewer | 마케터 운영 대시보드 |

### 2.2 역할별 UX 원칙

- owner: CEO/Director 토글 가능
- admin: Director 기본, CEO 비노출
- marketer 계열(editor/viewer_plus/viewer): Campaigns 클릭 시 S03 대시보드
- S03 캠페인 리스트에서 항목 클릭 시 **페이지 이탈 없이** 상세가 우측 **슬라이드 인 모달(패널)**로 열려야 함
- S03의 `New Campaign` CTA는 캠페인 생성 모달과 연결되어 즉시 생성 플로우로 진입해야 함

---

## 3. 구현 전략

### 3.1 `/ads/dashboard` (S01/S02)

- `S01`과 `S02`를 Paper 구조에 맞게 컴포넌트/간격/정보 순서 1:1로 정렬.
- role 기반 토글 정책을 명확히 분리:
  - owner: `CEO View`, `Director View`
  - admin: `Director View` 고정
- API 에러/빈 데이터 상태를 명시적 UI로 처리.

### 3.2 `/ads/campaigns` (S03)

- 마케터 입장에서 첫 화면을 S03 대시보드 구조로 재편.
- 기존 캠페인 테이블/상세 패널은 S03 내부 섹션(또는 탭)로 통합.
- 상단 KPI/알림/작업 큐/테이블 섹션 순서를 S03와 맞춤.
- 테이블 row click -> `/ads/campaigns/[id]` 레이어 구조를 유지해 상세 패널을 우측 슬라이드 인으로 오픈.
- `New Campaign` 버튼 -> 캠페인 생성 모달(`CampaignCreateModal`) 연결을 S03 기본 동선으로 고정.

### 3.3 API/데이터 계약

- `GET /api/ads/dashboard/marketer` 응답 타입을 `src/modules/ads/features/dashboard/types.ts`에 명시.
- `campaigns` 페이지에서 marketer dashboard API를 기본 소스로 사용.
- 필요한 경우 S03 전용 요약 필드(예: urgent alerts, today actions)를 API에 추가.

---

## 4. 작업 분해 (Execution Queue)

| 단계 | 작업 | 산출물 |
|------|------|--------|
| P1 | 타입/계약 정리 (S01/S02/S03) | dashboard 타입 업데이트 |
| P2 | `/ads/dashboard` S01 매칭 | CEO View 컴포넌트 정렬 |
| P3 | `/ads/dashboard` S02 매칭 | Director View 컴포넌트 정렬 |
| P4 | `/ads/campaigns` S03 매칭 1차 | 상단 대시보드 구조 + API 연결 |
| P5 | `/ads/campaigns` S03 매칭 2차 | 테이블/상세 패널 통합 정렬 |
| P6 | RBAC/라우팅 검증 | 역할별 진입/표시 검증 |
| P7 | QA/Lint/Typecheck | 린트/타입체크 및 수동 시나리오 점검 |

---

## 5. 수용 기준 (Acceptance Criteria)

### AC-1 S01/S02
- `/ads/dashboard`에서 S01(CEO), S02(Director)가 Paper 구조와 동일한 정보 위계로 표시된다.
- owner는 2개 뷰를 전환 가능하고, admin은 Director만 본다.

### AC-2 S03
- 마케터가 `Campaigns` 클릭 시 S03 대시보드 첫 화면을 본다.
- 기존 캠페인 목록/상세 접근 흐름은 유지된다(기능 회귀 없음).
- 리스트 클릭 시 캠페인 상세 모달이 사이트 내 우측 슬라이드 인 패널로 열린다.
- `New Campaign` 클릭 시 생성 모달이 즉시 열리고 저장 후 목록/지표가 갱신된다.

### AC-3 안정성
- API 실패 시 스켈레톤 무한 상태 없이 에러/재시도 UI가 표시된다.
- role별 접근 권한과 페이지 노출이 불일치하지 않는다.

---

## 6. 리스크 및 대응

- **리스크**: S03를 대시보드화하면서 기존 캠페인 운영 UX가 희석될 수 있음.
  - **대응**: 테이블/상세 패널을 서브 섹션으로 유지해 작업 동선을 보존.
- **리스크**: API placeholder 값으로 인한 신뢰도 저하.
  - **대응**: S01/S02에서 placeholder 필드 우선순위대로 실데이터화.
- **리스크**: 역할 분기 복잡도 증가.
  - **대응**: page-level role gate + API RBAC를 동일 표로 관리.

---

## 7. Out of Scope

- 새로운 모듈 추가/삭제
- `ads` 외 타 모듈 라우팅 구조 변경
- 대시보드 외 상세 비즈니스 로직(입찰 알고리즘 등) 대규모 재작성

---

## 8. 코드 구현 가드레일 (Harness Preset)

- 컴포넌트는 기존 자산을 우선 재사용하고, 반복 UI(2회 이상)는 분리 컴포넌트로 추출한다.
- 하드코딩(특히 inline style) 대신 Tailwind 토큰/공통 UI 컴포넌트를 사용한다.
- 하나의 소스 파일은 250줄 초과를 금지한다. (기존 레거시 파일은 단계적 분리)
- 250줄 초과가 불가피한 경우, 구현 진행 전 반드시 사용자 코드 검수(승인)를 받고 예외 사유를 PR/작업 로그에 기록한다.
- 프리셋 훅 기반 자동 검증:
  - `pnpm harness:ads` (변경 파일 검사)
  - `pnpm harness:ads:staged` (staged 파일 검사; pre-commit용)
  - `pnpm harness:ads:full` (typecheck + lint + harness)
- pre-commit 훅 템플릿은 `.githooks/pre-commit`를 사용한다.

---

## 9. Phase 2 — S03 Paper 위젯 단순화 (PDCA · Plan 보강)

> **목적**: Paper S03 대비 현재 상단 정보 과밀(8타일 KPI + 마케터 스트립)을 **Paper와 동일한 정보 위계**로 줄인다.  
> **Design**: `docs/02-design/features/ads-dashboard-s01-s03-matching.design.md` §2.2 / §3.3 Phase 2 참조.  
> **Check**: 구현 후 `docs/03-analysis/features/ads-dashboard-s01-s03-matching.gap-analysis.md` 갱신.

### 9.1 Executive Decision (확정)

- S03 상단 기본 노출은 Paper와 같이 **(1) 컨텍스트 헤더 한 줄**, **(2) Critical / Attention / On Track 상태 점**, **(3) My Budget Pacing 카드**, **(4) AI Recommendations 카드**의 4블록으로 고정한다.
- 기존 **8칸 KPI 스트립**(`CampaignStatusStrip`)은 S03 기본 화면에서 **제거**한다. 동일 수치가 필요하면 Budget Pacing 카드 하위 지표 또는 “고급 지표 접기”로만 노출한다(중복 최소화).
- 기존 **MarketerOpsStrip** 3칸 KPI + 2리스트 구조는 **두 Paper 카드로 치환**한다(데이터 소스는 재사용·병렬 fetch 유지).
- **Apply**는 기존 `POST /api/ads/recommendations/[id]/approve`를 사용한다.
- **Skip**은 S11의 로컬 숨김이 아니라 **`keyword_recommendations.status = skipped` 영속 반영**을 1차 스코프로 한다(재방문·다른 기기 일관성).
- **Critical / Attention / On Track** 집계 규칙은 **캠페인 워크리스트 탭(Critical / Attention / Auto Pilot 등)과 동일한 정의**를 단일 진실로 한다(숫자 불일치 방지).

### 9.2 To-Be 델타 (Phase 2만)

| 영역 | Phase 1 (현재) | Phase 2 (목표) |
|------|----------------|----------------|
| 상단 KPI | 8타일 그리드 | 제거 → Budget Pacing 단일 카드에 흡수 |
| 알림/추천 | `MarketerOpsStrip` 복합 | Paper 2컬럼: Budget 카드 + AI Recommendations 카드 |
| 헤더 | 일반 설명 카피 | `브랜드 — 마켓 · N campaigns · 사용자` |
| AI 행동 | 일부 UI만 | Apply(기존 API) + Skip(신규 write) |

### 9.3 작업 분해 (Execution Queue — Phase 2)

| 단계 | 작업 | 산출물 |
|------|------|--------|
| P8 | 상태 점 집계 규칙을 코드 상수/헬퍼로 단일화 (탭 필터와 공유) | `campaigns` 도메인 헬퍼 + (선택) 단위 테스트 |
| P9 | `GET /api/ads/budgets`를 Campaigns 탭에서 병렬 호출(또는 marketer 응답 확장)하여 YTD/연간 페이싱 표시 | 훅/타입 확장 |
| P10 | Paper용 **My Budget Pacing** 카드 컴포넌트 (250줄 이하, 기존 `ProgressBar`/토큰 재사용) | 신규 컴포넌트 + `campaigns-tab-content` 조립 |
| P11 | Paper용 **AI Recommendations** 프리뷰 카드 + `POST .../recommendations/[id]/skip`(또는 PATCH) | 신규 API route + 쿼리 `skipRecommendation` |
| P12 | **컨텍스트 헤더** + **상태 점** 줄 (`markets` + `pagination.total` + `GET /api/users/me`) | `page-tabs-header` 또는 전용 소형 컴포넌트 |
| P13 | `MarketerOpsStrip` / `CampaignStatusStrip` 제거 또는 미사용 처리, 회귀·harness·타입체크 | PR + 갭 문서 Check 갱신 |

### 9.4 수용 기준 (추가)

- **AC-4 (Paper 상단)**: 마켓 선택 후 S03에서 **8타일 KPI가 노출되지 않는다**. 대신 Budget Pacing + AI Recommendations 2카드가 Paper 정보 위계에 대응한다.
- **AC-5 (AI 행동)**: Apply는 기존과 동일하게 동작한다. Skip 후 새로고침해도 해당 행은 pending에 나타나지 않는다(`skipped`).
- **AC-6 (상태 점)**: 상태 점에 표시된 Critical/Attention 수가 **워크리스트 탭과 동일 규칙**의 건수와 일치한다(On Track은 파생).
- **AC-7 (성능)**: Campaigns 탭 초기 로딩이 Paper 대비 과도한 waterfall이 되지 않도록 fetch는 **병렬**을 유지한다(필요 시 단일 병합 API는 Phase 2.1 옵션).

### 9.5 리스크 및 대응

- **리스크**: budgets + campaigns + marketer + recommendations 병렬 호출 증가.  
  - **대응**: 우선 병렬 유지; 느리면 marketer 또는 전용 summary API에 YTD 스냅샷만 합류.
- **리스크**: Skip write 오남용.  
  - **대응**: `withAuth` + recommendation row의 `brand_market_id`가 요청 컨텍스트와 일치하는지 검증.
- **리스크**: 250줄 정책으로 파일 분할 증가.  
  - **대응**: 카드별 파일 1개 + 순수 포맷터/헬퍼 분리.

### 9.6 Out of Scope (Phase 2)

- Paper와 무관한 **다크/라이트 테마 전환** 일괄 개편.
- Amazon write-back 로직 변경(Approve 경로는 기존 유지).
- S01/S02 대시보드 레이아웃 변경.

