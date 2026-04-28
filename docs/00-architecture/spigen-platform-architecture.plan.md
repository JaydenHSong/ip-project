# Spigen Amazon Operations Platform - Architecture Plan

> **Summary**: Sentinel을 첫 번째 모듈로 하는 모듈형 통합 플랫폼 아키텍처 설계
>
> **Project**: Sentinel (Spigen Amazon Operations Platform)
> **Version**: 0.9.0-beta
> **Author**: CTO Lead (Claude)
> **Date**: 2026-03-19 (Updated: 2026-03-26)
> **Status**: In Progress (Phase 1 대부분 완료)

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **문제** | 아마존 운영 도구가 파편화되어 있음 -- IP 보호, AD 최적화, 재무, 물류가 각각 별도 시스템 |
| **해결** | Sentinel을 첫 모듈로 한 모듈형 단일 플랫폼 (Shopify Admin / HubSpot Hub 패턴) |
| **기능/UX 효과** | SSO 한 번 로그인, 사이드바 모듈 전환, 통합 대시보드 -- 아마존 오퍼레이터의 "단일 업무 화면" |
| **핵심 가치** | "아마존 오퍼레이터를 위한 ERP" -- 셀러센트럴 자동화 + 오퍼레이터 최적화 플랫폼 |

---

## 1. Overview

### 1.1 비전

**"아마존 오퍼레이터를 위한 ERP"**

Spigen의 아마존 운영팀이 사용하는 모든 도구를 하나의 플랫폼으로 통합한다.
Sentinel(IP 보호)은 이 플랫폼의 첫 번째 모듈이며, AD 최적화/재무/물류/리스팅관리/제품정보관리/제품 기획 관리 등이 모듈로 추가된다.

### 1.2 왜 이 구조인가

| 비교 대상 | 구조 | Spigen에 적용하면 |
|-----------|------|-------------------|
| **Shopify Admin** | 하나의 앱, 모듈별 사이드바 | 가장 유사 -- 단일 코드베이1스, 메뉴로 분기 |
| **HubSpot** | Marketing/Sales/Service Hub -- 같은 플랫폼, 다른 모듈 | 모듈별 독립 팀 가능, 공통 컴포넌트 공유 |
| **Amazon Seller Central** | 하나의 대시보드, 메뉴로 분기 | 우리가 대체하려는 대상의 구조 자체 |

### 1.3 현재 상태

```
현재 Sentinel (sentinel.spigen.com)
├── Dashboard
├── Campaigns (키워드 크롤링)
├── Report Queue (신고 대기)
├── Completed Reports (완료)
├── IP Registry (특허/상표)
├── Notices (공지)
└── Settings
```

- Next.js 15 + Supabase + Vercel
- Google OAuth (@spigen.com)
- 역할: owner > admin > editor > viewer_plus > viewer

---

## 2. 추천 아키텍처: "모듈형 단일 앱" (Modular Monolith)

### 2.1 왜 통합인가 (분리 vs 통합 최종 결론)

| 옵션 | 장점 | 단점 | 판정 |
|------|------|------|:----:|
| **A. 포털 + 독립 앱** | 모듈 독립 배포, 팀 자율성 | SSO 복잡, 공통 컴포넌트 중복, 인프라 비용 x N | X |
| **B. 마이크로 프론트엔드** | 독립 배포 + 통합 UX | 설정 복잡, 디버깅 어려움, 소규모 팀에 과도 | X |
| **C. 모듈형 단일 앱** | SSO 자동, 공통 컴포넌트 공유, 배포 단순, 한 팀이 전체 관리 가능 | 모듈 간 경계 의지적으로 유지 필요 | **추천** |

**결론: 옵션 C -- Sentinel 안에 모듈로 통합**

