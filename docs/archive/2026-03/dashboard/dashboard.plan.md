# Dashboard Planning Document

> **Summary**: 위반 통계 시각화 대시보드 — 신고 현황, 위반 유형 분포, 해결률, 트렌드 차트
>
> **Project**: Sentinel
> **Author**: Claude (PDCA)
> **Date**: 2026-03-02
> **Status**: Draft
> **Version**: 0.1

---

## 1. Overview

### 1.1 Purpose

현재 대시보드(`/dashboard`)는 기본 카운터(4개 stat 카드)와 최근 신고/캠페인 목록만 표시한다. 경영진과 브랜드 보호 담당자가 한눈에 위반 현황을 파악할 수 있는 시각적 통계 대시보드가 필요하다. Recharts 기반의 인터랙티브 차트로 위반 유형 분포, 신고 상태별 현황, 시간별 트렌드, AI 성과 지표를 시각화한다.

### 1.2 Background

- 현재 대시보드: 4개 stat 카드 + Recent Reports (3건) + Active Campaigns 목록만 표시
- 경영진/담당자가 원하는 정보: "이번 주/달에 신고 몇 건?", "어떤 위반이 가장 많지?", "AI 정확도는?", "해결률은?"
- OMS에는 대시보드가 아예 없었음 → Sentinel만의 차별화 기능
- 기획 문서: F15 (위반 통계 대시보드), P1 우선순위, MS3
- 사용자: 브랜드 보호 담당자 (3명), 경영진 (3명), 팀 리더 (5명)
- 기술 스택에 **Recharts** 이미 지정됨 (Sentinel_Project_Context.md)

### 1.3 Related Documents

- `Sentinel_Project_Context.md` — "위반 통계 대시보드 (F15)", "승인/Re-write/수정 비율 대시보드", "불일치율 모니터링"
- Feature IDs: **F15** (위반 통계 대시보드)
- 관련 기능: F18 (위반 트렌드 분석 — Out of Scope, 별도 피처)

---

## 2. Scope

### 2.1 In Scope

- [x] 통계 요약 카드 개선 — 기존 4개 + 신규 지표 (해결률, AI 정확도, 모니터링 중)
- [x] 위반 유형 분포 차트 — 5카테고리 × V01~V19 분포 (Pie/Donut + Bar)
- [x] 신고 상태 파이프라인 — 상태별 건수 흐름 (Funnel/Bar)
- [x] 시간별 신고 추이 — 일별/주별/월별 신고 수 + 해결 수 (Line/Area)
- [x] AI 성과 지표 — AI 확신도 분포, 불일치율, 승인/Re-write 비율
- [x] 모니터링 현황 — 모니터링 중 건수, 해결/미해결 비율
- [x] 대시보드 API — 통계 데이터 집계 엔드포인트
- [x] Demo mode 차트 데이터 — 개발/검증용 풍부한 데모 데이터
- [x] 반응형 레이아웃 — 모바일/태블릿/데스크탑 최적화

### 2.2 Out of Scope

- 위반 트렌드 분석 및 알림 (F18 — 별도 피처)
- 주간/월간 자동 리포트 PDF/Excel 생성 (F17 — 별도 피처)
- 실시간 업데이트 (Supabase Realtime — 향후 Enhancement)
- 커스텀 날짜 범위 필터 (v2에서 추가)
- 사용자별 판단 정확도 추적 (세부 분석 — 향후)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| FR-01 | 통계 요약 카드 6개 (활성 캠페인, 대기 신고, 수집 리스팅, 해결률, AI 정확도, 모니터링 중) | High | F15 |
| FR-02 | 위반 유형 분포 차트 (Donut: 5카테고리, Bar: V01~V19 TOP 10) | High | F15 |
| FR-03 | 신고 상태 파이프라인 (draft→pending→approved→submitted→monitoring→resolved 흐름) | High | F15 |
| FR-04 | 시간별 신고 추이 (최근 30일 일별, Line/Area 차트) | High | F15 |
| FR-05 | AI 성과 지표 (확신도 분포 Histogram, 불일치율 %, 승인/Re-write 비율) | Medium | Context §5 |
| FR-06 | 기간 필터 (7일/30일/90일/전체) | Medium | UX |
| FR-07 | 대시보드 API — 집계 쿼리 + Demo mode | High | F15 |
| FR-08 | 모바일 반응형 (차트 세로 스택, 카드 2열) | Medium | UX |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Performance | 대시보드 로딩 < 2초 | Lighthouse |
| Bundle Size | Recharts tree-shaking, 차트 컴포넌트 lazy load | Bundle Analyzer |
| Accessibility | 차트 alt text, 키보드 네비게이션 | WCAG 2.1 AA |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] 대시보드에 6개 차트/위젯이 표시됨
- [x] 위반 유형 분포, 상태 파이프라인, 시간 추이, AI 성과 차트
- [x] 기간 필터 (7일/30일/90일) 동작
- [x] Demo mode에서 풍부한 차트 데이터 표시
- [x] 모바일/데스크탑 반응형 레이아웃
- [x] pnpm typecheck + pnpm build 성공

