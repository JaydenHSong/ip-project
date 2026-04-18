# AD Optimizer S01/S02/S03 1:1 매칭 — Design

> **Feature**: ads-dashboard-s01-s03-matching
> **Plan**: `docs/01-plan/features/ads-dashboard-s01-s03-matching.plan.md`
> **Date**: 2026-04-12
> **Status**: Draft (Phase 2 IA appended 2026-04-13)  
> **갭 분석 (Check)**: `docs/03-analysis/features/ads-dashboard-s01-s03-matching.gap-analysis.md`

---

## 1. 목적

Paper 기준 페이지를 실제 라우트와 1:1로 정렬한다.

- `S01` → `/ads/dashboard` CEO View
- `S02` → `/ads/dashboard` Director View
- `S03` → `/ads/campaigns` 첫 화면 (마케터 대시보드)

핵심 UX 고정:
- 캠페인 리스트 row 클릭 시 상세는 **우측 슬라이드 인 패널**로 열린다.
- `New Campaign` 클릭 시 **생성 모달**이 열린다.

---

## 2. 페이지 스키마 (Information Architecture)

### 2.1 `/ads/dashboard` (S01/S02)

```text
/ads/dashboard
  ├─ Header (title + view context)
  ├─ Role Gate
  │   ├─ owner: CEO <-> Director toggle
  │   └─ admin: Director 고정
  └─ View Renderer
      ├─ S01 CEO
      │   ├─ AI status + alert badge
      │   ├─ Brand Pulse cards
      │   ├─ ROAS trend 30d
      │   └─ ACoS heatmap
      └─ S02 Director
          ├─ Budget pacing bar
          ├─ Market performance heatmap
          ├─ Auto Pilot impact
          ├─ Team performance
          └─ Pending actions
```

### 2.2 `/ads/campaigns` (S03)

#### 2.2.1 Phase 1 (현재 — 요약+워크리스트)

```text
/ads/campaigns (Marketer Dashboard)
  ├─ S03 Header / context
  ├─ S03 KPI strip + alert/queue summary
  ├─ Campaign worklist section
  │   ├─ tab/filter/search
  │   └─ campaign table
  ├─ Create CTA (New Campaign)
  └─ Overlay Layer
      ├─ campaign detail slide panel (/ads/campaigns/[id] route-layer)
      └─ campaign create modal
```

#### 2.2.2 Phase 2 — Paper S03 상단 (목표 IA)

```text
/ads/campaigns (Marketer Dashboard)
  ├─ Page shell (tabs: Campaigns | Budget Planning — 기존 유지)
  ├─ S03 Context header (한 줄)
  │   └─ "{brand} — {market} · {N} campaigns · {user display name}"
  ├─ S03 Health status row
  │   └─ "{nCritical} Critical" · "{nAttention} Attention" · "{nOnTrack} On Track"
  ├─ S03 Summary row (2 columns, desktop)
  │   ├─ My Budget Pacing (단일 카드)
  │   │   ├─ Month day label (e.g. Day 26/31) — 클라이언트 달력
  │   │   ├─ Spend / Budget MTD + progress — GET campaigns include_kpi
  │   │   ├─ Pace copy (On Pace / Behind / Ahead) — 파생
  │   │   └─ Footer quad metrics: YTD annual, ACoS vs target, C/A counts, AI queue
  │   └─ AI Recommendations (단일 카드)
  │       ├─ pending count — marketer 또는 GET recommendations
  │       ├─ top 3 rows (one-line copy per row)
  │       ├─ per-row Apply / Skip
  │       └─ link "View all in S11 →" → 기존 S11 recommendations 라우트
  ├─ Campaign worklist section (기존과 동일)
  └─ Overlay Layer (기존과 동일)
```

**제거(Phase 2 기본 화면)**: 8타일 `CampaignStatusStrip`, 기존 `MarketerOpsStrip` 복합 블록.

---

## 3. 컴포넌트 매핑

## 3.1 S01 CEO (재사용 중심)

| 역할 | 컴포넌트 | 상태 |
|------|----------|------|
| 컨테이너 | `CeoDashboard` | 유지/정렬 |
| 브랜드 카드 | `BrandPulseCard` | 유지/스타일 정렬 |
| 추이 차트 | `RoasTrendChart` | 유지 |
| 히트맵 | `AcosHeatmap` | 유지 |

추가 규칙:
- `AI status`, `alerts_count`는 S01 헤더 신호 영역으로 고정
- 카드/차트/히트맵 순서는 Paper S01과 동일하게 고정