이유:
1. **팀 규모** -- 현재 1명 PM + 개발자 투입 예정 = 소규모. 마이크로 서비스/프론트엔드는 과도함
2. **SSO 자동 해결** -- 같은 앱이니 한 번 로그인하면 끝
3. **공통 컴포넌트** -- 테이블, 모달, 사이드바, 테마, i18n 등 이미 잘 만들어져 있음
4. **Vercel 단일 프로젝트** -- 추가 인프라 비용 없음
5. **향후 분리 가능** -- 모듈 경계를 잘 잡으면 나중에 독립 앱으로 분리 가능 (HubSpot도 이렇게 시작)

### 2.2 쉬운 비유

```
지금:
  Sentinel = 단독 상가 (IP 보호만 하는 가게)

제안:
  Spigen Operations Platform = 백화점
    ├── 1층: IP 보호 (Sentinel) -- 이미 입점 완료
    ├── 2층: AD 최적화 -- 새로 입점
    ├── 3층: 재무 분석 -- 나중에 입점
    └── 4층: 물류 관리 -- 나중에 입점

백화점이니까:
  - 입구(로그인)는 하나
  - 엘리베이터(사이드바)로 층 이동
  - 고객 카드(계정/권한)는 전체 공유
  - 각 층은 자기 공간에서 독립 운영
```

---

## 3. 사이드바 / 네비게이션 구조

### 3.1 현재 (단일 모듈)

```
사이드바:
  Dashboard
  Campaigns
  Report Queue
  Completed Reports
  IP Registry
  Notices
  ──────────
  Settings
```

### 3.2 제안: 2단계 사이드바 (모듈 스위처 + 모듈 메뉴)

```
┌──────────────────────────────────────┐
│ [S] Spigen        [모듈 스위처 ▼]    │  <-- 상단: 플랫폼 이름 + 모듈 드롭다운
├──────────────────────────────────────┤
│                                      │
│  IP Protection (Sentinel)            │  <-- 현재 선택된 모듈 이름 (작은 뱃지)
│                                      │
│  Dashboard                           │
│  Campaigns                           │
│  Report Queue                        │
│  Completed Reports                   │
│  IP Registry                         │
│  Notices                             │
│                                      │
├──────────────────────────────────────┤
│  Settings                            │  <-- 공통 (모든 모듈 공유)
├──────────────────────────────────────┤
│  [사용자 아바타] jsong / Owner        │
│  [로그아웃]                           │
└──────────────────────────────────────┘
```

**모듈 스위처 (드롭다운)**:

```
┌──────────────────────────────────┐
│  IP Protection       ●           │  <-- 현재 활성
│  AD Optimizer        NEW         │
│  Listing Management  (준비중)     │
│  Product Library     (준비중)     │
│  Product Planning    (준비중)     │
│  Finance             (준비중)     │
│  OMS                 (준비중)     │
│  Reimbursement       (준비중)     │
└──────────────────────────────────┘
```

### 3.3 왜 이 구조인가

| 대안 | 설명 | 문제 |
|------|------|------|
| **모든 메뉴를 한 사이드바에** | 모듈 구분 없이 나열 | 5개 모듈 x 5개 메뉴 = 25개 항목 -- 너무 길고 혼란 |
| **상단 탭으로 모듈 전환** | Gmail처럼 상단 탭 | 모바일에서 공간 부족, 모듈 5개 이상이면 스크롤 |
| **아이콘 레일 + 펼침 메뉴** | Slack처럼 좌측 아이콘 줄 | 아이콘만으로 모듈 구분 어려움 |
| **드롭다운 스위처** | Shopify Admin, Notion 워크스페이스 | **깔끔, 확장 가능, 기존 사이드바 구조 유지** |

### 3.4 모바일 하단 탭바

```
현재: [Dashboard] [Campaigns] [Reports] [IP Registry] [Settings]

제안: 변경 없음 -- 모듈 전환은 햄버거 메뉴 또는 상단 드롭다운
     각 모듈의 핵심 5개 탭만 하단에 표시
```

