# AD Optimizer Planning Document

> **Summary**: Amazon 광고 운영을 자동화하는 A.R.C. 플랫폼의 AD Optimizer 모듈. 캠페인 관리, 비딩/예산/키워드 통합 최적화, AI 자율 운영까지.
>
> **Project**: A.R.C. (Amazon Resource Controller)
> **Author**: Jayden Song (PM)
> **Date**: 2026-03-25
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Spigen의 Amazon 광고 운영이 수동에 의존 — 10+ 마켓플레이스, 수천 캠페인의 비딩/예산/키워드를 사람이 관리. 최적화 기회 상실, 팀별 예산 추적 불가, 신제품 런칭 시 캠페인 수동 생성에 수일 소요 |
| **Solution** | Amazon Ads API v3 + Marketing Stream + SP-API를 통합한 3-Category 광고 자동화 시스템: A) Campaign Management, B) Optimization Engine, D) Full Auto Pilot |
| **Function/UX Effect** | 캠페인 생성 자동화, 시간대별 비딩 최적화, 키워드 자동 발굴(Broad→Exact), 예산 24시간 균등 분배, 미소진 원인 AI 진단. 마케터는 목표만 설정하고 결과를 확인 |
| **Core Value** | 외부 SaaS 대비 연 $60K-$360K 절감 + 내부 데이터(재고/COGS/리스팅) 통합으로 경쟁사 도구가 불가능한 최적화 실현. 광고 의존도 감소(TACoS 관리)와 이익 극대화 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 수동 광고 운영의 비효율 제거 + 외부 SaaS 비용 절감 + 내부 데이터 통합 차별화 |
| **WHO** | Spigen 마케팅/광고 운영팀 (3 브랜드 × 4+ 마켓 = 12+ 계정, 팀별 권한) |
| **RISK** | Amazon API 인증 미확보, Marketing Stream AWS 인프라 셋업, 자동화 안전장치 미흡 시 예산 낭비 |
| **SUCCESS** | 광고 운영 시간 70% 절감, 키워드 발굴 자동화율 80%+, 예산 소진율 90%+ (Daily Pacing) |
| **SCOPE** | Phase 1: Campaign Mgmt + Optimization Engine MVP → Phase 2: Full Auto Pilot + Marketing Stream 고도화 |

---

## 1. Overview

### 1.1 Purpose

Spigen의 Amazon 광고 운영을 자동화하여:
- 수동 비딩/키워드/예산 관리에 소요되는 시간을 70%+ 절감
- 데이터 기반 최적화로 ACoS/TACoS 개선
- 팀별 예산 추적 및 Finance 모듈 연계 기반 마련
- 신제품 런칭 시 캠페인 자동 생성으로 Time-to-Market 단축

### 1.2 Background

- **3개 브랜드**: Spigen, Legato, Cyrill (Cyrill은 추후 화장품 브랜드로 전환 예정)
- **4+ 마켓플레이스**: US, CA, EU(DE), JP 등 — 브랜드 × 마켓 = **12+ 별도 Amazon 계정**
- 각 계정마다 별도 Seller Central 로그인 + 별도 API 인증 (refresh_token)
- 현재 Amazon Seller Central 콘솔에서 수동 관리 중
- 외부 SaaS (Pacvue, Perpetua 등)는 연 $60K-$360K+ 비용 + 내부 데이터 통합 불가
- A.R.C. 플랫폼에 이미 IP Protection 모듈 완료, 같은 인프라에서 AD 모듈 추가
- Orders 데이터는 별도 서버에서 데일리 수집 중 (데이파팅/TACoS 데이터 소스)
- **Secret 관리**: Doppler MCP 연동 (계정별 환경변수 분리 관리)

### 1.3 Related Documents

- Competitive Research: `docs/00-research/ad-optimizer-competitive-analysis.md`
- Platform Architecture: `docs/ARCHITECTURE.md`
- Module Context: `src/modules/ads/CLAUDE.md`
- Safety Rules: `docs/BOUNDARIES.md`

---

## 2. Scope

### 2.1 In Scope

**A. Campaign Management (캠페인 관리)**
- [ ] 캠페인 CRUD (SP/SB/SD) + 팀 프리픽스 자동 부착 (org_unit 기반)
- [ ] 리스팅 오픈 감지 → 캠페인 템플릿 기반 자동 생성
- [ ] 역할별 대시보드 뷰 (CEO 30초 / Director 1분 / 마케터 상세)
- [ ] 캠페인 모니터링 + 구글시트 연동 + Slack 알림
- [ ] 캠페인 네이밍 컨벤션 강제 (Finance 연계용)

**B. Optimization Engine (최적화 엔진)**
- [ ] 비딩 자동 조정 (추천값 N% 기반 + ACoS 성과 연동)
- [ ] 데이파팅 (Marketing Stream 시간별 데이터 → 시간대별 비딩 가중치)
- [ ] 일일 예산 미소진 원인 AI 분석
- [ ] 키워드 랭킹 추적 (Brand Analytics)
- [ ] AI 예산 밸런스 (Daily Budget 24시간 균등/가중치 분배)

**D. Full Auto Pilot (자율 운영)**
- [ ] 캠페인 + 주간 예산 → AI가 전 과정 자율 운영
- [ ] 키워드 발굴 파이프라인 (Broad → Phrase → Exact)
- [ ] 네거티브 키워드 자동 등록
- [ ] 타겟 키워드 자동 추가
- [ ] 핫 시간 자동 설정 (데이파팅 연계)
- [ ] 저성과 캠페인 자동 비활성

**인프라/공통**
- [ ] Amazon Ads API v3 OAuth 연동 (인증 셋업)
- [ ] Amazon Marketing Stream (AWS SQS → Supabase)
- [ ] `ads` PostgreSQL 스키마 설계 및 생성
- [ ] GitHub Actions CI (typecheck + lint + build)
- [ ] 안전장치 시스템 (10개 필수 guardrails)

### 2.2 Out of Scope

- Amazon DSP (Demand-Side Platform) 관리 — Phase 3 이후
- AMC (Amazon Marketing Cloud) SQL 분석 — Phase 3 이후
- 멀티마켓 통합 뷰의 고급 분석 (크로스마켓 최적화) — Phase 2 이후. MVP에서는 역할별 대시보드로 브랜드×마켓 매트릭스 조회 가능
- Performance+ 캠페인 타입 — Amazon 정식 출시 후
- 크로스채널 어트리뷰션 (Google/Meta → Amazon) — Phase 3
- 제품별 COGS/마진 기반 이익 최적화 — Finance 모듈 완성 후

---

## 3. Requirements

### 3.1 Functional Requirements

**A. Campaign Management**

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-A01 | 캠페인 목록 조회/필터/정렬 (SP/SB/SD) | High | Pending |
| FR-A02 | **캠페인 생성 시 마케팅 코드 자동 부착** — 기존 iBD 마케팅 코드 체계 통합. M01 Step 1에서 Platform(2자리) + Channel(2자리) + Unit(2자리) = **6자리 코드** 자동 생성. Platform은 대부분 11(Amazon Sponsored) 고정, Channel은 마켓 선택에 따라 자동(US=11, CA=12, MX=14...), Unit은 제품군 드롭다운으로 선택(Flagship Phone=11, Mobile=12, Magsafe=31...). **org_unit 기반 담당자**: 마케터는 자동 선택, Director는 하위 팀 드롭다운. 담당자 이름 [Name] 자동 삽입. **최종 네이밍 형식**: `{6자리코드} {(타입태그)} {제품명} [{담당자}] - {날짜코드}`. 예: `111112 (Search Term) Galaxy S26 Optik Pro [Kelly] - 222007` | High | Pending |
| FR-A03 | **캠페인 네이밍 — 기존 코드 체계 호환** — 기존 Spigen iBD Advertising Budget Plan 코드 체계와 100% 호환. **8자리 Budget Code**: Platform(2)+Channel(2)+Brand(2)+Type(2), **10자리 Analysis Code**: +Manufacturer(2). 캠페인 타입 태그: `(Search Term)` = 하베스팅, 태그 없음 = 타겟. **S06 캠페인 매핑 연계**: 키워드 승격 시 `(Search Term)` 제거 + 같은 코드 + 같은 제품명으로 대상 캠페인 자동 매칭. **S05/S13 예산 연계**: 6자리 코드로 Finance 예산 추적과 광고 데이터 자동 매칭. ads.campaigns 테이블에 `marketing_code` 컬럼 필수. 수동 수정 가능하되 코드 형식 검증 필수 | High | Pending |
| FR-A04 | 리스팅 ASIN buyable 감지 → 캠페인 템플릿 자동 활성화 | High | Pending |
| FR-A05 | 캠페인별 구글시트 연동 (자동 리포트 업데이트) | Medium | Pending |
| FR-A06 | 임계값 알림 (ACoS, 예산 소진, 매출 0) → Slack/Email | Medium | Pending |
| FR-A07 | **팀 기반 캠페인 가시성** — 마케터는 자기 팀(org_unit) 캠페인만 조회. 부장(Director)은 하위 팀 멀티셀렉트 가능. 캠페인에 `created_by` 표시 (누가 만들었는지). RLS로 자동 필터링 | High | Pending |

**B. Optimization Engine**

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-B01 | **비딩 자동 조정** — 추천값의 N% (설정 가능) + ACoS 성과 연동. **키워드 Impact 산정**: (1) Revenue 기여도 (해당 키워드 매출 / 캠페인 총 매출), (2) Spend 비중 (해당 키워드 소진 / 총 소진), (3) ACoS 이탈도 (현재 ACoS vs 타겟 ACoS 차이), (4) Brand Analytics 트렌드 가중치 (Rising ×1.3, Emerging ×1.2, Stable ×1.0, Declining ×0.7). Impact 순으로 정렬 → Top 3 = 전체 영향의 80%. **AI 추천 비딩**: 현재 bid + 성과 기반 조정폭 → 마케터 Approve/Adjust/Skip | High | Pending |
| FR-B02 | **데이파팅** — **Phase 1**: Orders DB(10년+ 히스토리)의 주문 타임스탬프로 요일×시간별 매출 패턴 분석 → 히트맵 데이터 소스. 제품(ASIN)별 시간대 패턴, 시즈널리티(월별/이벤트별), 요일별 차이 모두 도출 가능. 충분히 유의미한 데이파팅 근거. **Phase 2**: Marketing Stream(시간별 광고 귀속 성과) 추가 → "광고 클릭 → 전환"의 정확한 시간대 데이터로 정밀도 향상. Phase 1 데이터와 블렌딩하여 최적 bid multiplier 산출 | High | Pending |
| FR-B03 | AI 예산 밸런스 — Daily Budget 24시간 분배 (균등/가중치/스마트) | High | Pending |
| FR-B04 | 예산 미소진 원인 AI 분석 (비딩 부족, 재고 소진, Buy Box 상실 등) | High | Pending |
| FR-B05 | **키워드 랭킹 + 시즈널리티 예측** — Brand Analytics API(SP-API)에서 주간 Search Term Ranking/Click Share/Conversion Share 수집 → 1년치 히스토리 축적 → 시즈널 패턴 학습 (iPhone 출시 9월, Galaxy 1/7월, Prime Day, Black Friday). 트렌드 시그널(Rising/Declining/Emerging) + 예측 키워드 추천 ("iphone 17 case" 선점). S04 키워드 중요도에 트렌드 가중치 반영 | High | Pending |
| FR-B05a | **AI 키워드 인텔리전스 파이프라인** — 주단위 Brand Analytics 데이터 자동 수집(일~토) → AI API 연결하여 트렌드 분석 자동화. **3단계**: (1) Data Collection: 주 1회 keyword_rankings 테이블에 Search Frequency Rank, Click Share, Conversion Share, Top 3 ASINs 적재 (52주 히스토리 누적), (2) AI Trend Analysis: 최근 12주 + 전년 동기 데이터를 AI에 전달 → 트렌드 방향(Rising/Stable/Declining), 시즈널리티 패턴 감지, 신규 키워드 발견(첫 Top 1000 진입), 경쟁사 ASIN 진입 감지, 기회 키워드(높은 검색량+낮은 경쟁) 식별, (3) Keyword Recommendations: AI 분석 결과를 ads.keyword_recommendations에 저장 → S11 AI Recommendations에서 마케터가 확인/Approve/적용. 각 추천에 keyword+match_type, 추천 이유(한 문장), 예상 영향도(H/M/L), 액션("Add to Campaign X"), 12주 트렌드 미니차트 포함. **주니어 시나리오**: "아이폰 17 대응해줘" → AI가 전년 아이폰 16 출시 때 급등 키워드 분석 → 올해 버전 변환 → 추천 bid와 함께 원클릭 캠페인 생성 | High | Pending |
| FR-B06 | Spend 이상 탐지 (CPC 급등, 전환율 급락, 예산 조기 소진) | Medium | Pending |
| FR-B07 | **Budget Hierarchy** — 팀 → 채널 → 마켓 → 브랜드 → 전사 예산 계층 집계. 팀이 월간 예산 입력 → 연간 자동 계산 → 상위 레벨 자동 집계. **월간 + 연간 이중 페이싱**: (1) Monthly Pacing — S02에서 당월 예산 대비 실 소진 프로그레스, (2) Annual Pacing — S02 상단 또는 S13에서 YTD 연간 예산 대비 누적 소진 프로그레스. Director는 월간과 연간 둘 다 한 화면에서 확인 가능 | High | Pending |
| FR-B08 | **Budget Hub (S13)** — 역할별 적응형. **부문장**: 팀별 예산 비교 카드 (Team A/B/C 소진율 프로그레스 나란히), 팀 간 재배분 승인, 드릴다운 시 팀장 뷰 전환. **팀장**: 내 팀 마켓별 탭(US/CA/DE/JP), 월별×채널(SP/SB/SD) 입력 그리드 (Jan-Dec 12개월 + Annual 자동합산), Plan vs Actual 차트, Channel Breakdown. **마케터**: S13 접근 안 함 (S03 잔액 바로 충분). 공통: 과거 사용 트렌드로 다음 달 예산을 합리적으로 설정 | High | Pending |
| FR-B09 | Budget Reallocation — 미소진 예산 재배분 제안, 초과 소진 팀 알림, Director 승인 워크플로 | Medium | Pending |