## 3.2 S02 Director (재사용 중심)

| 역할 | 컴포넌트 | 상태 |
|------|----------|------|
| 컨테이너 | `DirectorDashboard` | 유지/정렬 |
| 전폭 페이싱 | `BudgetPacingBar` | 유지 |
| 성과 히트맵 | `AcosHeatmap` | 유지 |
| 임팩트 요약 | `KpiCard` 조합 | 유지 |
| 팀 성과/액션 | `DirectorDashboard` 내부 table/list | 유지 |

## 3.3 S03 Marketer (`/ads/campaigns`)

| 역할 | 컴포넌트 | Phase 1 | Phase 2 (Paper) |
|------|----------|---------|-----------------|
| KPI strip (8타일) | `CampaignStatusStrip` | 사용 | **제거** (수치는 Budget 카드로 흡수) |
| Alert/queue 요약 | `MarketerOpsStrip` | 사용 | **제거** → 2카드로 분리 |
| worklist | `CampaignTable` | 유지 | 유지 |
| 상세 패널 | `CampaignDetailPanel` | 유지 | 유지 |
| 생성 플로우 | `CampaignCreateModal` | 유지 | 유지 |
| Campaign-level AI 큐 | `AiQueuePreview` (상세 패널 내부) | 유지 | 유지 |
| 컨텍스트 헤더 | (분산 카피) | 부분 | **`CampaignsContextHeader`** (신규, 250줄 이하) |
| 상태 점 | — | 없음 | **`CampaignsHealthDots`** (신규) |
| Paper Budget 카드 | — | 없음 | **`CampaignsBudgetPacingCard`** (신규) |
| Paper AI 카드 | — | 없음 | **`CampaignsAiRecommendationsCard`** (신규) |

페이지 컴포지션:
- `MarketerDashboard` / `CampaignsTabContent`에서 Phase 2 블록 순서를 **§2.2.2**와 동일하게 조립한다.

---

## 4. 데이터 스키마 / 타입 계약

## 4.1 기존 타입 (유지)

- CEO: `CeoDashboardData`
- Director: `DirectorDashboardData`
- Campaigns: `CampaignKpiSummary`, `CampaignListItem`, `CampaignDetail`

## 4.2 신규 타입 (추가)

`src/modules/ads/features/dashboard/types.ts`에 S03 응답 계약을 추가한다.

```ts
type MarketerDashboardData = {
  /** 미리보기 행(전체 `CampaignListItem` 아님); 상세는 campaigns 목록 API 사용 */
  campaigns: { id: string; name: string; status: string; mode: string; target_acos: number | null; daily_budget: number | null; weekly_budget: number | null }[]
  campaign_count: number
  alerts: {
    id: string
    alert_type: string
    severity: 'critical' | 'warning' | 'info'
    title: string
    created_at: string
  }[]
  alert_count: number
  recommendations: {
    id: string
    type: string
    priority: number
    status: string
    created_at: string
    keyword_text: string
  }[]
  recommendation_count: number
}
```

---

## 5. API 설계 매핑

| 페이지 | API | 권한 | 비고 |
|-------|-----|------|------|
| S01 | `GET /api/ads/dashboard/ceo` | owner | 유지 |
| S02 | `GET /api/ads/dashboard/director` | admin, owner | 유지 |
| S03 | `GET /api/ads/dashboard/marketer` | viewer~owner | alerts / recommendation_count / preview campaigns |
| S03 | `GET /api/ads/campaigns?include_kpi=true` | viewer~owner | 목록 + `CampaignKpiSummary` (Budget 카드 MTD) |
| S03 | `GET /api/ads/budgets?brand_market_id=&year=` | viewer~owner | Phase 2: YTD·연간 계획 스냅샷 (Budget 카드 하단) |
| S03 | `GET /api/ads/recommendations?status=pending` | viewer~owner | Phase 2: AI 카드 상위 N행 (marketer와 중복 최소화 가능) |
| S03 | `POST /api/ads/recommendations/[id]/approve` | editor+ | Apply (기존) |
| S03 | `POST /api/ads/recommendations/[id]/skip` (신규) | editor+ | Phase 2: Skip → `status=skipped` |
| S03 | `GET /api/ads/markets` | viewer~owner | 컨텍스트 헤더 라벨 |
| S03 | `GET /api/users/me` | authed | 컨텍스트 헤더 사용자 표시명 |