---

## 4. URL / 사이트 트리 구조

### 4.1 URL 설계

```
sentinel.spigen.com (또는 ops.spigen.com으로 리브랜딩)
│
├── /login                          -- 로그인 (공통)
├── /dashboard                      -- 통합 대시보드 (모듈 크로스)
│
├── /ip/                            -- IP Protection 모듈 (현재 Sentinel)
│   ├── /ip/dashboard               -- IP 대시보드
│   ├── /ip/campaigns               -- 캠페인
│   ├── /ip/campaigns/[id]
│   ├── /ip/campaigns/new
│   ├── /ip/reports                  -- 신고 대기
│   ├── /ip/reports/completed        -- 완료
│   ├── /ip/reports/archived         -- 아카이브
│   ├── /ip/reports/[id]
│   ├── /ip/patents                  -- IP Registry
│   └── /ip/notices                  -- 공지
│
├── /ads/                            -- AD 최적화 모듈
│   ├── /ads/dashboard
│   ├── /ads/campaigns
│   ├── /ads/keywords
│   ├── /ads/budget
│   └── /ads/reports
│
├── /finance/                        -- 재무 모듈 (미래)
│   ├── /finance/dashboard
│   ├── /finance/pnl
│   ├── /finance/fees
│   └── /finance/reports
│
├── /oms/                            -- OMS 모듈 (미래)
│   ├── /oms/dashboard
│   ├── /oms/orders
│   ├── /oms/inventory
│   └── /oms/shipments
│
├── /reimbursement/                  -- Reimbursement 모듈 (미래)
│   ├── /reimbursement/dashboard
│   ├── /reimbursement/cases
│   ├── /reimbursement/followups
│   └── /reimbursement/reports
│
├── /settings                        -- 공통 설정
│   ├── /settings/profile
│   ├── /settings/team
│   ├── /settings/modules            -- 모듈 활성화/비활성화
│   └── /settings/integrations       -- Amazon SP-API 등
│
├── /audit-logs                      -- 감사 로그 (공통)
└── /changelog                       -- 변경 이력 (공통)
```

### 4.2 마이그레이션 전략

현재 `/dashboard`, `/campaigns` 등의 URL을 `/ip/dashboard`, `/ip/campaigns`으로 이동해야 함.

| 단계 | 작업 | 영향 |
|------|------|------|
| 1 | 새 URL 구조 생성 (`/ip/*`) | 코드 추가만, 기존 동작 유지 |
| 2 | 기존 URL에서 리다이렉트 설정 | `/campaigns` -> `/ip/campaigns` (301) |
| 3 | 사이드바/탭바 href 업데이트 | UI 변경 |
| 4 | Extension의 하드코딩된 URL 업데이트 | Extension 릴리즈 필요 |
| 5 | 기존 URL 제거 | 전환 완료 후 |

---

## 5. DB 전략

### 5.1 추천: Supabase 하나, 스키마로 분리

| 옵션 | 장점 | 단점 | 판정 |
|------|------|------|:----:|
| **A. Supabase 하나 + 테이블 prefix** | 가장 단순, 비용 없음 | 테이블 이름 길어짐 (`ip_campaigns`, `ads_campaigns`) | X |
| **B. Supabase 하나 + PostgreSQL Schema** | 논리적 분리, JOIN 가능, 비용 없음 | Schema 관리 필요 | **추천** |
| **C. 모듈별 Supabase 프로젝트** | 완전 격리 | 비용 x N, JOIN 불가, SSO 복잡 | X |

### 5.2 PostgreSQL Schema 구조