### 4.2 Quality Criteria

- [x] 타입 에러 없음
- [x] 빌드 성공
- [x] Gap Analysis Match Rate >= 90%

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Recharts 번들 크기 | Medium | Medium | dynamic import + tree-shaking, 필요한 컴포넌트만 import |
| Demo 데이터 부족 | Low | Low | 충분한 Mock 데이터 생성 (30일분 일별 데이터) |
| 실 데이터 집계 쿼리 느림 | Medium | Low | Supabase view 또는 materialized 활용, 캐싱 |
| 차트 모바일 가독성 | Medium | Medium | 모바일에서는 단순 표 형태로 대체 또는 축소 표시 |

---

## 6. Architecture Considerations

### 6.1 Project Level

| Level | Selected |
|-------|:--------:|
| **Dynamic** | ✅ |

### 6.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 차트 라이브러리 | Recharts | 기획 문서 지정, React 네이티브, 번들 합리적 |
| 데이터 집계 | Server Component + API | page.tsx에서 집계, DashboardContent로 전달 |
| 기간 필터 | Client-side state | URL param 또는 useState, API 재호출 |
| Demo 데이터 | `src/lib/demo/dashboard.ts` | 기존 패턴 준수 |

### 6.3 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│ Dashboard              [7d] [30d] [90d] [All]           │
├─────────┬─────────┬──────────┬──────────┬───────┬───────┤
│ Active  │ Pending │ Listings │ Resolved │  AI   │Monitor│
│ Camps.  │ Reports │ Collect. │   Rate   │ Accu. │  ing  │
│   3     │   12    │   156    │  72%     │ 89%   │   5   │
├─────────┴─────────┴──────────┴──────────┴───────┴───────┤
│                                                         │
│  [Report Trend - Line Chart]        [Violation Dist.]   │
│  ──────────────────────────        ┌──────────────┐    │
│  30|         ╱╲                    │   Donut      │    │
│  20|    ╱╲╱╲╱  ╲                   │   Chart      │    │
│  10|╱╲╱╱        ╲──               │  (5 cats)    │    │
│   0└─────────────────              └──────────────┘    │
│    Feb 1        Mar 1                                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Status Pipeline - Bar]           [AI Performance]     │
│  Draft     ████████ 25             ┌──────────────┐    │
│  Pending   ██████ 18               │ Approve: 75% │    │
│  Approved  ████ 12                 │ Re-write: 15%│    │
│  Submitted ███ 8                   │ Reject: 10%  │    │
│  Monitor.  ██ 5                    │              │    │
│  Resolved  █████ 15                │ Disagree: 8% │    │
│                                    └──────────────┘    │
├─────────────────────────────────────────────────────────┤
│  [Top 10 Violation Types - Horizontal Bar]              │
│  V01 상표권 침해      ████████████████ 42               │
│  V02 저작권 침해      ████████████ 32                    │
│  V04 위조품 판매      ████████ 22                        │
│  V06 금지 키워드      ██████ 16                          │
│  V11 리뷰 조작        ████ 11                            │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

### 6.4 Mobile Layout