**C. Full Auto Pilot**

> **핵심 아키텍처 결정**: 캠페인 생성 시 Auto Pilot On/Off를 선택하면 **변경 불가**. 교차 관리 안 됨.
> - Auto Pilot ON → S08/S09 Auto Pilot 메뉴에서만 관리. Optimization(S04-S07)에 안 보임. AI가 전과정 자율 운영 (Level 5).
> - Auto Pilot OFF → Optimization(S04-S07)에서만 관리. Auto Pilot 메뉴에 안 보임. 사람이 직접 조작, AI는 추천만(S11).
> - S03 Campaigns 테이블에서는 둘 다 보이되 뱃지로 구분. Auto Pilot 캠페인 클릭 → S09 Detail, Manual 캠페인 클릭 → M02 패널.
> - **M01 Step 2에서 모드 선택** (Auto Pilot / Manual) = 돌이킬 수 없는 선택 (UX에서 명확히 경고)
> - Auto Pilot 선택 시: Step 3a (주간 예산만) → Step 4a (Review & Launch). 간단.
> - Manual 선택 시: Step 3b (Type & Targeting) → Step 4b (Products, Budget, Keywords) → Step 5b (Review & Create). 상세 설정.
> - **M06 Launch Playbook은 M01에 흡수됨** — 별도 모달 아님. M01 Step 2에서 Auto Pilot 선택 = 기존 M06의 역할.
> - 마켓은 항상 **단일 선택** (멀티 마켓 금지 — 마켓별 담당자/환경/타이밍 다름)
> - **모드 전환 불가 — Clone + Pause 패턴**: Auto Pilot → Manual 전환 없음. 대신 캠페인 Clone(Manual로 생성) + 원본 Auto Pilot Pause. 역방향도 동일.
> - **S11 AI Recommendations = Manual 전용 + Beta**: Auto Pilot은 Level 5 자율 운영이므로 사용자 관여 불가. S11은 Manual 캠페인에만 AI 추천 제공. 오픈 시 Beta 뱃지 필수.
> - **S02 Director → S08 내비게이션**: S02의 Auto Pilot Activity 섹션 클릭 → S08 Auto Pilot Main으로 이동.
> - **S13 Annual Budget Planning — Auto Pilot 예산 포함**: 총액에 합산되되, Auto Pilot 예산은 별도 색상(오렌지 계열)으로 시각 구분. 주간예산 × 4.33 = 월간 환산. S03 "Budget Planning" 탭으로 진입 (별도 사이드바 메뉴 아님). 승인 플로우 없음 — 변경 로그만 기록.
>
> **사이드바 메뉴 구조** (5개 유지, 서브메뉴/탭으로 확장):
> | 메뉴 | 화면 | 진입 방식 |
> |------|------|----------|
> | Dashboard | S01 CEO / S02 Director | 역할별 자동 |
> | Campaigns | S03 Campaigns \| S13 Budget Planning | S03 상단 탭 |
> | Optimization | S04 Bid Optimization / S05 Daily Budget Pacing / S06 Keywords / S07 Dayparting Schedule / S11 AI Recommendations | S04 서브탭 |
> | Auto Pilot | S08 Main / S09 Detail | 행 클릭 |
> | Reports | S12 Spend Intelligence | — |
>
> **화면 정식 명칭 변경** (2026-03-30):
> - S04: Optimization Bidding → **Bid Optimization**
> - S05: Optimization Budget → **Daily Budget Pacing**
> - S07: Optimization Dayparting → **Dayparting Schedule**
> - S13: Budget Hub → **Annual Budget Planning** (S03 탭)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-D01 | 자율 운영 모드: 캠페인 생성 시 Auto Pilot ON 선택 → 이후 변경 불가 → AI가 전과정 관리 (비딩, 키워드, 예산, 데이파팅). 유저는 타겟 ACoS + 주간 예산만 설정. S08/S09에서만 모니터링 | High | Pending |
| FR-D02 | 키워드 발굴 파이프라인 (Auto → Broad → Phrase → Exact) | High | Pending |
| FR-D03 | 네거티브 키워드 자동 등록 (clicks≥15, orders=0) | High | Pending |
| FR-D04 | 타겟 키워드 자동 추가 (전환 2+ & ACoS < 목표) | High | Pending |
| FR-D05 | 저성과 캠페인 자동 비활성 (14일+, ACoS > 목표 2배, 개선 없음) | High | Pending |
| FR-D06 | 자동화 활동 로그 (모든 AI 결정에 이유 기록 + 원클릭 롤백) | High | Pending |