```sql
-- 공통 (기본 public 스키마)
public.users              -- 사용자 (기존)
public.user_settings      -- 설정 (기존)
public.notices            -- 공지 (기존)
public.audit_logs         -- 감사 로그 (기존)

-- IP Protection 모듈 (현재 Sentinel 테이블들)
ip.campaigns              -- 현재 public.campaigns
ip.listings               -- 현재 public.listings
ip.reports                -- 현재 public.reports
ip.violations             -- 현재 public.violations
ip.patents                -- 현재 public.patents
ip.br_cases               -- 현재 public.br_cases
-- ... 기타 IP 관련 테이블

-- AD 최적화 모듈
ads.campaigns
ads.keywords
ads.budget_rules
ads.performance_logs
ads.reports

-- 재무 모듈 (미래)
finance.transactions
finance.fee_analysis
finance.pnl_reports

-- OMS 모듈 (미래)
oms.orders
oms.inventory
oms.shipments

-- Reimbursement 모듈 (미래)
reimbursement.cases
reimbursement.followups
reimbursement.transactions
```

### 5.3 마이그레이션 주의사항

- 기존 `public` 스키마의 Sentinel 테이블은 **당장 옮기지 않아도 됨**
- 새 모듈(AD)부터 `ads` 스키마에 생성
- IP 테이블 이동은 안정화 후 점진적으로 (RLS 정책 재설정 필요)
- Supabase RLS는 스키마별로 적용 가능

---

## 6. 코드 구조 (개발자 투입 시)

### 6.1 현재 구조

```
src/
├── app/
│   ├── (auth)/login/
│   └── (protected)/
│       ├── dashboard/
│       ├── campaigns/
│       ├── reports/
│       ├── patents/
│       ├── notices/
│       ├── settings/
│       ├── audit-logs/
│       └── changelog/
├── components/
│   ├── layout/          -- AppLayout, Sidebar, Header, MobileTabBar
│   ├── ui/              -- 공통 UI
│   └── features/        -- 기능별 컴포넌트
├── lib/
│   ├── auth/
│   ├── supabase/
│   ├── i18n/
│   └── ...
└── types/
```

### 6.2 제안 구조 (모듈형)

```
src/
├── app/
│   ├── (auth)/login/
│   └── (protected)/
│       ├── dashboard/               -- 통합 대시보드
│       │
│       ├── ip/                      -- IP Protection 모듈
│       │   ├── dashboard/
│       │   ├── campaigns/
│       │   ├── reports/
│       │   ├── patents/
│       │   └── notices/
│       │
│       ├── ads/                     -- AD 최적화 모듈
│       │   ├── dashboard/
│       │   ├── campaigns/
│       │   ├── keywords/
│       │   ├── budget/
│       │   └── reports/
│       │
│       ├── listings/                -- 리스팅 관리 (자동 SEO, Feed, 가격 최적화)
│       ├── products/                -- 제품 정보 라이브러리
│       ├── planning/                -- 제품 기획 & UX 시뮬레이터
│       ├── finance/                 -- 재무 모듈 (미래)
│       ├── oms/                     -- OMS 모듈 (미래)
│       ├── reimbursement/          -- Reimbursement 모듈 (미래)
│       │
│       ├── settings/                -- 공통
│       ├── audit-logs/
│       └── changelog/
│
├── modules/                         -- 모듈별 비즈니스 로직
│   ├── ip/                          -- IP Protection
│   │   ├── components/              -- IP 전용 컴포넌트
│   │   ├── lib/                     -- IP 비즈니스 로직
│   │   ├── types/                   -- IP 타입 정의
│   │   └── constants/               -- IP 상수
│   │
│   ├── ads/                         -- AD 최적화
│   │   ├── components/
│   │   ├── lib/
│   │   ├── types/
│   │   └── constants/
│   │
│   ├── listings/                    -- 리스팅 관리
│   │   ├── components/
│   │   ├── lib/
│   │   ├── types/
│   │   └── constants/
│   │
│   ├── products/                    -- 제품 정보 라이브러리
│   │   ├── components/
│   │   ├── lib/
│   │   ├── types/
│   │   └── constants/
│   │
│   ├── planning/                    -- 제품 기획 & UX 시뮬레이터
│   │   ├── components/
│   │   ├── lib/
│   │   ├── types/
│   │   └── constants/
│   │
│   ├── finance/                     -- 재무
│   ├── oms/                         -- OMS
│   ├── reimbursement/               -- Reimbursement
│   │
│   └── shared/                      -- 모듈 간 공유
│       ├── amazon/                  -- Amazon SP-API 공통
│       └── asin/                    -- ASIN 관련 유틸
│
├── components/                      -- 공통 UI (기존 유지)
│   ├── layout/
│   ├── ui/
│   └── providers/
│
├── lib/                             -- 공통 라이브러리 (기존 유지)
│   ├── auth/
│   ├── supabase/
│   └── i18n/
│
└── types/                           -- 공통 타입 (기존 유지)
```