모바일에서는 2열 stat 카드 + 차트 세로 스택:
```
[Stats 2x3]
[Report Trend]
[Violation Donut]
[Status Pipeline]
[AI Performance]
[Top 10 Violations]
```

---

## 7. Existing Infrastructure

### 7.1 현재 대시보드 (`src/app/(protected)/dashboard/`)

- `page.tsx` — Server Component, Demo 데이터에서 stat 추출
- `DashboardContent.tsx` — Client Component, 4개 stat 카드 + Recent Reports + Active Campaigns
- 기존 패턴: page.tsx에서 데이터 준비 → Content로 전달

### 7.2 사용 가능한 데이터

- `reports` 테이블: status, violation_type, ai_confidence_score, disagreement_flag, created_at, approved_at, resolved_at
- `listings` 테이블: marketplace, created_at
- `campaigns` 테이블: status, keyword, marketplace
- `DEMO_REPORTS` (7건), `DEMO_CAMPAIGNS` (3건), `DEMO_LISTINGS` (7건), `DEMO_MONITORING_REPORTS` (2건)

### 7.3 Recharts 설치 필요

```bash
pnpm add recharts
```

---

## 8. Implementation Estimate

| 영역 | 예상 LoC | 복잡도 |
|------|:--------:|:------:|
| 대시보드 API (집계 + Demo) | ~150 | Medium |
| Demo 차트 데이터 | ~150 | Low |
| 차트 컴포넌트 (6개) | ~500 | High |
| DashboardContent 리디자인 | ~200 | Medium |
| page.tsx 데이터 로딩 | ~80 | Low |
| i18n 키 추가 | ~50 | Low |
| **합계** | **~1,130** | **Medium-High** |

---

## 9. Implementation Strategy

1. **Phase A: Recharts 설치 + Demo 데이터** — 차트 라이브러리 설치, 30일분 Demo 집계 데이터 생성
2. **Phase B: API** — 대시보드 통계 집계 엔드포인트 (`/api/dashboard/stats`)
3. **Phase C: 차트 컴포넌트** — 6개 차트 위젯 컴포넌트 구현
4. **Phase D: 대시보드 리디자인** — DashboardContent 개선, 기간 필터 추가
5. **Phase E: i18n + 반응형** — 번역 키 추가 + 모바일 최적화

---

## 10. Chart Components Specification

### 10.1 ReportTrendChart

- **유형**: AreaChart (Recharts)
- **데이터**: 일별 신고 수 + 해결 수 (최근 30일)
- **X축**: 날짜, **Y축**: 건수
- **시리즈**: 신규 신고 (primary color), 해결 (success color)

### 10.2 ViolationDistChart

- **유형**: PieChart (Donut)
- **데이터**: 5개 카테고리별 건수
- **색상**: 카테고리별 고유 색상
- **인터랙션**: 호버 시 건수 + 비율 표시

### 10.3 StatusPipelineChart

- **유형**: BarChart (Horizontal)
- **데이터**: status별 건수 (draft, pending_review, approved, submitted, monitoring, resolved, unresolved)
- **색상**: status별 기존 StatusBadge 색상과 일치

### 10.4 TopViolationsChart

- **유형**: BarChart (Horizontal)
- **데이터**: V01~V19 중 상위 10개 + 건수
- **정렬**: 건수 내림차순
- **라벨**: ViolationCode + 한글/영문 이름

### 10.5 AiPerformanceCard

- **유형**: 통계 카드 (차트 아닌 숫자 + 비율 바)
- **데이터**:
  - 평균 AI 확신도
  - 불일치율 (disagreement_flag / total)
  - 승인/Re-write/반려 비율
- **시각**: Progress bar 또는 mini donut

### 10.6 MonitoringSummaryCard

- **유형**: 통계 카드
- **데이터**: 모니터링 중 건수, 해결/미해결 건수, 평균 해결 소요일
- **시각**: 숫자 + 작은 상태 인디케이터

---

## 11. Next Steps

1. [ ] `/pdca design dashboard` — 상세 설계 문서 작성
2. [ ] 설계 검토 후 구현 시작
3. [ ] Gap Analysis >= 90% 달성

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial draft | Claude (PDCA) |