보완 사항:
- Phase 2는 **병렬 fetch**를 기본으로 한다. 느리면 marketer 또는 전용 summary API에 필드 합류(Plan §9.5).
- fetch 실패 시 **카드 단위** error/Retry를 허용해 한 API 실패가 전체 페이지를 막지 않게 한다.

---

## 6. 인터랙션 디자인 (필수)

## 6.1 리스트 -> 상세 슬라이드

- 트리거: `CampaignTable` row click
- 동작:
  - route push: `/ads/campaigns/[id]`
  - base page(`/ads/campaigns`) 유지 + detail panel overlay
  - panel open/close animation 200ms 내
- 종료:
  - 좌측 back 화살표 클릭
  - dimmed backdrop 클릭
  - (추가 권장) ESC 키 close

## 6.2 New Campaign -> 생성 모달

- 트리거: `New Campaign` CTA
- 동작:
  - `CampaignCreateModal` open
  - 4-step wizard 진행
  - submit 성공 시 modal close + 목록/요약 갱신

---

## 7. 상태 디자인 (Loading / Empty / Error)

모든 S01/S02/S03에 동일 패턴 적용:

- Loading: skeleton 블록
- Empty: 안내 문구 + 다음 행동 CTA
- Error: 원인/재시도 버튼 명시

특히 S03는 아래를 별도 상태로 분리:
- market 미선택
- 권한은 있지만 데이터 없음
- API 실패

---

## 8. 구현 순서 (Design -> Do 브릿지)

| Step | 작업 | 결과 |
|------|------|------|
| D1 | dashboard/campaigns role 정책 고정 | 페이지 진입 규칙 문서화 |
| D2 | S01/S02 레이아웃 미세 정렬 명세 | CEO/Director 컴포넌트 기준선 고정 |
| D3 | S03 섹션 구조 명세 | `/ads/campaigns` IA 확정 |
| D4 | Marketer 타입/API 계약 추가 | TS 계약/응답 스키마 고정 |
| D5 | 인터랙션(슬라이드/모달) 시나리오 테스트 케이스 명세 | 회귀 방지 기준 확보 |
| D6 | Phase 2 IA(§2.2.2) + 컴포넌트 표(§3.3) 고정 | Paper 상단 단순화 기준선 |
| D7 | 상태 점 = 워크리스트 탭 규칙 단일화 | 건수 불일치 방지 |
| D8 | Skip 영속 API 계약 | S11 로컬 스킵과 구분 |

---

## 9. 검증 체크리스트

- [ ] owner로 `/ads/dashboard` 진입 시 CEO/Director 토글 가능
- [ ] admin으로 `/ads/dashboard` 진입 시 Director만 노출
- [ ] marketer 계열로 Campaigns 클릭 시 S03 첫 화면 렌더링
- [ ] 캠페인 row 클릭 시 상세 슬라이드 인 패널 오픈
- [ ] `New Campaign` 클릭 시 생성 모달 오픈
- [ ] 생성 성공 시 리스트/KPI 갱신
- [ ] loading/empty/error 상태가 페이지마다 명시 렌더링
- [ ] Phase 2: Paper 상단 4블록(헤더·상태점·2카드) 노출, 8타일 KPI 미노출
- [ ] Phase 2: Apply/Skip 동작 및 Skip 영속성
- [ ] Phase 2: 상태 점 숫자 = 탭 규칙과 일치

---

## 10. 하네스 엔지니어링 프리셋 훅

### 10.1 목표

- 재사용 가능한 컴포넌트 중심 구현을 강제한다.
- 하드코딩(inline style)과 비대형 파일(250줄 초과)을 자동 검출한다.

### 10.2 적용 규칙

- 파일 길이 제한: 250줄
- inline style 금지: `style={{ ... }}`
- 구현 전 기존 컴포넌트 재사용 가능성 검토(수동 체크리스트)
- 250줄 초과 예외는 사용자 코드 검수/승인 이후에만 허용하며, 예외 파일/사유를 작업 로그에 남긴다.

### 10.3 실행 명령

- `pnpm harness:ads` : 현재 변경 파일 대상 프리셋 검사
- `pnpm harness:ads:staged` : staged 파일 대상 프리셋 검사
- `pnpm harness:ads:full` : `typecheck + lint + harness`

### 10.4 훅 템플릿

- pre-commit 템플릿: `.githooks/pre-commit`
- 팀 표준으로 사용할 경우 저장소 로컬에서 hooksPath를 `.githooks`로 지정해 활성화한다.