### 6.3 모듈 격리 원칙 (절대 규칙)

**핵심: 한 모듈의 개발/업데이트/장애가 다른 모듈에 절대 영향을 주면 안 된다.**

| 격리 영역 | 방법 |
|:--|:--|
| **코드** | `modules/{module}/` 폴더 안에서만 작업. 다른 모듈 import 금지 |
| **DB** | 모듈별 PostgreSQL Schema 분리. 다른 스키마 테이블 직접 JOIN 금지 |
| **API** | `/api/{module}/*` 모듈 전용. 다른 모듈 API 직접 호출 금지 |
| **타입** | `modules/{module}/types/` 자체 타입. 다른 모듈 타입 import 금지 |
| **상태** | 모듈 간 상태 공유 금지. 필요하면 `modules/shared/`를 경유 |
| **배포** | 한 모듈 코드만 변경해도 전체 빌드되지만, 다른 모듈 동작에 영향 없음 |

**모듈 간 데이터가 필요한 경우:**
```
❌ modules/ads/ → modules/ip/lib/reports 직접 참조
✅ modules/ads/ → modules/shared/asin/ → 공통 ASIN 유틸 사용
✅ modules/ads/ → /api/shared/asin/{asin} → API로 데이터 요청
```

### 6.4 모듈 경계 규칙 (코드 레벨)

```
규칙 1: 모듈은 자기 폴더만 참조
  modules/ip/  --> components/, lib/, types/ (공통) OK
  modules/ip/  --> modules/ads/ (다른 모듈) NEVER

규칙 2: 모듈 간 통신은 shared를 경유
  modules/ip/ --> modules/shared/amazon/ OK
  modules/ads/ --> modules/shared/amazon/ OK

규칙 3: 공통 컴포넌트는 components/ui/에
  모듈 전용 = modules/{module}/components/
  공통 = components/ui/

규칙 4: 페이지는 app/, 로직은 modules/
  app/ip/campaigns/page.tsx --> modules/ip/components/CampaignList
```

### 6.4 개발자 분업 가이드

```
기획자/개발자 A (Jayden + Claude): IP Protection + AD Optimization
  담당: src/app/(protected)/ip/*, modules/ip/*
         src/app/(protected)/ads/*, modules/ads/*

기획자/개발자 B: Listing Management + Product Library + Product Planning
  담당: src/app/(protected)/listings/*, modules/listings/*
         src/app/(protected)/products/*, modules/products/*
         src/app/(protected)/planning/*, modules/planning/*

개발자 C (백엔드): 공통 인프라 + Finance + OMS
  담당: src/app/(protected)/finance/*, modules/finance/*
         src/app/(protected)/oms/*, modules/oms/*
         lib/auth/, lib/supabase/ (공통 백엔드)

공통: components/, lib/, types/ -- 전원 (PR 리뷰 필수)
```

---

## 7. 플랫폼 리브랜딩

### 7.1 이름 (확정)

| 현재 | 확정 | 풀네임 |
|------|------|--------|
| Sentinel | **A.R.C.** | Amazon Resource Controller |