**Dashboard 역할별 뷰**

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-V01 | **CEO 뷰** (owner): 4-Zone 레이아웃 — (A) 브랜드 신호등 + AI 상태 + 이상 알림 상태바, (B) 브랜드 Pulse 카드 3장 (ROAS 큰숫자 + TACoS 게이지바 + Spend/Sales/Orders 미니 스파크라인), (C) ROAS Trend 3-line 차트 + 타겟 기준선, (D) Brand×Market ACoS 히트맵 3×4. 30초 뷰, 읽지 않는 비주얼 인포. YoY는 Reports로 이동 | High | In Progress |
| FR-V02 | **Director 뷰** (admin): 4-Zone 레이아웃 — (1) Budget Pacing 전폭 (브랜드→마켓별 월간 예산 vs 실제 소진 프로그레스바, 타겟 마커로 on-track 판단), (2a) Market Performance ACoS 히트맵 3×4, (2b) Auto Pilot Impact 요약 (ACoS 변화, 절약액, 주요 액션 + 영향도), (3a) Team Performance 테이블 (심각도 순 정렬, 미니 페이싱 바), (3b) Pending Actions (긴급/주의/정보 그룹, CTA 버튼 포함). Budget Hierarchy 집계 필수 (FR-B07) | High | In Progress |
| FR-V03 | **캠페인 운영 뷰** (editor+팀장, S03): 역할별 적응형 대시보드. **마케터 로그인** → "My Campaigns" (내 캠페인만, 개인 KPI/예산), **팀장 로그인** → "Team Campaigns" (팀원 전체 캠페인, 팀원별 그룹핑/필터, 팀 합산 KPI/예산, 팀원 캠페인 대신 조치 가능). 공통: (A) Status Strip, (B) KPI+Budget Pacing (8칸, 개인↔팀 전환), (C) AI Queue (4칸), (D) Campaign Table (전폭, By 컬럼으로 팀원 식별). 매일 아침 실무 운영용 | High | In Progress |
| FR-V07 | **Optimization Bidding 뷰** (S04): Manual 캠페인 키워드별 입찰 최적화 화면. **레이아웃 (6 Zone)**: (A) Top Context Bar — "Optimization" 제목 + 캠페인 셀렉터(단일 선택) + "+ Add Rule" → M03 연결 + Breadcrumb (Dashboard > Optimization > 캠페인명), (A2) Sub-tabs — Bidding(active) / Budget / Keywords / Dayparting, (A3) Strategy Strip — Target ACoS / Max Bid Cap / Daily Change Limit / Rule 상태 (인라인 편집 가능, 얇은 #F9FAFB 스트립), (B) Today's Focus 카드 3장 (col-4 × 3) — AI가 추천한 임팩트 Top 3 키워드, 각 카드에 rank + trend tag(border-only) + keyword명 + 12-segment impact bar + bid 변경(Current → AI Rec + %) + Approve/Skip 버튼. **Progressive Disclosure**: 기본 3항목만 표시, "Why ›" 토글 시 imp-stats + 추천 이유 + seasonality 노트 슬라이드다운. (B2) Apply Top 3 Bar — 다크(#18181B) 전폭 바, "Apply Top 3 Recommendations" + 예상 임팩트(ACoS -X.Xpp) + 오렌지 "Apply All" CTA. 개별 Approve 시 카운트 동적 업데이트("Apply Remaining N"). Applied 후 카드 상태 동기화(opacity 0.7 + ✓ Applied + 10초 Undo), (C) Keyword Table — 전폭, Impact 순 기본 정렬. 컬럼: Checkbox / Keyword / Impact(12-segment bar) / Trend(border-only tag) / Current Bid / AI Rec / Δ(%) / ACoS / Revenue / Status. AI 추천 행은 left border 3px #18181B(grayscale, 오렌지 아님). 체크박스 벌크 선택 → 슬라이드다운 벌크 바 [Approve / Reject / Edit Bid / + Add Rule(M03 pre-fill)]. Pagination: "Show all" 또는 infinite scroll. **빈 상태(Empty State)**: 추천 없을 때 "All caught up" 메시지 + 마지막 분석 시각. **Dayparting 연계**: AI가 시간대별 ACoS 이상 감지 시 "Consider Dayparting" smart suggestion → Dayparting 탭으로 유도. **Adjust 패턴**: 별도 버튼 없이 bid input 수정 시 Approve 버튼 텍스트가 자동으로 "Approve $X.XX (adjusted)"로 변경. **색상 규칙**: 오렌지는 인터랙티브(탭, CTA, Apply All)에만. 트렌드 태그는 border-only(Rising #059669, Emerging #F97316, Stable #9CA3AF, Declining #B91C1C). 비인터랙티브 수치에 오렌지 사용 금지. Apply Bar의 est. impact 텍스트는 #6B7280, 숫자만 #059669 bold | High | Pending |
| FR-V08 | **Optimization Budget 뷰** (S05): 단일 캠페인의 당일 예산 소진 실황 화면. S02(월간/팀)과 차별화 — S05는 오늘/캠페인 레벨 미시 뷰. **레이아웃 (5 Zone)**: (A) Campaign Context Bar + Tabs (Budget 활성) + Strategy Strip (Distribution Smart / Daily Cap $3,200 / Pace Mode Even 24h / Edit 링크), (B) AI Budget Recommendation Card (조건부 — 조정 추천 시만 표시): "Increase daily budget to $3,800" + Apply/Skip CTA, (C) 7:5 Split — Left: 24h Hourly Spend Bar Chart (actual #18181B + predicted #D1D5DB + Now 오렌지 마커, X축 0-6-12-Now-18-24, 레전드) / Right: Today's Status ($2,180 hero 32px + 68% progress bar + On pace 상태 + Edit Daily Budget 버튼), (D) Underspend Watch (조건부 — utilization < 70% 시): 심각한 캠페인 미리보기 카드 1-2장 (캠페인명 + utilization progress bar(빨강/오렌지) + AI 원인 진단 한 줄 + "Analyze →" M05 연결), (E) Dayparting Signal (조건부 — 예산이 피크 전 소진 예측 시): "⚠ Budget may run out by 4:30 PM" + "Configure Dayparting →" 탭 전환 링크. **S02와의 차이**: S02=월간 팀/브랜드 예산 페이싱(Director 뷰), S05=오늘 단일 캠페인 24시간 소진 실황(Marketer 뷰). **색상 규칙**: Spend bar #18181B, Predicted #D1D5DB, Now marker #F97316. Underspend < 30%는 #B91C1C, 30-50%는 #F97316 | High | Pending |
| FR-V09 | **Optimization Keywords 뷰** (S06): 단일 캠페인의 키워드 관리 화면. AI 추천 승인 큐 + 벌크 액션 패턴. **자동화 모드**: Manual 캠페인 = AI 추천 → 오퍼레이터 승인 (S06), Auto Pilot = 완전 자동 (S08/S09 로그). **레이아웃**: (A) Campaign Context Bar + Tabs (Keywords (12) 활성, 탭에 pending count 표시), (B) Keyword Stats Strip — 4-col(Auto/Broad/Phrase/Exact) 각각 카운트 + 주간 delta. 깔때기 X → 플랫 통계. 클릭 시 테이블 필터링, (C) AI Action Queue 테이블 — 상단 필터 탭 [All(12)] [Promote(7)] [Negate(5)] + "Sort by Impact ▾". 컬럼: □ / Action(↑Promote, ✕Negate) / Keyword / Impact(+$rev 또는 -$waste) / Conv or Clicks / ACoS / Source / Period / [Approve]. **Promote 행**: left border 3px solid #18181B, fontWeight 600, Impact +$green. **Negate 행**: left border 3px dashed #9CA3AF, fontWeight 400, Impact -$red. 벌크 바(#18181B): [Approve All] [Skip All] [Move to Neg Group(negate 전용)]. **추천 근거 최소화**: 한 행에 숫자 3개(conv/clicks, ACoS, $impact) + source(from Broad/Auto) + period(7d/14d)만. 문장 설명 없음. 3초 안에 판단 가능. **데이터 소스**: (1) 승격: Search Term Report — conv≥2 + ACoS < target → Exact 승격 추천, (2) 네거티브: clicks≥15 + conv=0 → 네거티브 추천, (3) 신규: Brand Analytics 키워드 + 미등록 → 추가 추천. **빈 상태**: "No keyword actions needed — last analyzed 2 hours ago" | High | Pending |
| FR-V10 | **Optimization Dayparting 뷰** (S07): 캠페인 그룹의 시간대별 비딩 가중치 설정 화면. **레이아웃 (5 Zone)**: (A) Campaign Context Bar + Tabs (Dayparting 활성) + Phase 1 Notice ("시간별 데이터는 일별 패턴 기반 추정값"), (B) Group Selector — 캠페인 그룹 드롭다운 (Brand Defense/Category/Generic/Conquered) + Dayparting ON/OFF 토글 + "(N campaigns)" 영향 범위 표시, (C) **24h × 7d Heatmap Grid (HERO)** — 7행(Mon-Sun) × 24열(00-23), 각 셀 = grayscale intensity(#F3F4F6 OFF → #52525B Peak). 셀 클릭 = ON/OFF 토글(개별 시간 긴급 제어). AI 추천 multiplier 오버레이. **"Active now" indicator**: 현재 시각 셀에 오렌지 테두리. Legend: OFF/Low/Medium/Peak/Now. **Phase 1 데이터**: Orders DB 10년+ 히스토리의 주문 타임스탬프 → 요일×시간별 매출 패턴 분석으로 히트맵 데이터 충분. 제품별/시즈널/요일별 패턴 도출 가능. Phase 2(Marketing Stream)는 광고 귀속 시간별 성과로 정밀도 향상. **인터랙션 설계 (하루에 배울 수 있는 UX)**: 히트맵 셀 = 전등 스위치. 클릭 = ON/OFF 토글(기본). AI Schedule = 원클릭 자동 설정(초보자). 호버 = 툴팁("주문 42건 · $1,280" 한 줄). 더블클릭 = bid multiplier 슬라이더(고급). 드래그 = 범위 선택 벌크 토글(중급). **Progressive Disclosure**: Day 1 = AI 버튼 + 셀 토글, Week 2 = 드래그 범위, Month 2 = bid 미세 조정. 확장 패널 자동 열림 없음 — 의도적 액션에서만. S07a/S07b 완전 삭제, S07 단일 화면으로 통합 확정, (D) AI Schedule Strip (보조, #18181B 다크 바) — "Peak 10-14h (+40%), Off 0-6h (-80%)" + 주간 절약액 + [Apply AI Schedule](orange) / [Adjust](ghost). "See Data" 제거 → 히트맵이 대체. (E) Group Status Table — 그룹명/Schedule/ACoS Impact/Savings/Campaigns 수/ON-OFF. **S05 연결**: S05에서 "예산 조기 소진" alert 시 → S07에 entry banner "저성과 시간대 OFF 권장". **실행 방식**: Ads API bid adjustment cron job (Phase 1: 일 1회, Phase 2: 시간별). **그룹 추상화**: 동일 전략 캠페인들이 같은 스케줄 공유. 하위 캠페인 accordion 확인 가능 | High | Pending |
| FR-V11 | **Auto Pilot Main 뷰** (S08): Auto Pilot 모드 캠페인 전체 현황 모니터링 화면. AI가 Level 5 자율 운영하는 캠페인만 표시 (Manual 분리). **레이아웃 (5 Zone)**: (A) Page Header — "Auto Pilot" 타이틀 + 서브텍스트 + Market Selector (Spigen/US) + [+ New Auto Pilot Campaign] 오렌지 CTA → M01 실행, (B) KPI Strip 4카드 — Active Campaigns(총 수) / Weekly Budget(소진율 %) / AI Actions 7d(건수) / Avg ACoS(vs Manual 비교). 숫자 24px bold, (C) Context Bar — "12 Running · 3 Learning · 3 Paused · 0 Alerts" 상태별 semantic 색상 (#059669/#F97316/#B91C1C/#9CA3AF), #F9FAFB 배경, (D) **Campaigns Table (HERO)** — 헤더 바(타이틀 + 상태 뱃지 3종 + 검색바 200px) + 컬럼(체크박스 / Campaign+서브라인 / Status 뱃지 / Budget/wk / Spend / ACoS / Target ACoS / AI Actions / Confidence 프로그레스바 / Last Action+timestamp / chevron›+케밥⋮). 정렬 아이콘 ↕ 표시. **상태별 UX**: Running=#059669+confidence bar, Learning=#F97316+"Day N of 14 — 학습내용", Paused=#B91C1C+"사유 표시". 행 클릭 → S09 Detail. 케밥 메뉴: Pause/Resume/View Log/Emergency Stop. (E) Table Footer — "Showing N of M campaigns". **네비게이션**: S03 Auto Pilot 뱃지 클릭 → S09 직행. S02 Auto Pilot Activity → S08. **모드 전환 불가**: Clone + Pause 패턴 (원본 Pause + Manual Clone 생성). **S11 = Manual 전용 + Beta 뱃지**: Auto Pilot 추천 이력은 S09에서만 | High | Pending |
| FR-V12 | **Auto Pilot Detail 뷰** (S09): 개별 Auto Pilot 캠페인 상세 + AI 활동 로그 화면. S08에서 행 클릭 또는 S03에서 Auto Pilot 뱃지 클릭으로 진입. **레이아웃 (3 Zone)**: (A) Campaign Header — 캠페인명 18px + 메타라인(모드/브랜드/마켓/타입/Running since + 일수) + "← Back to Auto Pilot" 링크 + Market Selector + **[⏸ Pause] filled red 버튼**(#B91C1C, 긴급 정지) + [⚙ Settings] ghost 버튼(Target ACoS/Weekly Budget 조정), (B) KPI Strip 4카드 — ACoS Target(≤N%, Current vs Target 비교) / Weekly Budget($N, 소진율%) / Confidence(N%, semantic green/orange) / AI Actions 7d(건수, 분포 bid/kw/budget). 숫자 24px bold, (C) **AI Activity Log (HERO)** — 헤더(타이틀 + 탭 필터 All/Bid/Keyword/Budget + [Undo Last 5] batch rollback 버튼) + 8행 로그 테이블. 각 행: **컬러 dot**(Bid=#059669/Negate=#B91C1C/Keyword=#F97316/Budget=#6B7280) + Action Type 뱃지 + 상세 설명 + **이유(reason)** 서브텍스트 + 상대 타임스탬프("2h ago") + **[Undo] 원클릭 롤백 버튼**. **Guardrail Blocked 행**: dashed left border #B91C1C + ⚠ Blocked 뱃지 + "FR-G01 Max bid cap" 사유 + Undo 없음. **롤백**: 개별 Undo(행당) + Batch Undo(Undo Last N) + batch_id 기반 연관 액션 복원. **데이터**: `ads.automation_log` 테이블 전적 의존. FR-D06 "모든 AI 결정에 이유 기록 + 원클릭 롤백" 구현 화면 | High | Pending |
| FR-V13 | **AI Recommendations 뷰** (S11): Manual 캠페인 전용 AI 추천 큐 — **Beta 뱃지** 필수. Auto Pilot 캠페인은 여기 표시 안 됨 (S09에서만). **레이아웃 (4 Zone)**: (A) Page Header — "AI Recommendations" + Beta 뱃지(#F97316 border) + "Manual campaigns only — N pending" + [Approve All (N)] 오렌지 filled + [Skip All] ghost, (B) Impact Summary Bar — "Est. Impact: ACoS -2.1pp · Revenue +$955 · Waste -$39" semantic 색상, #F9FAFB 배경, (C) Filter Row — [All Campaigns ▾] [Brand ▾] [Market ▾], (D) **Category Groups (HERO)** — 🟢 Bid Adjustments(N) / 🔴 Negative Keywords(N) / 🟠 Keyword Promotions(N). 각 그룹: 컬러 dot + 카운트 + [Approve All (N)] ghost. 각 행: 추천 텍스트 + 근거 서브텍스트 + Impact 금액(+$420/wk green, -$95 waste red) + 타임스탬프(2h ago) + [Approve] border 버튼 + Skip 텍스트. **데이터**: `ads.keyword_recommendations WHERE status='pending' AND campaign.mode='manual'` + `ads.report_snapshots` + `ads.keyword_rankings`. Approve 실행 시 Ads API 호출 (`PUT /sp/keywords`, `POST /sp/negativeKeywords`). **Blocker**: Ads API 인가 전까지 Approve 시뮬레이션만 | High | Pending |
| FR-V06 | **Spend Intelligence 뷰** (S12): 매주 부문 전체 광고비 누수 진단 + 트렌드 분석 화면. **레이아웃**: (1) Spend Leak Summary — 이번 주 vs 지난 주, 어떤 캠페인/마켓에서 ACoS 악화됐는지 한눈에, (2) Top Wasters — 돈만 쓰고 전환 없는 캠페인/키워드 TOP 10, (3) Trend Alert — 3주 연속 악화 중인 캠페인 (점진적 누수 감지), (4) AI Diagnosis — 누수 원인 분석 (키워드/비딩/시간대), (5) Quick Fix — 원클릭 조치 (Negate/Bid Down/Pause), (6) Export — Google Sheets / CSV 내보내기 (S10 리포트 역할 흡수). 주간/월간 리뷰용. **S10은 Phase 2로 이동** | High | Pending |
| FR-V14 | **Annual Budget Planning 뷰** (S13): 연간 광고 예산 계획·입력·추적 허브. S03 "Budget Planning" 탭으로 진입. **역할별**: 팀장=입력/수정, Director=조회/드릴다운, 마케터=접근 안 함(S03 잔액 충분). **레이아웃 (5 Zone)**: (A) Page Header — "Annual Budget Planning" + "FY 2026 budget plan by channel" + [↑ Import] ghost + [View Change Log] 텍스트 링크, (A2) Page Tabs — Campaigns \| **Budget Planning**(active, 오렌지 underline), (A3) Market Tabs — US·$600K(active) / CA / DE / JP, (B) KPI Strip 5카드 — Annual Budget($600K) / YTD Spent($147K, 오렌지) / YTD Planned($150K) / Remaining($453K, 그린) / **Auto Pilot incl.($42K, 오렌지)**. YTD 프로그레스 바 오렌지 24.5%, (C) **Monthly Budget Grid (HERO)** — 채널 탭(SP active/SB/SD) + [Save Changes] 오렌지 CTA. 컬럼: Label(80px) + Jan-Dec(flex) + Annual(55px). **3-Row per channel**: SP·Plan'25(#9CA3AF) / SP·Actual'25(#059669) / SP·Plan'26(편집, #18181B 입력셀). **Auto Pilot ⚡ 행**: #FFF7ED 배경 + #FDBA74 상단 보더 + 주간예산×4.33 월간 환산값. **Total 행**: #F9FAFB 배경 + 전 채널+Auto Pilot 합산. **프로세스**: 연초 12개월 일괄 입력 → 대부분 유지 → 가끔 결재 후 수정. **승인 플로우 없음** — 변경 로그만 기록 (누가/언제/어디/얼마→얼마). **Import**: 엑셀 템플릿 다운로드 + CSV/XLSX 업로드 (전년 Actual Spend 등), (D) Plan vs Actual 바 차트 (6개월, Plan=#E5E7EB/Actual=#059669, 현재월=#F97316), (E) Channel Breakdown YTD — SP/SB/SD 각 프로그레스 바 + on track/over 상태. **데이터**: `ads.budgets`(입력) + `ads.budget_change_log`(변경이력) + `ads.report_snapshots`(실집행) + `ads.campaigns`(Auto Pilot 합산). Phase 1 완전 독립 동작 — Ads API 불필요 | High | Pending |
| FR-V04 | **읽기 전용 뷰** (viewer_plus/viewer): 리포트 조회만 가능. 편집/자동화 설정 접근 불가 | Medium | Pending |
| FR-V05 | 역할 기반 자동 뷰 전환 — 로그인 시 역할(owner/admin/editor/viewer)에 따라 기본 대시보드 자동 선택. 수동 전환 가능 | Medium | Pending |

**모달 뷰 상세 스펙**

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-M01 | **Campaign Create 모달** (M01a-d, 4-Step): S03/S08에서 [+ New Campaign] CTA로 실행. **Step 1 (M01a) Team & Name**: Team 자동 배정(org_unit 기반) + Brand 드롭다운 + Marketplace 드롭다운 + Product/Series 선택 → **6자리 마케팅 코드 자동 생성** (Platform 2자리 + Channel 2자리 + Unit 2자리). Campaign Name Preview: `111112 (Search Term) iPhone 16 Pro Max [Kelly] - 260330`. Override manually 가능하되 코드 형식 검증. **Step 2 (M01b) Choose Mode**: Auto Pilot("AI handles everything", 주간예산만) vs Manual("I'll manage manually", 전체 설정). ⚠ Permanent 경고 필수. Auto Pilot → Step 3a(주간예산) → Step 4a(Review). Manual → Step 3b(Type & Targeting, M01c) → Step 4b(Products/Budget/Keywords) → Step 5b(Review, M01d). **데이터**: `INSERT ads.campaigns` (marketing_code, mode, brand, market, target_acos, weekly_budget, created_by) + Ads API `POST /sp/campaigns` + `POST /sp/adGroups` + `POST /sp/keywords` | High | Pending |
| FR-M02 | **Campaign Detail Panel** (M02): S03 테이블에서 Manual 캠페인 클릭 시 우측 슬라이드 패널(480px). **탭 4개**: Overview(KPI 5카드 + Budget Pacing + AI Recommendations 미리보기 + Ad Groups 목록) / Ad Groups / AI Activity / Settings. **6자리 코드 표시**: 캠페인명 아래 marketing_code 뱃지. **Duplicate 버튼**: Clone+Pause 시나리오 — 모드 전환용. **Edit Campaign**: 타겟/예산 인라인 편집. **데이터**: `ads.campaigns JOIN ads.report_snapshots` + `ads.keyword_recommendations LIMIT 2` + `ads.ad_groups`. Ads API: `GET /sp/campaigns/{id}` | High | Pending |
| FR-M03 | **Rule Create 모달** (M03): S04 "+ Add Rule"에서 실행. Manual 캠페인 전용 자동화 규칙 생성. **템플릿 5종**: High ACoS Pause / Winner Promote / Low CTR Negate / Budget Guard / Custom. **자연어 빌더**: "If [ACoS] is above [40%] for at least [7 days], then [pause the keyword] immediately." 드롭다운 + 입력 조합. **When & Where**: 적용 범위(All campaigns / 선택), 실행 주기(Run daily), Look-back(7 days). **Simulate 버튼**: "About 37 keywords across 12 campaigns would be affected" + [See details] 링크. **Save Draft / Create Rule** 액션. **데이터**: `INSERT ads.rules` (template, condition_json, action, scope, look_back_days, is_active). Simulate: `SELECT COUNT(*) FROM ads.report_snapshots WHERE condition` | High | Pending |
| FR-M04 | **Alert Detail 모달** (M04): S03/S05에서 예산 알림 클릭 시 팝업(480px). **구성**: Alert type dot(Budget=오렌지, Spend=빨강) + 캠페인명 + "Will run out of budget by ~4:00 PM EST". Hero 숫자($450 / $500 daily) + Critical 프로그레스 바 + 3 KPI(Run Rate, Orders Today, ACoS). **Spend Today (24h)** 라인 차트 + "Spend accelerating since 8 AM" 인사이트. **Quick Actions**: [Raise Daily Budget to $600] RECOMMENDED + [Reduce Bids 20%] + [Pause Until Tomorrow]. **데이터**: `ads.alerts` + `ads.report_snapshots` (24h hourly spend). Quick Actions: Ads API `PUT /sp/campaigns/{id}` (budget) 또는 `PUT /sp/keywords` (bid) | High | Pending |
| FR-M05 | **Underspend Analysis 모달** (M05): S05 "Analyze →" 클릭 시 팝업(520px). **구성**: Underspend dot + 캠페인명 + "$180 of $500 — 36% utilization, 6h remaining". Hero 숫자 + 프로그레스 바 + "Underspending — 36% spent, expected 84% by now". **Root Causes** (AI 분석): 원인별 카드 — contribution %(원인1: Low bids 62%, 원인2: Negatives blocking 25%, 원인3: Seasonal dip 13%). 각 카드에 설명 + 예상 효과($120/day) + CTA([Raise Bids], [Review Negatives]). **[Apply All N Fixes (+$180/day est.)]** 오렌지 전폭 CTA. **데이터**: `ads.spend_diagnostics` (AI 원인 분석 결과) + `ads.report_snapshots`. Apply: Ads API `PUT /sp/keywords` (bid 올리기) + `DELETE /sp/negativeKeywords` (해제) | High | Pending |

> **핵심 지표**: 사장/부문장은 **TACoS** (광고비/전체매출), 마케터는 **ACoS** (광고비/광고매출)
> TACoS가 내려가면 광고 효율 개선 중, 올라가면 광고 의존도 증가 → 문제 신호

**안전장치 (Guardrails)**

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-G01 | Hard bid cap (절대 최대 입찰가, 기본 $10) | Critical | Pending |
| FR-G02 | 일일 변경폭 제한 (±30%) | Critical | Pending |
| FR-G03 | 데이터 성숙도 체크 (72시간 미만 데이터 의사결정 제외) | Critical | Pending |
| FR-G04 | Change log + 롤백 (모든 변경 이력, batch 단위 복원) | Critical | Pending |
| FR-G05 | Dry run 모드 (규칙 적용 전 영향도 미리보기) | Critical | Pending |
| FR-G06 | Manual override lock (수동 변경 후 7일 자동화 제외) | Critical | Pending |
| FR-G07 | Budget ceiling (원래 예산의 3배 초과 불가) | Critical | Pending |
| FR-G08 | 최소 데이터 임계치 (20+ 클릭 전 자동화 비활성) | Critical | Pending |
| FR-G09 | 재고 소진 감지 (재고 7일분 이하 시 비딩 축소) | Critical | Pending |
| FR-G10 | API error handling + retry (exponential backoff + circuit breaker) | Critical | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Performance | 대시보드 로딩 < 2초 (1000+ 캠페인) | Lighthouse, 실측 |
| Performance | 캠페인 테이블 virtual scrolling (1000+ rows without lag) | 실측 |
| Security | API 키/시크릿 환경변수 전용, 코드 내 하드코딩 금지 | 코드 리뷰 |
| Security | org_unit 기반 RLS (Row Level Security) | Supabase RLS 정책 |
| Reliability | 자동화 크론잡 99%+ uptime | 모니터링 |
| Reliability | API 장애 시 안전 모드 (변경 없이 현상 유지) | 자동 전환 |
| Accessibility | 한국어 + 영어 UI 지원 | i18n |
| Data | Amazon 데이터 12-72시간 지연 감안한 의사결정 | 데이터 성숙도 태깅 |

### 3.3 API Integration Reference

| API | Endpoint | Auth | Rate Limit | 데이터 주기 | 용도 |
|-----|----------|------|-----------|-----------|------|
| **Brand Analytics** | SP-API Reports `GET_BRAND_ANALYTICS_SEARCH_TERMS_REPORT` | SP-API OAuth (refresh_token) | 1 req/min | 주간 (일~토) | FR-B05/B05a: 키워드 랭킹, 시즈널리티, AI 트렌드 분석 |
| **Amazon Ads API v1** | `/campaigns`, `/keywords`, `/ad-groups`, `/reports` | LWA OAuth (client_id + client_secret + refresh_token) | ~10-50 req/sec (추정) | 1-2시간 딜레이 | FR-C01~C03: 캠페인/비딩/예산 CRUD |
| **Marketing Stream** | AWS SQS Push (not REST) | Ads API 계정 + AWS SQS 큐 설정 | 이벤트 기반 (시간별 배치) | 1-2시간 딜레이 | FR-B02: 데이파팅 트렌드 분석 |
| **SP-API Orders** | `/orders/v0/orders` | SP-API OAuth | **1 req/min** (매우 제한적) | 15-30분 딜레이 | TACoS 계산, 매출 추적. 현재 sq-webd-datahub에서 일별 수집 중 |
| **SP-API Catalog** | `/catalog/2022-04-01/items/{asin}` | SP-API OAuth | ~5-10 req/sec | 실시간 | 상품 정보 (Retail Readiness 직접 제공 안함 → 복합 점수 계산) |
| **SP-API Notifications** | `/notifications/v1/subscriptions` | SP-API OAuth + Webhook/SQS | 이벤트 기반 Push | 실시간 | FR-G02: Buy Box 상실 → 캠페인 자동 정지, 재고 변동 알림 |

**API 연결 테스트 결과 (2026-03-29):**
- [x] SP-API US: ✅ 토큰 발급 + 연결 성공
- [x] SP-API EU: ✅ 토큰 발급 + 연결 성공
- [x] SP-API UK: ✅ 토큰 발급 + 연결 성공
- [ ] Ads API: ❌ `401 UNAUTHORIZED` — Advertising API scope 인가 필요 (아마존 협업 진행 중)
- [x] Brand Registry: Spigen ✅ / Legato ✅ / Cyrill ✅ (3개 브랜드 전부 등록 확인)
- [ ] AWS SQS 큐 설정 (Marketing Stream 수신용 — Phase 2)

**환경변수 (확정 — .env.local):**
```
# SP-API + Ads API 공용 (하나의 LWA 앱)
AMAZON_APP_ID=amzn1.sp.solution.xxxxx     # SP-API 앱 ID
AMAZON_CLIENT_ID=amzn1.application-oa2-client.xxxxx  # LWA client (SP-API + Ads 공용)
AMAZON_CLIENT_SECRET=amzn1.oa2-cs.v1.xxxxx           # LWA secret

# Refresh Tokens (per marketplace — SP-API용, Ads API용은 별도 인가 후 추가)
AMAZON_SP_API_REFRESH_TOKEN_US=Atzr|xxxxx
AMAZON_SP_API_REFRESH_TOKEN_EU=Atzr|xxxxx
AMAZON_SP_API_REFRESH_TOKEN_UK=Atzr|xxxxx
# TODO: Ads API 인가 완료 후 추가
# AMAZON_ADS_REFRESH_TOKEN_US=Atzr|xxxxx
# AMAZON_ADS_PROFILE_ID_US=123456789

# Marketing Stream (Phase 2)
# AWS_SQS_MARKETING_STREAM_URL=arn:aws:sqs:xxxxx
```

**화면별 API 상세 스펙 (S01–S07):**

#### S01 — CEO 대시보드
| # | 데이터 포인트 | API/소스 | 엔드포인트 | 환경변수 | Cache Table | Refresh |
|---|-------------|---------|----------|---------|-------------|---------|
| 1 | 광고 Spend (브랜드×마켓별) | Ads Reporting | `POST /reporting/reports` (spCampaigns) | `AMAZON_ADS_REFRESH_TOKEN_*` (인가 후) | `ads.report_snapshots` | 일 1회 |
| 2 | 광고 Revenue (Attributed Sales) | Ads Reporting | 위와 동일 (sales14d 컬럼) | 〃 | `ads.report_snapshots` | 일 1회 |
| 3 | 전체 매출 (TACoS 분모) | Orders DB | `SELECT SUM(order_total) FROM orders` | 내부 DB | `ads.orders_daily_cache` | 일 1회 |
| 4 | ROAS 30일 트렌드 | `ads.report_snapshots` 집계 | 내부 쿼리 | — | 〃 | 일 1회 |
| 5 | Buy Box 이상 알림 | SP-API Notifications | `GET /notifications/v1/subscriptions` + Push | `AMAZON_SP_API_REFRESH_TOKEN_*` | `ads.notifications_log` | 실시간 |
- **Blocker**: Ads API scope 인가 대기. TACoS는 Orders DB만으로 분모 계산 가능

#### S02 — Director 대시보드
| # | 데이터 포인트 | API/소스 | 엔드포인트 | 환경변수 | Cache Table | Refresh |
|---|-------------|---------|----------|---------|-------------|---------|
| 1 | 팀별 월간 계획 예산 | 내부 DB | `ads.budgets WHERE month=? AND org_unit_id=?` | — | `ads.budgets` | 수동 입력 (S13) |
| 2 | 팀별 실제 Spend (MTD) | Ads Reporting 캐시 | `ads.report_snapshots GROUP BY marketing_code` | — | `ads.report_snapshots` | 일 1회 |
| 3 | Auto Pilot Impact | 내부 DB | `ads.automation_log` 집계 | — | `ads.automation_log` | 실시간 |
| 4 | Pending Actions | 내부 DB | `ads.keyword_recommendations WHERE status='pending'` | — | 〃 | 15분 |
- **Blocker**: `ads.budgets` 수동 입력은 Ads API 없이 동작. Actual Spend는 인가 후

#### S03 — Marketer 대시보드
| # | 데이터 포인트 | API/소스 | 엔드포인트 | 환경변수 | Cache Table | Refresh |
|---|-------------|---------|----------|---------|-------------|---------|
| 1 | 내 캠페인 목록 | Ads API | `GET /sp/campaigns?stateFilter=enabled` | `AMAZON_ADS_REFRESH_TOKEN_*` | `ads.campaigns` | 1시간 sync |
| 2 | 캠페인별 KPI | Ads Reporting 캐시 | `ads.report_snapshots WHERE campaign_id IN (...)` | — | `ads.report_snapshots` | 일 1회 |
| 3 | AI 추천 큐 | 내부 DB | `ads.keyword_recommendations LIMIT 4` | — | 〃 | 15분 |
| 4 | 예산 잔액 | Ads API 캐시 | `ads.campaigns.daily_budget - report_snapshots.today_spend` | — | 〃 | 1시간 |
- **Blocker**: Ads API scope 인가

#### S04 — Optimization Bidding
| # | 데이터 포인트 | API/소스 | 엔드포인트 | 환경변수 | Cache Table | Refresh |
|---|-------------|---------|----------|---------|-------------|---------|
| 1 | 키워드 목록 + 현재 bid | Ads API | `GET /sp/keywords?campaignIdFilter={id}` | `AMAZON_ADS_REFRESH_TOKEN_*` | `ads.keywords` | 1시간 |
| 2 | 키워드별 성과 (14일) | Ads Reporting | `POST /reporting/reports` (spKeywords) | 〃 | `ads.report_snapshots` | 일 1회 |
| 3 | AI 추천 bid | 내부 AI 배치 | `ads.keyword_recommendations WHERE type='bid_adjust'` | — | 〃 | 일 1회 |
| 4 | Brand Analytics 트렌드 | SP-API | `POST /reports` (GET_BRAND_ANALYTICS_SEARCH_TERMS_REPORT) | `AMAZON_SP_API_REFRESH_TOKEN_*` | `ads.keyword_rankings` | 주 1회 |
| 5 | **Bid 변경 실행** | Ads API | `PUT /sp/keywords` (batch) | `AMAZON_ADS_REFRESH_TOKEN_*` | `ads.change_log` | 온디맨드 |
- **Guardrails**: bid ≤ max_bid_cap (FR-G01), 변경폭 ≤ ±30% (FR-G02)
- **Blocker**: Ads API scope

#### S05 — Optimization Budget
| # | 데이터 포인트 | API/소스 | 엔드포인트 | 환경변수 | Cache Table | Refresh |
|---|-------------|---------|----------|---------|-------------|---------|
| 1 | Daily Budget | Ads API | `GET /sp/campaigns/{id}` | `AMAZON_ADS_REFRESH_TOKEN_*` | `ads.campaigns` | 1시간 |
| 2 | 오늘 누적 Spend | Ads Reporting | `ads.report_snapshots WHERE date=today` | — | 〃 | 1-2시간 딜레이 |
| 3 | 시간별 예측 (Predicted bar) | Orders DB | 과거 시간대 패턴 → `ads.dayparting_hourly_weights` | 내부 DB | 〃 | 주 1회 |
| 4 | **Budget 변경 실행** | Ads API | `PUT /sp/campaigns` (budget 필드) | `AMAZON_ADS_REFRESH_TOKEN_*` | `ads.change_log` | 온디맨드 |
| 5 | Underspend Watch | 내부 계산 | `utilization < 70%` 캠페인 필터 | — | `ads.report_snapshots` | 1-2시간 |
- **Phase 1 제약**: 시간별 Spend breakdown 불가 (일별 총계만). Phase 2(Marketing Stream)에서 시간별 실적 제공
- **Blocker**: Ads API scope

#### S06 — Optimization Keywords
| # | 데이터 포인트 | API/소스 | 엔드포인트 | 환경변수 | Cache Table | Refresh |
|---|-------------|---------|----------|---------|-------------|---------|
| 1 | Search Term Report | Ads Reporting | `POST /reporting/reports` (spSearchTerm, 14일) | `AMAZON_ADS_REFRESH_TOKEN_*` | `ads.search_term_reports` | 일 1회 |
| 2 | 승격 후보 (conv≥2, ACoS<target) | 내부 배치 | `ads.search_term_reports` 분석 → `ads.keyword_recommendations` | — | 〃 | 일 1회 |
| 3 | 네거티브 후보 (clicks≥15, conv=0) | 내부 배치 | 〃 | — | 〃 | 일 1회 |
| 4 | Brand Analytics 신규 키워드 | SP-API | `ads.keyword_rankings WHERE keyword NOT IN ads.keywords` | `AMAZON_SP_API_REFRESH_TOKEN_*` | `ads.keyword_rankings` | 주 1회 |
| 5 | **승격 실행** (Promote) | Ads API | `POST /sp/keywords` (새 Exact 키워드 생성) | `AMAZON_ADS_REFRESH_TOKEN_*` | `ads.change_log` | 온디맨드 |
| 6 | **네거티브 실행** | Ads API | `POST /sp/negativeKeywords` | 〃 | 〃 | 온디맨드 |
| 7 | **캠페인 매핑** (승격 대상) | 내부 DB | `ads.campaigns WHERE marketing_code=? AND name NOT LIKE '%(Search Term)%'` | — | `ads.campaigns` | — |
- **Blocker**: Ads API scope (Search Term Report + keyword CRUD)

#### S07 — Optimization Dayparting
| # | 데이터 포인트 | API/소스 | 엔드포인트 | 환경변수 | Cache Table | Refresh |
|---|-------------|---------|----------|---------|-------------|---------|
| 1 | 요일×시간별 주문 패턴 (히트맵) | **Orders DB** (10년+) | `SELECT DOW, HOUR, COUNT(*), SUM(total) FROM orders WHERE asin IN (...) GROUP BY 1,2` | 내부 DB | `ads.dayparting_hourly_weights` | 주 1회 |
| 2 | 캠페인 그룹 스케줄 | 내부 DB | `ads.dayparting_schedules WHERE org_unit_id=?` | — | 〃 | 수동 설정 |
| 3 | AI 추천 스케줄 | 내부 AI | `ads.dayparting_hourly_weights` → AI → `ads.dayparting_recommendations` | — | 〃 | 주 1회 |
| 4 | **Bid 스케줄 적용** | Ads API | `PUT /sp/campaigns` (bid adjustments) | `AMAZON_ADS_REFRESH_TOKEN_*` | `ads.change_log` | 크론 (P1: 일 1회, P2: 시간별) |
| 5 | Phase 2: 광고 귀속 시간별 | Marketing Stream | AWS SQS Push → `ads.marketing_stream_hourly` | `AWS_SQS_MARKETING_STREAM_URL` | 〃 | 1-2시간 |
- **Phase 1**: Orders DB 패턴으로 히트맵 즉시 가능. bid 적용은 Ads API 인가 후
- **Phase 2**: Marketing Stream으로 광고 귀속 정밀도 향상

#### S08 — Auto Pilot Main
| # | 데이터 포인트 | API/소스 | 엔드포인트 | 환경변수 | Cache Table | Refresh |
|---|-------------|---------|----------|---------|-------------|---------|
| 1 | Auto Pilot 캠페인 목록 | 내부 DB | `ads.campaigns WHERE mode='autopilot'` | — | `ads.campaigns` | 1시간 (cron sync) |
| 2 | 캠페인 상태 (Running/Learning/Paused) | 내부 DB | `ads.campaigns.status` + `ads.campaigns.learning_day` | — | `ads.campaigns` | 실시간 |
| 3 | 주간 예산 | 내부 DB | `ads.campaigns.weekly_budget` | — | `ads.campaigns` | 수동 설정 |
| 4 | Spend / ACoS | Ads Reporting 캐시 | `ads.report_snapshots WHERE campaign_id IN (AP list)` | — | `ads.report_snapshots` | 일 1회 |
| 5 | Target ACoS | 내부 DB | `ads.campaigns.target_acos` | — | `ads.campaigns` | 수동 설정 |
| 6 | AI Actions 횟수/분포 | 내부 DB | `ads.automation_log GROUP BY action_type WHERE campaign_id IN (AP list)` | — | `ads.automation_log` | 실시간 |
| 7 | Confidence Score | 내부 AI | `ads.campaigns.confidence_score` (AI 엔진이 주기적 갱신) | — | `ads.campaigns` | 1시간 |
| 8 | Last Action | 내부 DB | `ads.automation_log ORDER BY executed_at DESC LIMIT 1 PER campaign` | — | `ads.automation_log` | 실시간 |
- **핵심**: S08은 대부분 내부 DB 의존. Ads API 직접 호출 없음 (cron이 sync 담당)
- **Blocker**: Ads API 인가 전까지 캠페인 sync 불가 → 데모 데이터로 개발 가능
- **Cache**: `ads.cache_autopilot_summary` (5분) — KPI 4카드 집계 캐시

#### S09 — Auto Pilot Detail
| # | 데이터 포인트 | API/소스 | 엔드포인트 | 환경변수 | Cache Table | Refresh |
|---|-------------|---------|----------|---------|-------------|---------|
| 1 | 캠페인 기본 정보 | 내부 DB | `ads.campaigns WHERE id=?` | — | `ads.campaigns` | 1시간 sync |
| 2 | Target ACoS / Weekly Budget | 내부 DB | `ads.campaigns.target_acos, weekly_budget` | — | `ads.campaigns` | 수동 설정 |
| 3 | Confidence Score | 내부 AI | `ads.campaigns.confidence_score` | — | `ads.campaigns` | 1시간 |
| 4 | AI Activity Log (HERO) | 내부 DB | `ads.automation_log WHERE campaign_id=? ORDER BY executed_at DESC` | — | `ads.automation_log` | 실시간 |
| 5 | 현재 Spend / ACoS | Ads Reporting 캐시 | `ads.report_snapshots WHERE campaign_id=?` | — | `ads.report_snapshots` | 일 1회 |
| 6 | 롤백 실행 | 내부 DB | `UPDATE ads.automation_log SET is_rolled_back=true WHERE batch_id=?` + Ads API 역조작 | `AMAZON_ADS_REFRESH_TOKEN_*` | `ads.automation_log` | 즉시 |
| 7 | Guardrail 발동 이력 | 내부 DB | `ads.automation_log WHERE guardrail_blocked=true AND campaign_id=?` | — | `ads.automation_log` | 실시간 |
- **핵심**: S08과 동일하게 내부 DB 의존. 롤백 실행 시에만 Ads API 호출 (역조작)
- **Blocker**: Ads API 인가 전까지 롤백 시뮬레이션만 가능

#### S12 — Spend Intelligence
| # | 데이터 포인트 | API/소스 | 엔드포인트 | 환경변수 | Cache Table | Refresh |
|---|-------------|---------|----------|---------|-------------|---------|
| 1 | 주간 Spend 비교 (WoW) | Ads Reporting 캐시 | `ads.report_snapshots` SUM GROUP BY week | — | `ads.report_snapshots` | 일 1회 |
| 2 | 마켓/브랜드별 Spend 분포 | Ads Reporting 캐시 | `ads.report_snapshots GROUP BY market, brand` | — | `ads.report_snapshots` | 일 1회 |
| 3 | Top Wasters (전환 없는 키워드) | Ads Reporting 캐시 | `ads.report_snapshots WHERE orders=0 AND spend>$50 ORDER BY spend DESC` | — | `ads.report_snapshots` | 일 1회 |
| 4 | Trend Alerts (3주 연속 악화) | 내부 분석 | `ads.report_snapshots` 주간 롤링 윈도우 비교 | — | `ads.spend_trends` | 주 1회 |
| 5 | AI Diagnosis | 내부 AI | `ads.spend_diagnostics` (AI 엔진이 주간 분석 후 저장) | — | `ads.spend_diagnostics` | 주 1회 |
| 6 | Quick Fix 실행 (Negate/Bid Down) | Ads API | `POST /sp/negativeKeywords`, `PUT /sp/keywords` | `AMAZON_ADS_REFRESH_TOKEN_*` | `ads.change_log` | 즉시 |
| 7 | Export | 내부 | CSV 생성 + Google Sheets API (optional) | `GOOGLE_SHEETS_API_KEY` (Phase 2) | — | 온디맨드 |
- **핵심**: `ads.report_snapshots` 일일 캐시 기반 집계. 실시간이 아닌 일별 데이터로 주간 비교.
- **Blocker**: Ads API 인가 전까지 Top Wasters 데이터 없음 → 데모 데이터로 개발
- **Phase 2**: Google Sheets 연동, Marketing Stream 기반 시간별 누수 분석

#### S13 — Annual Budget Planning
| # | 데이터 포인트 | API/소스 | 엔드포인트 | 환경변수 | Cache Table | Refresh |
|---|-------------|---------|----------|---------|-------------|---------|
| 1 | 올해 월별 예산 계획 (입력) | 내부 DB | `INSERT/UPDATE ads.budgets WHERE year=? AND org_unit_id=? AND market=? AND channel=?` | — | `ads.budgets` | 수동 입력 |
| 2 | 전년 예산 계획 | 내부 DB | `SELECT * FROM ads.budgets WHERE year=YEAR-1` | — | `ads.budgets` | 읽기 전용 |
| 3 | 전년 실집행 Spend | 엑셀 import / Ads Reporting 캐시 | `ads.report_snapshots WHERE date BETWEEN ... GROUP BY month, channel` | — | `ads.report_snapshots` | Phase 1: import, Phase 2: 일 1회 |
| 4 | 올해 실집행 Spend (MTD) | Ads Reporting 캐시 | 위와 동일 (올해 필터) | `AMAZON_ADS_REFRESH_TOKEN_*` | `ads.report_snapshots` | Phase 2: 일 1회 |
| 5 | Auto Pilot 예산 합산 | 내부 DB | `SELECT SUM(weekly_budget * 4.33) FROM ads.campaigns WHERE mode='autopilot' AND market=?` | — | `ads.campaigns` | 실시간 |
| 6 | 변경 로그 | 내부 DB | `INSERT ads.budget_change_log (user_id, field, old_value, new_value, changed_at)` | — | `ads.budget_change_log` | 이벤트 |
| 7 | 팀별 집계 (Director 뷰) | 내부 DB | `SELECT org_unit_id, SUM(amount) FROM ads.budgets GROUP BY org_unit_id` | — | `ads.budgets` | 실시간 |
- **핵심**: Phase 1 완전 독립 동작. Ads API 없이 예산 입력/수정/조회 + 엑셀 import로 전년 Actual 확보
- **Blocker**: 없음. 내부 DB 전용
- **새 테이블**: `ads.budgets` (year, month, org_unit_id, market, channel, amount, created_by, updated_at), `ads.budget_change_log` (budget_id, user_id, field, old_value, new_value, changed_at)

**화면별 API 상세 스펙 (M01–M05):**

#### M01 — Campaign Create
| # | 데이터 포인트 | API/소스 | 엔드포인트 | 환경변수 | Cache Table | Refresh |
|---|-------------|---------|----------|---------|-------------|---------|
| 1 | 팀/담당자 자동 배정 | 내부 DB | `public.org_units WHERE user_id=?` | — | `public.org_units` | 실시간 |
| 2 | 마케팅 코드 생성 | 내부 DB | `ads.marketing_code_sequences NEXTVAL` (Platform+Channel+Unit 조합) | — | `ads.campaigns` | 생성 시 |
| 3 | 캠페인 생성 | Ads API | `POST /sp/campaigns` + `POST /sp/adGroups` | `AMAZON_ADS_REFRESH_TOKEN_*` | `ads.campaigns` | 온디맨드 |
| 4 | 키워드 등록 (Manual) | Ads API | `POST /sp/keywords` + `POST /sp/negativeKeywords` | 〃 | `ads.keywords` | 온디맨드 |
| 5 | 내부 캠페인 저장 | 내부 DB | `INSERT ads.campaigns (marketing_code, mode, brand, market, target_acos, weekly_budget, created_by)` | — | `ads.campaigns` | 생성 시 |
- **Blocker**: Ads API 인가 전까지 내부 DB 저장만 가능. 실제 Amazon 캠페인 생성은 인가 후

#### M02 — Campaign Detail Panel
| # | 데이터 포인트 | API/소스 | 엔드포인트 | 환경변수 | Cache Table | Refresh |
|---|-------------|---------|----------|---------|-------------|---------|
| 1 | 캠페인 상세 | Ads API 캐시 | `ads.campaigns WHERE id=?` + `ads.report_snapshots` | — | `ads.campaigns` | 1시간 |
| 2 | AI 추천 미리보기 | 내부 DB | `ads.keyword_recommendations WHERE campaign_id=? AND status='pending' LIMIT 2` | — | 〃 | 15분 |
| 3 | Ad Groups 목록 | Ads API 캐시 | `ads.ad_groups WHERE campaign_id=?` | — | `ads.ad_groups` | 1시간 |
| 4 | Clone (Duplicate) | Ads API | `POST /sp/campaigns` (복제) + `PUT /sp/campaigns/{id}` (원본 Pause) | `AMAZON_ADS_REFRESH_TOKEN_*` | `ads.campaigns` | 온디맨드 |

#### M03 — Rule Create
| # | 데이터 포인트 | API/소스 | 엔드포인트 | 환경변수 | Cache Table | Refresh |
|---|-------------|---------|----------|---------|-------------|---------|
| 1 | 규칙 저장 | 내부 DB | `INSERT ads.rules (template, condition_json, action, scope, look_back_days, is_active)` | — | `ads.rules` | 생성 시 |
| 2 | Simulate | 내부 DB | `SELECT COUNT(*) FROM ads.report_snapshots WHERE {condition}` | — | `ads.report_snapshots` | 온디맨드 |
| 3 | 규칙 실행 (크론) | Ads API | 조건 매칭 → `PUT /sp/keywords` (bid 변경) 또는 `POST /sp/negativeKeywords` | `AMAZON_ADS_REFRESH_TOKEN_*` | `ads.change_log` | 매일 |
- **Phase 1**: 규칙 생성 + Simulate는 Ads API 없이 동작. 실행만 인가 후

#### M04 — Alert Detail
| # | 데이터 포인트 | API/소스 | 엔드포인트 | 환경변수 | Cache Table | Refresh |
|---|-------------|---------|----------|---------|-------------|---------|
| 1 | 알림 상세 | 내부 DB | `ads.alerts WHERE id=?` | — | `ads.alerts` | 실시간 |
| 2 | 24h Spend Curve | Ads Reporting 캐시 | `ads.report_snapshots WHERE campaign_id=? AND date=TODAY` (시간별 집계) | — | `ads.report_snapshots` | 1시간 |
| 3 | Quick Action: Budget 변경 | Ads API | `PUT /sp/campaigns/{id}` (dailyBudget 필드) | `AMAZON_ADS_REFRESH_TOKEN_*` | `ads.change_log` | 즉시 |
| 4 | Quick Action: Bid 변경 | Ads API | `PUT /sp/keywords` (bid 필드) | 〃 | `ads.change_log` | 즉시 |

#### M05 — Underspend Analysis
| # | 데이터 포인트 | API/소스 | 엔드포인트 | 환경변수 | Cache Table | Refresh |
|---|-------------|---------|----------|---------|-------------|---------|
| 1 | 원인 분석 | 내부 AI | `ads.spend_diagnostics WHERE campaign_id=?` (AI 엔진 분석 결과) | — | `ads.spend_diagnostics` | 주 1회 |
| 2 | 소진 현황 | Ads Reporting 캐시 | `ads.report_snapshots WHERE campaign_id=? AND date=TODAY` | — | `ads.report_snapshots` | 1시간 |
| 3 | Apply Fix: Bid 올리기 | Ads API | `PUT /sp/keywords` (bid 일괄 인상) | `AMAZON_ADS_REFRESH_TOKEN_*` | `ads.change_log` | 즉시 |
| 4 | Apply Fix: Negative 해제 | Ads API | `DELETE /sp/negativeKeywords/{id}` | 〃 | `ads.change_log` | 즉시 |
- **핵심**: AI 원인 분석은 내부 DB 전용. Fix 실행만 Ads API 필요

**공통 배치 크론 (Vercel Cron Jobs):**
```
/api/ads/cron/sync-campaigns    → ads.campaigns (1시간)
/api/ads/cron/sync-reports      → ads.report_snapshots (새벽 2시)
/api/ads/cron/brand-analytics   → ads.keyword_rankings (월요일)
/api/ads/cron/keyword-analysis  → ads.keyword_recommendations (매일)
/api/ads/cron/dayparting-apply  → bid multiplier 적용 (매 시간)
/api/ads/cron/orders-pattern    → ads.dayparting_hourly_weights (주 1회)
```

**Ads API 토큰 교환 (공통):**
```
POST https://api.amazon.com/auth/o2/token
grant_type=refresh_token
&refresh_token={AMAZON_ADS_REFRESH_TOKEN_*}
&client_id={AMAZON_CLIENT_ID}
&client_secret={AMAZON_CLIENT_SECRET}
→ access_token (3600초) → ads.api_tokens 캐시
```

**나머지 화면 API 매핑 (간략):**

| 화면 | 필요 API | Phase |
|------|---------|-------|
| S08-S09 Auto Pilot | Ads API 전체 CRUD (캠페인/키워드/비딩/예산 자율 운영) | 1 |
| S10 Reports | Ads Reporting + SP-API Orders | **Phase 2** (S12에 Export 흡수) |
| S11 AI Recommendations | SP-API Brand Analytics + Ads Reporting | 1 |
| S12 Spend Intelligence | Ads Reporting + SP-API Orders + 내부 AI 분석 (누수 진단 + 트렌드 + Quick Fix + Export) | 1 |
| S13 Annual Budget Planning | 내부 `ads.budgets` + `ads.budget_change_log` + 엑셀 import | 1 (Ads API 불필요) |
| M01 Campaign Create | Ads API `/campaigns` + `/ad-groups` + `/keywords` | 1 |
| M05 Underspend | Ads Reporting + 내부 분석 | 1 |

**Phase 1 vs Phase 2 API 전략:**
- **Phase 1**: Ads API v1 (캠페인 CRUD) + Ads Reporting (성과) + SP-API Orders DB (기존 일별 수집) + SP-API Notifications (Buy Box) + SP-API Brand Analytics (주간)
- **Phase 2**: Marketing Stream (AWS SQS → 시간별 데이터) + Catalog 기반 Retail Readiness 복합 점수

**API 제약 사항 & 대응:**
| 제약 | 영향 | 대응 |
|------|------|------|
| Ads API scope 미인가 | 캠페인 CRUD 불가 | 아마존 협업 진행 중 — Advertising API scope 인가 요청 |
| Brand Analytics = Brand Registry 필수 | 3개 브랜드 전부 등록 확인 ✅ | 문제 없음 |
| Marketing Stream 1-2시간 딜레이 | 실시간 데이파팅 불가 | Phase 1은 Ads Reporting(일/주)으로 시작, Phase 2에서 Stream 추가 |
| Orders API 1 req/min | 12+ 계정 실시간 폴링 불가 | 현재 sq-webd-datahub 일별 수집 패턴 유지 |
| Retail Readiness Score API 없음 | 직접 계산 필요 | Reviews + Images + 재고 + Buy Box 복합 점수 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 3개 카테고리 (A, B, D) 모든 FR 구현 완료
- [ ] 10개 필수 안전장치 (FR-G01~G10) 구현 및 테스트
- [ ] `ads` 스키마 RLS 정책 적용
- [ ] Amazon Ads API v3 OAuth 연동 완료
- [ ] Marketing Stream (AWS SQS → Supabase) 파이프라인 동작
- [ ] 코드 리뷰 완료 (PM 승인)
- [ ] `pnpm typecheck && pnpm lint && pnpm build` 통과

### 4.2 Quality Criteria

- [ ] Zero lint errors
- [ ] Build succeeds
- [ ] 모듈 격리 규칙 준수 (IP 모듈 참조 0건)
- [ ] `console.log` 0건, `any` 타입 0건
- [ ] 모든 자동화 액션에 reason 필드 + 롤백 가능

### 4.3 Measurable Success

| Metric | Target | Measurement |
|--------|--------|-------------|
| 광고 운영 시간 절감 | 70%+ | 팀 서베이 (Before/After) |
| 키워드 발굴 자동화율 | 80%+ | 자동 승격 키워드 / 전체 신규 키워드 |
| Daily Budget 소진율 | 90%+ | 일일 실제 spend / daily budget |
| 캠페인 생성 시간 (신제품) | 10분 이내 | 템플릿 → 활성화 시간 |
| 안전장치 발동 정확도 | 95%+ | 오탐률 < 5% |

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Amazon Ads API 인증 미확보 | High | High | 즉시 LWA 앱 등록 시작. 승인 2-4주 소요 |
| Marketing Stream AWS 셋업 지연 | Medium | Medium | Phase 1은 Reporting API + Orders 서버 데이터로 시작. Stream은 Phase 1 후반 추가 |
| 자동화 안전장치 미흡 → 예산 낭비 | Critical | Medium | 10개 필수 guardrails 우선 구현. Dry run 모드 먼저 |
| 데이터 지연(12-72h)으로 잘못된 판단 | High | High | 데이터 성숙도 체크 필수. 48h+ 데이터만 의사결정 |
| API rate limit으로 일부 캠페인 미업데이트 | Medium | Medium | 큐 기반 처리 + exponential backoff + 우선순위 |
| 키워드 카니발리제이션 (자기 경쟁) | Medium | High | 승격 시 원래 캠페인에서 네거티브 처리 자동화 |
| 팀 리소스 부족 (1 dev + 2 PM) | High | Medium | PM의 Claude Code 활용 극대화, 모듈별 순차 구현 |
| Amazon API 스키마 변경 | Medium | Low | 응답 스키마 검증, 파싱 실패 시 안전 모드 전환 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `ads` 스키마 | DB Schema | 신규 생성 (20+ 테이블) |
| `src/app/(protected)/ads/*` | Pages | 신규 생성 (5개 페이지) |
| `src/modules/ads/*` | Module Logic | 신규 생성 |
| `src/constants/modules.ts` | Config | AD 모듈 status: `coming_soon` → `active` |
| `.env.local` | Environment | Amazon API 인증 변수 추가 |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `public.users` | READ | 사용자 정보 조회 | None (읽기만) |
| `public.org_units` | READ | 팀 프리픽스 조회, 권한 제어 | None (읽기만) |
| `public.user_org_units` | READ | 사용자 소속 팀 확인 | None (읽기만) |
| `public.module_access_configs` | READ | AD 모듈 접근 레벨 확인 | None (읽기만) |
| `public.system_configs` | READ | 설정값 읽기 | None (읽기만) |
| `public.brands` | READ | 브랜드 목록 (Spigen/Legato/Cyrill) | None (읽기만) |
| `public.brand_markets` | READ | 브랜드×마켓 계정 매핑 (12+ 계정) | None (읽기만) |
| `public.brand_market_permissions` | READ | 조직별 브랜드×마켓 edit/view 권한 | None (읽기만) |
| `src/constants/modules.ts` | READ | 사이드바 모듈 목록 | Needs verification (status 변경) |

### 6.3 Verification

- [ ] `modules.ts` 변경이 IP 모듈 사이드바에 영향 없는지 확인
- [ ] `public.*` 테이블 읽기만 하고 쓰기 없는지 확인
- [ ] `ads.*` 테이블이 다른 모듈과 충돌 없는지 확인

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Selected |
|-------|-----------------|:--------:|
| **Starter** | Simple structure | |
| **Dynamic** | Feature-based modules, BaaS | **✅** |
| **Enterprise** | Strict layer separation, microservices | |

> A.R.C.는 Next.js App Router + Supabase 기반 Dynamic 레벨. 모듈별 폴더 분리.

### 7.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| Framework | Next.js 15 App Router | 기존 플랫폼 |
| DB | Supabase (PostgreSQL, `ads` 스키마) | 기존 인프라, RLS 지원 |
| API Client | Supabase Client + fetch (Amazon API) | 기존 패턴 |
| State Management | Server Components 기본 | CLAUDE.md 규칙 |
| Styling | Tailwind CSS | 기존 플랫폼 |
| External API | Amazon Ads API v3 + SP-API + Marketing Stream | 핵심 데이터 소스 |
| Multi-Account | 3 브랜드(Spigen/Legato/Cyrill) × 4+ 마켓 = 12+ 계정 | 계정별 별도 API 인증 |
| Secret Management | Doppler (계정별 환경변수 분리) | 12+ 토큰 안전 관리 |
| Realtime Data | Marketing Stream → AWS Lambda → Supabase | 시간별 데이터 |
| Orders Data | 기존 별도 서버 (데일리 수집 중) | 데이파팅/TACoS 소스 |
| Automation | 3-Tier Hybrid (규칙 + 알고리즘 + ML) | 투명성 + 성능 밸런스 |

### 7.3 Data Flow Architecture

```
[Amazon Ads API v3]          [Amazon Marketing Stream]     [Orders 서버]
  12+ 계정별 API 호출           AWS SQS → Lambda              (기존, 별도 DB)
  Campaign CRUD                시간별 데이터 push             주문/매출 데이터
  Bid Recommendations          예산 소진 알림
  Reporting API (Daily)
         |                           |                          |
         v                           v                          v
+------------------------------------------------------------------+
|  [Doppler]                 Supabase (ads 스키마)                  |
|  계정별 토큰 관리           marketplace_profiles (12+ 계정 인증)   |
|                            campaigns, keywords, bids, reports,   |
|                            change_log, rules, budget_tracking,   |
|                            keyword_rankings, automation_log       |
+------------------------------------------------------------------+
         |
         v
+------------------------------------------------------------------+
|                    A.R.C. AD Optimizer                            |
|  브랜드: Spigen / Legato / Cyrill                                |
|  마켓: US / CA / DE / JP / ...                                   |
|  /ads/dashboard     — 성과 대시보드 (CEO/Director/Marketer 뷰)    |
|  /ads/campaigns    — 캠페인 관리 + 자동 생성                      |
|  /ads/optimization — 최적화 엔진 (Bidding/Budget/Keywords/Dayparting 탭) |
|  /ads/autopilot    — Full Auto Pilot 자율 운영                    |
|  /ads/reports      — 리포트 + 구글시트 연동                       |
+------------------------------------------------------------------+
```

### 7.4 Permission System Integration (org-permission-system.plan.md 참조)

**3-Layer 접근 제어:**

```
Layer 1: 조직 (org_units + user_org_units)
  → AD 모듈 access_level: 'business_unit'
  → 사업부 내에서만 광고 데이터 공유
  → RLS: ads.* 테이블에 org_unit_id 기반 자동 필터
  → DB: get_accessible_org_units(user_id, 'ads')

Layer 2: 브랜드×마켓 (brands + brand_markets + brand_market_permissions)
  → public.brands (Spigen, Legato, Cyrill)
  → public.brand_markets (brand × marketplace = 12+ 계정)
  → public.brand_market_permissions (조직 × 브랜드마켓 = edit/view)
  → 예: 북미사업부 → Spigen US = edit, Legato US = edit
  → ads.marketplace_profiles → brand_markets 참조
  → DB: get_accessible_brand_markets(user_id, 'ads')

Layer 3: SKU 담당 (product_assignments) — Product Library 완성 후
  → 개인 × SKU × brand_market 매핑
  → 같은 팀 안에서도 담당 SKU/카테고리 필터
```

**예시: 김철수 (북미사업부 > 아마존팀)**
```
Layer 1: 북미사업부 소속 → AD access_level 'business_unit' → 북미사업부 범위
Layer 2: 조직 권한으로 Spigen US = edit 획득
Layer 3: (향후) SKU-001, SKU-002 담당 → 담당 SKU 광고만 필터
→ AD 접속: 북미사업부 + Spigen US edit + 담당 SKU 캠페인
```

**역할별 대시보드 뷰 × 권한 맵핑:**

| 역할 | org_units 레벨 | 대시보드 뷰 | 데이터 범위 |
|------|---------------|-----------|-----------|
| owner (사장) | company | CEO 뷰 — 전사 TACoS 한 줄 | 모든 브랜드 × 모든 마켓 |
| admin (부문장) | business_unit | Director 뷰 — 브랜드×마켓 매트릭스 | 소속 사업부의 brand_market_permissions |
| editor (마케터) | team | 마케터 뷰 — 캠페인 상세 | 소속 조직의 brand_market edit 권한 범위 |
| viewer_plus | team | 읽기 전용 뷰 | 소속 조직의 brand_market view 권한 범위 |
| viewer | team | 읽기 전용 뷰 (제한적) | 소속 조직의 brand_market view 권한 범위 |

**AD 테이블 필수 컬럼:**

```sql
-- 모든 ads.* 핵심 테이블에 포함
org_unit_id uuid REFERENCES public.org_units(id)          -- Layer 1
brand_market_id uuid REFERENCES public.brand_markets(id)  -- Layer 2 (brand + marketplace 통합)
```

**RLS 패턴 (Layer 1 + Layer 2 조합):**

```sql
CREATE POLICY "ads_org_brand_access" ON ads.campaigns
  FOR SELECT USING (
    org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
    AND brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  );
```

**참조 문서:** `docs/01-plan/features/org-permission-system.plan.md`

### 7.5 Automation Architecture (3-Tier Hybrid)

```
Tier 1: Rule Engine (deterministic, transparent)
  - IF/THEN 규칙 (사용자 설정 가능)
  - 템플릿 라이브러리
  - 모든 액션에 reason 기록
  - Dry run 모드

Tier 2: Algorithm Layer (statistical optimization)
  - Target ACoS 기반 비딩 계산: bid = target_acos × AOV × CVR
  - Budget pacing: 시간별 spend 추적 → 비딩 조정
  - 키워드 점수화: (CVR × relevance) / ACoS

Tier 3: ML Layer (Phase 2+, 데이터 축적 후)
  - 전환 확률 예측
  - 시즌 패턴 인식
  - 이상 탐지
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration
- [x] TypeScript configuration (`tsconfig.json`)
- [ ] `ads` 스키마 컨벤션 (신규 정의 필요)

### 8.2 Conventions to Define

| Category | Rule |
|----------|------|
| **캠페인 네이밍** | `{6자리코드} {(타입태그)} {제품명} [{담당자}] - {날짜코드}` — 기존 iBD 마케팅 코드 체계 호환. 예: `111112 (Search Term) Galaxy S26 Optik Pro [Kelly] - 222007` |
| **마케팅 코드** | Platform(2)+Channel(2)+Unit(2) = 6자리. 예: 11(ASP)+11(US)+12(Mobile)=111112. Finance 예산 코드와 동일 |
| **DB 테이블** | `ads.` 스키마, snake_case, `org_unit_id` + `marketplace` 필수 |
| **API Route** | `/api/ads/*` (모듈 격리) |
| **환경변수** | `AMAZON_ADS_*`, `AMAZON_SP_*` 접두사 |

### 8.3 Environment Variables (Doppler 관리)

> 12+ Amazon 계정의 크레덴셜은 **Doppler**에서 관리. 코드에 하드코딩 금지.
> DB `ads.marketplace_profiles` 테이블에서 계정별 API 토큰 참조.

**공통 변수:**

| Variable | Purpose | Scope |
|----------|---------|-------|
| `DOPPLER_TOKEN` | Doppler API 토큰 | Server |
| `AWS_SQS_QUEUE_URL` | Marketing Stream SQS queue | Server |
| `AWS_ACCESS_KEY_ID` | AWS credentials (Lambda/SQS) | Server |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | Server |
| `GOOGLE_SHEETS_API_KEY` | Google Sheets 연동 | Server |
| `SLACK_WEBHOOK_URL` | Slack 알림 | Server |

**계정별 변수 (Doppler 프로젝트별 분리):**

| Variable Pattern | Purpose | 예시 |
|-----------------|---------|------|
| `AMAZON_ADS_CLIENT_ID` | Amazon Ads API OAuth | 계정별 동일 또는 상이 |
| `AMAZON_ADS_CLIENT_SECRET` | Amazon Ads API OAuth | 계정별 |
| `AMAZON_ADS_REFRESH_TOKEN_{BRAND}_{MARKET}` | 계정별 refresh token | `..._SPIGEN_US`, `..._LEGATO_JP` |
| `AMAZON_SP_REFRESH_TOKEN_{BRAND}_{MARKET}` | SP-API 계정별 | `..._CYRILL_DE` |

**Doppler 프로젝트 구조:**

```
arc-ads/
├── common/    ← SUPABASE, SLACK, AWS 등 공통
├── spigen-us/ ← Spigen US 계정 토큰
├── spigen-ca/ ← Spigen CA 계정 토큰
├── spigen-de/ ← Spigen DE 계정 토큰
├── spigen-jp/ ← Spigen JP 계정 토큰
├── legato-us/ ← Legato US 계정 토큰
├── cyrill-us/ ← Cyrill US 계정 토큰
└── ...
```

---

## 9. Implementation Phases

### Phase 1: Foundation + Campaign Management (Month 1)

**Week 1-2:**
- Amazon Ads API OAuth 앱 등록 신청
- `ads` 스키마 설계 + 생성
- GitHub Actions CI 셋업
- 기본 페이지 스캐폴딩 (/ads/dashboard, /ads/campaigns, /ads/optimization, /ads/autopilot, /ads/reports)
- 모듈 status `active` 전환

**Week 3-4:**
- Amazon Ads API 연동 (캠페인 조회/생성)
- 캠페인 CRUD UI
- 팀 프리픽스 자동 부착
- 캠페인 네이밍 컨벤션 검증
- 기본 대시보드 (KPI 카드, 캠페인 테이블)

### Phase 2: Optimization Engine — `/ads/optimization` (Month 2 전반)

**Week 5-6:**
- `/ads/optimization` 페이지 스캐폴딩 (4탭: Bidding / Budget / Keywords / Dayparting)
- Reporting API v3 연동 (일별 성과 데이터)
- 비딩 자동 조정 (추천값 N% + ACoS 연동) → Bidding 탭
- 안전장치 구현 (10개 guardrails)
- Change log + 롤백 시스템

**Week 7-8:**
- Marketing Stream AWS 셋업 + 데이터 수신 → ads 스키마 저장
- 데이파팅 (시간별 비딩 가중치) → Dayparting 탭
- AI 예산 밸런스 (Daily Pacing) + 미소진 원인 분석 → Budget 탭
- 키워드 랭킹 추적 (Brand Analytics) → Keywords 탭
- Slack/Email 알림

### Phase 3: Full Auto Pilot — `/ads/autopilot` (Month 2 후반)

**Week 9-10:**
- `/ads/autopilot` 페이지 (캠페인 + 주간 예산 → AI 자율 운영)
- 키워드 발굴 파이프라인 (Auto → Broad → Phrase → Exact)
- 네거티브 키워드 자동 등록
- 타겟 키워드 자동 추가
- 저성과 캠페인 자동 비활성

---

## 10. Key System Configuration Values

> `public.system_configs` 테이블에 저장. 하드코딩 금지.

| Key | Default | Description |
|-----|---------|-------------|
| `ads.data_maturity_hours` | 72 | 의사결정에 사용할 최소 데이터 성숙 시간 |
| `ads.min_clicks_for_optimization` | 20 | 자동화 적용 최소 클릭 수 |
| `ads.new_keyword_learning_days` | 14 | 신규 키워드 보호 기간 |
| `ads.max_bid_change_pct` | 30 | 1일 최대 비딩 변경 폭 (%) |
| `ads.absolute_max_bid_usd` | 10.00 | 절대 최대 입찰가 ($) |
| `ads.max_budget_multiplier` | 3.0 | 예산 증가 최대 배수 |
| `ads.budget_increase_cooldown_days` | 7 | 예산 증가 후 재변경 대기 기간 |
| `ads.manual_override_lock_days` | 7 | 수동 변경 후 자동화 잠금 기간 |
| `ads.launch_mode_days` | 30 | 신제품 런칭 모드 기간 |
| `ads.stock_alert_days_threshold` | 7 | 재고 경고 임계치 (일수) |
| `ads.buybox_min_pct` | 70 | Buy Box 보유율 최소치 (%) |
| `ads.negation_min_clicks` | 15 | 네거티브 추가 최소 클릭 수 |
| `ads.promotion_min_orders` | 2 | 키워드 승격 최소 주문 수 |

---

## 11. Prerequisites (선행 작업 — ip-project 메인 repo)

> AD 모듈 개발 전에 플랫폼 레벨에서 완료되어야 하는 작업

| # | 작업 | 담당 | 상태 |
|---|------|------|------|
| P1 | `public.brands` 테이블 생성 (Spigen, Legato, Cyrill) | IP repo (공통) | ✅ 3행 |
| P2 | `public.brand_markets` 테이블 생성 (brand × marketplace) | IP repo (공통) | ✅ 9행 |
| P3 | `public.brand_market_permissions` 테이블 생성 (조직 × 브랜드마켓 권한) | IP repo (공통) | ✅ 생성 |
| P4 | Settings > Organization에 Tab 2 (브랜드 & 마켓) UI 추가 | IP repo (공통) | ⬜ |
| P5 | `get_accessible_brand_markets()` DB 함수 생성 | IP repo (공통) | ⬜ |
| P6 | 조직 트리 확장 (사업부/팀 단계 추가) | IP repo Settings UI | ⬜ |

## 12. Next Steps

1. [ ] **선행 작업 (P1~P6)** — ip-project repo에서 브랜드/마켓 인프라 구축
2. [ ] Design 문서 작성 (`/pdca design ad-optimizer`)
3. [ ] Amazon Ads API OAuth 앱 등록 신청 (즉시)
4. [ ] `ads` 스키마 상세 ERD 설계 (Design 단계)
5. [ ] AWS 계정 확인 + SQS 큐 생성 준비
6. [ ] ip-project repo clone + 온보딩 파일 적용

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-25 | Initial draft — 3 categories, 9 features, 10 guardrails, competitive research 반영 | Jayden Song |