- URL: `sentinel.spigen.com` → `arc.spigen.com` (테크니션에게 도메인 요청 중)
- 로고: 새 A.R.C. 브랜딩 (디자인 미정)
- 각 모듈은 서브 브랜드: "A.R.C. / IP Protection", "A.R.C. / AD Optimizer"
- "Sentinel"은 IP Protection 모듈의 내부 코드네임으로 유지 가능

### 7.2 리브랜딩 시기

- 도메인 `arc.spigen.com` 준비되면 전환
- 코드 구조(모듈 스위처 등)는 리브랜딩 전에 먼저 준비
- 브랜딩 에셋(로고, 파비콘 등)은 디자인 확정 후 교체

---

## 8. 구현 로드맵

### Phase 1: 기반 준비 (AD 모듈 개발 전)

| 순서 | 작업 | 복잡도 | 기존 기능 영향 |
|:----:|------|:------:|:-------------:|
| 1 | 모듈 스위처 컴포넌트 추가 (사이드바 상단) | 낮음 | 없음 |
| 2 | `modules/` 폴더 구조 생성 | 낮음 | 없음 |
| 3 | `app/(protected)/ip/` 라우트 그룹 생성 | 중간 | 리다이렉트 필요 |
| 4 | 기존 페이지를 `/ip/*` 아래로 이동 | 중간 | URL 변경 |
| 5 | 사이드바 모듈별 메뉴 렌더링 로직 | 중간 | 사이드바 리팩터 |
| 6 | DB에 `ads` 스키마 생성 | 낮음 | 없음 |

### Phase 2: AD 최적화 모듈

| 순서 | 작업 | 설명 |
|:----:|------|------|
| 1 | AD 모듈 라우트/페이지 생성 | `/ads/dashboard`, `/ads/campaigns` 등 |
| 2 | AD 전용 컴포넌트 개발 | `modules/ads/components/` |
| 3 | Amazon SP-API 연동 (광고) | 공통 `modules/shared/amazon/` |
| 4 | AD 대시보드 위젯 | 통합 대시보드에도 표시 |

### Phase 3: 재무/물류 (미래)

- 같은 패턴으로 추가
- `/finance/*`, `/logistics/*`
- `modules/finance/`, `modules/logistics/`

---

## 9. 리스크와 대응

| 리스크 | 영향 | 가능성 | 대응 |
|--------|:----:|:------:|------|
| URL 변경 시 Extension 호환 깨짐 | High | High | Extension에서 URL prefix 설정 가능하게 수정 |
| 모듈 경계 무시하고 직접 참조 | Medium | High | ESLint import 규칙 + 코드 리뷰 |
| DB 스키마 이동 시 RLS 깨짐 | High | Medium | IP 테이블은 당장 안 옮김, 새 모듈만 새 스키마 |
| 사이드바 복잡도 증가 | Medium | Low | 모듈 스위처로 격리, 한 번에 한 모듈만 표시 |
| Vercel 빌드 시간 증가 | Low | Medium | 모듈별 dynamic import. **Turborepo 불필요 확정** — 같은 제품이므로 모노레포 분리 이점 없음. GitHub Actions CI로 빌드 에러 사전 차단 |

---

## 10. Success Criteria

### 10.1 Phase 1 완료 기준

- [x] 모듈 스위처가 사이드바에 표시됨 (간소화된 형태)
- [x] 기존 IP 기능이 `/ip/*` URL에서 정상 동작
- [x] 기존 URL(`/campaigns` 등)이 `/ip/campaigns`으로 리다이렉트
- [x] Extension이 새 URL에서도 정상 동작
- [ ] `modules/` 폴더 구조가 생성되어 있음 (AD 시작 시 생성 예정)
- [ ] `ads` DB 스키마가 존재함 (AD 시작 시 생성 예정)
- [x] 브랜드/마켓 DB 테이블 생성 (`brands`, `brand_markets`, `brand_market_permissions`)
- [x] 조직 기반 권한 시스템 DB + UI 구축 (`org_units`, 3-레이어 접근 제어)
- [x] Settings > Organization 3탭 (조직 트리 / 브랜드 & 마켓 / 모듈 접근)

### 10.2 전체 플랫폼 기준

- [ ] 2개 이상 모듈이 독립적으로 동작
- [ ] SSO: 로그인 한 번으로 모든 모듈 접근
- [ ] 모듈별 권한 설정 가능 (Settings > Modules)
- [ ] 통합 대시보드에서 전체 모듈 요약 확인

---

## 11. 핵심 요약 (비개발자용)

### 한 줄 요약

> **지금 Sentinel을 "백화점의 1층"으로 만들고, 나머지 7개 모듈을 2~8층으로 추가하는 구조.**

### 전체 모듈 목록 (8개)

| 층 | 모듈 | 핵심 기능 | 상태 |
|:--|:--|:--|:--|
| 1층 | **IP Protection** | 위반 탐지, 신고 자동화, BR 케이스 관리 | ✅ 완료 |
| 2층 | **AD Optimizer** | 광고 캠페인 최적화, 키워드, 예산 관리 | 다음 |
| 3층 | **Listing Management** | 자동 SEO, Feed Upload, Price 최적화 | 예정 |
| 4층 | **Product Library** | 제품 카탈로그, 에셋 라이브러리, 호환성 매트릭스 | 예정 |
| 5층 | **Product Planning** | 제품 기획, UX 시뮬레이터, 경쟁사 분석 | 예정 |
| 6층 | **Finance** | 매출/비용 분석, 수수료 관리 | 예정 |
| 7층 | **OMS** | 주문 관리, FBA 출고, 재고 추적 | 예정 |
| 8층 | **Reimbursement** | FBA 분실/파손 케이스, 팔로업, 환급 추적 | 예정 |

### 뭐가 바뀌나?

| 항목 | 지금 | 이후 |
|------|------|------|
| **앱 이름** | Sentinel | **A.R.C.** (Amazon Resource Controller) |
| **로그인** | 한 번 | 한 번 (변함없음) |
| **사이드바** | 메뉴 6개 고정 | 상단에 모듈 전환 드롭다운 추가 |
| **URL** | `/campaigns` | `/ip/campaigns` |
| **DB** | 테이블 다 섞여있음 | 모듈별로 구분 (PostgreSQL Schema) |
| **코드** | 하나의 덩어리 | 모듈별 폴더로 정리 |
| **새 기능 추가** | Sentinel에 우겨넣기 | 새 모듈 폴더 만들고 독립 개발 |
| **권한** | 역할(owner~viewer)만 | 역할 + 조직 + 브랜드×마켓 3-레이어 |
| **브랜드** | 없음 | 멀티 브랜드 지원 (Spigen, Legato, Cyrill) |

### 안 바뀌는 것

- Next.js + Supabase + Vercel (기술 스택 유지)
- Google OAuth @spigen.com (인증 유지)
- 기존 IP 보호 기능 (그대로 동작)
- Extension (URL만 업데이트)
- Crawler (변경 없음)

---

## 12. 권한 & 브랜드 모델 (상세: org-permission-system.plan.md)

### 12.1 3-레이어 접근 제어

```
레이어 1: 조직 (org_units)           → "어느 팀/사업부 소속인가"
레이어 2: 브랜드×마켓 (brand_market_permissions) → "어느 브랜드×국가에 edit/view인가"
레이어 3: SKU 담당 (product_assignments)  → "마켓 안에서 어느 SKU 담당인가" (Product Library 이후)
```

### 12.2 모듈 성격 분류

8개 모듈은 데이터 스코프 기준으로 4가지 성격으로 나뉜다.

| 성격 | 모듈 | 설명 |
|:--|:--|:--|
| **전사 공통** | Product Library | 마스터 데이터 (제품 카탈로그/에셋/스펙). 누가 봐도 동일한 데이터. 브랜드별 구분은 있으나 마켓 무관 |
| **전사 고정** | IP Protection | 회사 전체 지적재산권 보호. 채널/팀 구분 없이 전사 단일 뷰 |
| **채널 단위** | Reimbursement, Product Planning | 마켓플레이스 채널에서 발생하는 액티비티. US FBA 환급과 JP FBA 환급은 별개 프로세스. 기획도 채널별 출시 전략이 다름 |
| **권한별 뷰** | AD, Listing, Finance, OMS | 전사 데이터이지만 역할에 따라 보이는 범위가 다름. 대표→전사 통합, 매니저→사업부, 오퍼레이터→담당 채널 |

### 12.3 모듈별 권한 적용

| 모듈 | 성격 | 레이어 1 | 레이어 2 | 레이어 3 | 브랜드 분리 |
|------|:--|:-:|:-:|:-:|:-:|
| IP Protection | 전사 고정 | company | ❌ | ❌ | ❌ |
| Product Library | 전사 공통 | company | 브랜드만 (마켓 무관) | ❌ | ✅ (브랜드별) |
| Product Planning | 채널 단위 | channel | ✅ 브랜드×마켓 | ❌ | ✅ |
| Reimbursement | 채널 단위 | channel | ✅ 브랜드×마켓 | ❌ | ✅ |
| AD Optimizer | 권한별 뷰 | business_unit | ✅ | ✅ (향후) | ✅ |
| Listing Management | 권한별 뷰 | business_unit | ✅ | ✅ (향후) | ✅ |
| Finance | 권한별 뷰 | business_unit | ✅ | ✅ (향후) | ✅ |
| OMS | 권한별 뷰 | business_unit | ✅ | ✅ (향후) | ✅ |

### 12.4 브랜드 (등록 완료)

| 브랜드 | 설명 | 마켓 |
|--------|------|------|
| Spigen | 폰케이스/보호필름 | US, CA, JP, DE, UK, FR, IT, ES |
| Legato | 골프공 | US |
| Cyrill | 추후 화장품 | - |

### 12.5 아키텍처 결정사항

| 결정 | 내용 | 날짜 |
|------|------|------|
| Turborepo 불필요 | 같은 제품, 같은 인증/DB/UI. GitHub Actions CI로 빌드 에러 차단. 7개 모듈이어도 단일 앱이 맞음 | 2026-03-25 |
| 멀티 브랜드 | AD 시작 시 70명 사용자 → 브랜드×마켓별 권한 분리 필수 | 2026-03-25 |
| OMS 뷰 분리 | 오퍼레이터: 브랜드별 분리, 매니저: 전체 통합 뷰 (권한으로 해결) | 2026-03-25 |
| 모듈 성격 4분류 | 전사 공통(Product Library) / 전사 고정(IP) / 채널 단위(Reimbursement, Planning) / 권한별 뷰(AD, Listing, Finance, OMS). "팀별 액티비티"가 아닌 데이터 스코프 기준 분류 | 2026-03-27 |

> 상세: `docs/01-plan/features/org-permission-system.plan.md`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-19 | Initial draft | CTO Lead (Claude) |
| 0.2 | 2026-03-26 | Logistics→OMS, Turborepo 불필요 확정, 3-레이어 권한 모델, 브랜드/마켓 DB+UI 반영, Phase 1 진행 상황 업데이트 | CTO Lead (Claude) |
| 0.3 | 2026-03-27 | 모듈 성격 4분류 도입 (전사 공통/전사 고정/채널 단위/권한별 뷰). Product Library→전사 공통, Reimbursement·Product Planning→채널 단위, Finance·OMS→권한별 뷰 재분류 | Jayden |
