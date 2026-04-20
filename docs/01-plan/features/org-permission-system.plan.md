# A.R.C. 조직 기반 권한 시스템 — Plan

> **Feature**: 조직 트리 + 모듈별 데이터 접근 제어
> **Author**: Jayden Song (PM) + Claude (CTO)
> **Date**: 2026-03-24
> **Status**: Draft
> **Depends on**: `docs/00-architecture/spigen-platform-architecture.plan.md` Phase 3

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **문제** | 현재 역할(owner~viewer)만으로는 모듈별/조직별 데이터 접근 제어 불가. Finance 등 민감 데이터 모듈 추가 시 "내 팀 데이터만 보기" 불가능 |
| **해결** | 유연한 조직 트리(org_units) + 모듈별 접근 경계 설정. 5단계 조직(회사-부문-사업부-팀-파트) 지원하되, 모듈마다 데이터 공유 레벨을 다르게 설정 |
| **기능/UX** | Settings > Organization 에서 조직 트리 관리, 모듈별 접근 레벨 설정, 사용자 소속 지정 |
| **핵심 가치** | 모듈이 늘어나도 하나의 조직 구조로 관리. Finance 붙을 때 코드 변경 최소화 |

---

## 1. 현재 상태 (As-Is)

### 1.1 역할 시스템

```
owner(5) > admin(4) > editor(3) > viewer_plus(2) > viewer(1)
```

- `users` 테이블에 `role` 컬럼 하나
- API마다 `withAuth(handler, ['owner', 'admin', 'editor'])` 형태
- 모든 사용자가 같은 데이터를 봄 (역할로 "할 수 있는 것"만 제한)

### 1.2 한계

| 시나리오 | 현재 | 필요 |
|---------|------|------|
| IP 모듈 리포트 | 모든 사용자가 전체 리포트를 봄 | OK (전사 공통) |
| AD 광고 예산 | - | 사업부별로 예산이 다름 → 내 사업부만 |
| Finance 매출 | - | 팀장은 팀, 사업부장은 사업부까지만 |
| OMS 주문 | - | 사업부별 주문 분리 가능성 |

---

## 2. 설계 방향: 유연한 트리 (Option C)

### 2.1 왜 트리인가

| 옵션 | 설명 | 장단점 |
|------|------|--------|
| A) 5단계 고정 테이블 | company, division, business_unit, team, part 각각 테이블 | 정확하지만 5개 테이블, JOIN 복잡 |
| B) 3단계 축소 | company, business_unit, team만 | 실용적이지만 확장 시 스키마 변경 필요 |
| **C) 단일 트리 (org_units)** | **parent_id로 무한 깊이** | **유연, 테이블 1개, 깊이 자유** |

### 2.2 조직 레벨 정의

```
Level 1: 회사 (Company)          — Spigen
Level 2: 부문 (Division)         — iBD, WBD 등
Level 3: 사업부 (Business Unit)  — Smart Electronics 등 (Sub-Division)
Level 4: 부서 (Department)       — Phone Case US, Screen Protector 등
Level 5: 팀 (Team)              — 아마존팀, 자사몰팀
Level 6: 유닛 (Unit)            — Flagship, Budget, Mobile 등
```

> 현재 모든 5단계를 채울 필요 없음. 필요한 만큼만 넣고, 나중에 확장.

### 2.3 모듈별 접근 경계

핵심 아이디어: **조직 트리는 하나인데, 모듈마다 "데이터를 공유하는 단위"가 다르다.**

```
모듈별 access_level 설정:

IP Protection  → access_level: 'company'       → 전사 공통, 조직 무관
AD Optimizer   → access_level: 'business_unit'  → 사업부 내에서만 광고 데이터 공유
OMS            → access_level: 'business_unit'  → 사업부 내에서만 주문 데이터 공유
Finance        → access_level: 'team'           → 팀 내에서만 재무 데이터 공유
```

예시:

```
사용자: 김철수 (소속: 북미사업부 > 아마존팀 > 광고파트)

IP 모듈 접속 → access_level: company → 전사 데이터 전부 보임
AD 모듈 접속 → access_level: business_unit → 북미사업부 데이터만 보임
Finance 접속 → access_level: team → 아마존팀 데이터만 보임
```

---

## 3. DB 스키마

### 3.1 org_units (조직 트리)

```sql
CREATE TABLE public.org_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                    -- '북미사업부'
  level text NOT NULL,                   -- 'company' | 'division' | 'business_unit' | 'team' | 'part'
  parent_id uuid REFERENCES org_units(id) ON DELETE CASCADE,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 루트 노드 (회사)는 parent_id = NULL
-- CHECK: level은 enum 대신 text로 (유연성)
```

### 3.2 user_org_units (사용자 소속)

```sql
CREATE TABLE public.user_org_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_unit_id uuid NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT true,       -- 주 소속 (1개)
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, org_unit_id)
);
```

> 1인 다중 소속 가능 (예: 두 사업부 겸임). `is_primary`로 기본 소속 구분.

### 3.3 module_access_configs (모듈별 접근 설정)

```sql
CREATE TABLE public.module_access_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL UNIQUE,       -- 'ip', 'ads', 'oms', 'finance'
  access_level text NOT NULL DEFAULT 'company',  -- 어느 org level까지 데이터 공유
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- 초기 데이터
INSERT INTO module_access_configs (module_key, access_level, description) VALUES
  ('ip', 'company', 'IP Protection — 전사 공통, 조직 제한 없음'),
  ('ads', 'business_unit', 'AD Optimizer — 사업부 단위 데이터 분리'),
  ('oms', 'business_unit', 'OMS — 사업부 단위 데이터 분리'),
  ('finance', 'team', 'Finance — 팀 단위 데이터 분리');
```

### 3.4 RLS 정책 패턴

```sql
-- 예: ads.campaigns 테이블에 조직 기반 RLS
ALTER TABLE ads.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON ads.campaigns
  FOR SELECT USING (
    -- 해당 캠페인의 org_unit이 사용자의 접근 범위에 포함되는지
    org_unit_id IN (
      SELECT get_accessible_org_units(auth.uid(), 'ads')
    )
  );
```

### 3.5 핵심 함수

```sql
-- 사용자가 특정 모듈에서 접근 가능한 org_unit ID 목록 반환
CREATE OR REPLACE FUNCTION get_accessible_org_units(
  p_user_id uuid,
  p_module_key text
) RETURNS SETOF uuid AS $$
BEGIN
  -- 1. 모듈의 access_level 확인
  -- 2. 사용자의 소속 org_unit 확인
  -- 3. access_level에 해당하는 상위 org_unit의 모든 하위 노드 반환
  -- 예: access_level='business_unit', 사용자 소속='광고파트'
  --     → 광고파트의 상위 사업부('북미사업부') 찾기
  --     → 북미사업부 하위 모든 org_unit ID 반환
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. 기존 시스템과의 관계

### 4.1 역할(Role) vs 조직(Org) — 공존

```
역할 (Role): "무엇을 할 수 있는가" — 기존 유지
  owner  → 전체 관리
  admin  → 모듈 설정 변경
  editor → 데이터 생성/수정
  viewer → 읽기만

조직 (Org): "어디 데이터를 볼 수 있는가" — 신규 추가
  회사 레벨 → 전사 데이터
  사업부 레벨 → 해당 사업부 데이터
  팀 레벨 → 해당 팀 데이터
```

**두 축이 교차:**

| | 전사 데이터 | 사업부 데이터 | 팀 데이터 |
|---|---|---|---|
| **Editor** | 생성/수정 가능 | 생성/수정 가능 | 생성/수정 가능 |
| **Viewer** | 읽기만 | 읽기만 | 읽기만 |

> 역할은 "권한", 조직은 "범위"

### 4.2 IP 모듈 영향 — 없음

IP 모듈은 `access_level: 'company'`이므로:
- 기존 API 변경 없음
- 기존 RLS 변경 없음
- `org_unit_id` 컬럼 추가 불필요
- **IP 시트에 정리한 권한 매트릭스 그대로 유지**

### 4.3 새 모듈 적용 패턴

AD 같은 새 모듈부터:
```
1. 모듈 테이블에 org_unit_id 컬럼 추가
   ads.campaigns → org_unit_id uuid REFERENCES org_units(id)

2. 데이터 생성 시 사용자의 소속 org_unit 자동 할당
   INSERT INTO ads.campaigns (..., org_unit_id) VALUES (..., get_user_primary_org(auth.uid()))

3. RLS로 접근 범위 자동 제한
   FOR SELECT USING (org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads')))
```

---

## 5. Settings UI

### 5.1 Organization 관리 (Owner/Admin만)

```
Settings > Organization
│
├── [Tab 1] 조직 트리 (트리뷰 + 추가/수정/삭제)
│   Spigen Inc.
│   ├── 글로벌사업부문
│   │   ├── 북미사업부
│   │   │   ├── 아마존팀
│   │   │   │   ├── 광고파트
│   │   │   │   └── 운영파트
│   │   │   └── 자사몰팀
│   │   └── 유럽사업부
│   └── 국내사업부문
│
├── [Tab 2] 브랜드 & 마켓 (트리 형태 — 브랜드 > 마켓)
│   Spigen
│   ├── US (amazon.com)          [설정]
│   ├── JP (amazon.co.jp)        [설정]
│   └── DE (amazon.de)           [설정]
│   Legato
│   ├── US (amazon.com)          [설정]
│   └── JP (amazon.co.jp)        [설정]
│   + 브랜드 추가
│   ※ credentials는 환경변수/Vault로 관리, UI에는 계정명만 표시
│
│   브랜드×마켓 접근 권한 (조직별)
│   ┌──────────────┬───────────────┬──────────┐
│   │ 조직         │ 브랜드×마켓   │ 권한     │
│   ├──────────────┼───────────────┼──────────┤
│   │ 북미사업부    │ Spigen US     │ edit     │
│   │ 국내사업부    │ Spigen US     │ view     │
│   │ 북미사업부    │ Legato US     │ edit     │
│   │ 유럽사업부    │ Spigen DE     │ edit     │
│   └──────────────┴───────────────┴──────────┘
│
├── [Tab 3] 모듈 접근 설정
│   IP Protection:  조직 범위 [Company ▼]        브랜드 분리 [ ]
│   AD Optimizer:   조직 범위 [Business Unit ▼]  브랜드 분리 [✓]
│   Listings:       조직 범위 [Business Unit ▼]  브랜드 분리 [✓]
│   Products:       조직 범위 [Business Unit ▼]  브랜드 분리 [✓]
│   Planning:       조직 범위 [Company ▼]        브랜드 분리 [ ]
│   Finance:        조직 범위 [Team ▼]           브랜드 분리 [✓]
│   OMS:            조직 범위 [Business Unit ▼]  브랜드 분리 [✓]
│
└── 사용자 소속 관리 (Settings > Users에서 통합)
    사용자별 소속 org_unit + 담당 브랜드/마켓 + 담당 SKU 지정
```

### 5.2 접근 범위 필요

| 역할 | 조직 트리 | 모듈 접근 설정 | 사용자 소속 |
|------|-----------|---------------|------------|
| Owner | CRUD | 변경 가능 | 변경 가능 |
| Admin | 읽기 | 읽기 | 변경 가능 |
| Editor 이하 | 읽기 | 읽기 | 읽기 (본인만) |

---

## 6. 구현 순서

| 단계 | 작업 | 선행 조건 |
|:--:|------|----------|
| S1 | DB: `org_units`, `user_org_units`, `module_access_configs` 테이블 생성 | - |
| S2 | DB: `brands`, `brand_markets`, `brand_market_permissions` 테이블 생성 | - |
| S3 | DB: `get_accessible_org_units()` + `get_accessible_brand_markets()` 함수 생성 | S1, S2 |
| S4 | DB: 초기 데이터 (Spigen 조직 트리 + 브랜드/마켓 기본 구조) | S1, S2 |
| S5 | API: `/api/settings/org-units` CRUD | S1 |
| S6 | API: `/api/settings/brands` + `/api/settings/brand-markets` CRUD | S2 |
| S7 | API: `/api/settings/module-access` 조회/수정 | S1 |
| S8 | UI: Settings > Organization [Tab 1] 조직 트리 | S5 |
| S9 | UI: Settings > Organization [Tab 2] 브랜드 & 마켓 + 권한 매핑 | S6 |
| S10 | UI: Settings > Organization [Tab 3] 모듈 접근 설정 | S7 |
| S11 | UI: Settings > Users에 소속 org_unit + 담당 브랜드/마켓 추가 | S5, S6 |
| S12 | 공통 라이브러리: `getAccessibleOrgUnits()` + `getAccessibleBrandMarkets()` 헬퍼 | S3 |

> **레이어 3 (SKU 담당)**: Product Library 모듈 개발 시점에 `product_assignments` 테이블 + UI 추가.
> **모듈별 RLS**: AD/OMS/Finance 시작 시 각 모듈 테이블에 `org_unit_id` + `brand_market_id` 컬럼 추가.

---

## 7. IP 모듈 권한 매트릭스 (참조)

Google Sheets: https://docs.google.com/spreadsheets/d/1Z6m2ez4ITpjeQVr4zeLmLFyr-Ac-JyPVxluE3UQEIvY/edit?gid=0#gid=0

- iP 탭: 12개 기능 영역, 73개 액션, 5개 역할별 권한 정리 완료
- AD 탭: 기획 진행 중, 기획 완성 후 채울 예정

---

## 8. 리스크 & 고려사항

| 리스크 | 대응 |
|--------|------|
| 조직 트리 변경 시 기존 데이터 접근 끊김 | 조직 이동 시 하위 데이터도 함께 이동하는 로직 필요 |
| 겸임(다중 소속) 처리 복잡 | `user_org_units`으로 N:N 지원. 데이터 조회 시 UNION |
| 성능 (트리 재귀 쿼리) | `get_accessible_org_units`를 materialized view 또는 캐시로 최적화 가능 |
| IP 모듈 기존 코드 깨짐 | access_level: 'company'이므로 기존 코드 변경 없음 |

---

## 9. 브랜드 × 국가별 분리 요구사항 (2026-03-25 확정)

### 9.1 배경

Spigen Inc. 산하 복수 브랜드 운영:
- **Spigen** — 폰케이스/보호필름
- **Legato** — 골프공
- **화장품 브랜드** (이름 미정)

Amazon 계정이 국가(마켓플레이스)별로 다름. 모듈에 따라 브랜드/국가 분리 수준이 다름.

### 9.2 모듈별 브랜드/국가 분리 정책

| 모듈 | 브랜드 분리 | 국가별 계정 분리 | 비고 |
|------|:---------:|:------------:|------|
| IP | ❌ | ❌ | 전체 통합 운영, 브랜드 구분 불필요 |
| AD | ✅ | ✅ | 브랜드별 광고 예산/캠페인 분리 |
| Listings | ✅ | ✅ | |
| Products | ✅ | ✅ | |
| Planning | ❌ | ❌ | 통합 운영 |
| Finance | ✅ | ✅ | |
| OMS | ✅ | ✅ | 오퍼레이터: 브랜드별 분리 / 매니저: 전체 통합 뷰 (권한으로 해결) |
| Reimbursement | ✅ | ✅ | FBA 분실/파손 케이스, 환급 추적 |

### 9.3 DB 스키마

```sql
-- 브랜드 테이블
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,              -- 'Spigen', 'Legato', etc.
  code text NOT NULL UNIQUE,       -- 'spigen', 'legato'
  description text,                -- '폰케이스/보호필름'
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 브랜드 × 마켓 (Amazon 계정 단위)
CREATE TABLE public.brand_markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id),
  marketplace text NOT NULL,       -- 'US', 'JP', 'DE', etc.
  account_name text,               -- 표시용 (amazon.com 등)
  is_active boolean DEFAULT true,
  -- credentials는 환경변수/Vault로 관리
  UNIQUE(brand_id, marketplace)
);

-- 조직 × 브랜드마켓 권한 (레이어 2 핵심)
CREATE TABLE public.brand_market_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id uuid NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
  brand_market_id uuid NOT NULL REFERENCES brand_markets(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'view',  -- 'edit' | 'view'
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_unit_id, brand_market_id)
);

-- 개인 × SKU 담당 (레이어 3 — Product Library 모듈 이후)
CREATE TABLE public.product_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sku_id uuid NOT NULL,            -- Product Library의 SKU 테이블 참조
  brand_market_id uuid NOT NULL REFERENCES brand_markets(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, sku_id, brand_market_id)
);
```

### 9.4 3-레이어 접근 제어 모델

```
레이어 1: 조직 (org_units)                    → "어느 팀/사업부 소속인가"
  DB: org_units + user_org_units
  적용: module_access_configs.access_level로 조직 범위 결정

레이어 2: 브랜드×마켓 권한 (brand_market_permissions) → "어느 브랜드×국가에 edit/view인가"
  DB: brands + brand_markets + brand_market_permissions
  적용: 조직 단위로 할당 (북미사업부 → Spigen US = edit)

레이어 3: SKU 담당 (product_assignments)       → "마켓 안에서 어느 SKU 담당인가"
  DB: product_assignments
  적용: 개인 단위로 할당, Product Library 모듈 의존
```

**예시: 김철수 (북미사업부 > 아마존팀)**
```
레이어 1: 북미사업부 소속
레이어 2: Spigen US → edit (사업부 레벨로 받음)
레이어 3: SKU-001, SKU-002 담당 → 내 SKU만 필터

→ AD 모듈 접속: 북미사업부 범위 + Spigen US edit + 담당 SKU 광고만
→ IP 모듈 접속: 전사 데이터 전부 (레이어 1 company, 레이어 2/3 불필요)
```

### 9.5 모듈별 레이어 적용

| 모듈 | 레이어 1 (조직) | 레이어 2 (브랜드×마켓) | 레이어 3 (SKU) |
|------|:-:|:-:|:-:|
| IP | company (무제한) | ❌ | ❌ |
| AD | business_unit | ✅ edit/view | ✅ (향후) |
| Listings | business_unit | ✅ edit/view | ✅ (향후) |
| Products | business_unit | ✅ edit/view | ✅ (향후) |
| Planning | company (무제한) | ❌ | ❌ |
| Finance | team | ✅ edit/view | ✅ (향후) |
| OMS | business_unit | ✅ edit/view | ✅ (향후) |
| Reimbursement | business_unit | ✅ edit/view | ✅ (향후) |

---

## 10. 레이어 3: 마켓 × SKU 담당 필터 (향후 — Product Library 모듈)

> 이 섹션은 현재 구현 범위가 아님. 향후 설계 시 참고용으로 기록.

### 10.1 문제

조직 단위(레이어 1)만으로는 부족한 경우가 있다:

```
같은 아마존팀 안에서도:
  SKU-001 (케이스 A) US 마켓 → 김철수 담당
  SKU-001 (케이스 A) DE 마켓 → 이영희 담당
  SKU-002 (필름 B) US 마켓 → 박민수 담당
```

- 같은 SKU라도 **마켓(국가)별로 담당자가 다름**
- Finance에서 "내 담당 SKU의 매출만 보기" 필요
- AD에서 "내 담당 카테고리 광고만 보기" 필요
- OMS에서 "내 담당 SKU 주문만 보기" 필요

### 10.2 필요 구조

```
레이어 1: org_units (조직)     → "어느 팀/사업부 데이터" — 이 Plan 범위
레이어 2: product_assignments  → "어느 마켓의 어느 SKU" — Product Library 모듈에서 설계

product_assignments (
  user_id       → 담당자
  sku_id        → 제품 (Product Library에서 관리)
  marketplace   → 'US' | 'DE' | 'JP' | 'UK' | ...
)
```

### 10.3 의존 관계

```
Product Library 모듈 (먼저 필요)
├── SKU 마스터 데이터
├── 카테고리 분류
├── 마켓플레이스 목록
└── 담당자 매핑 (user × SKU × marketplace)
        ↓
Finance / AD / OMS 에서 레이어 2 필터 적용
```

### 10.4 영향 받는 모듈

| 모듈 | 레이어 1 (org_units) | 레이어 2 (SKU × 마켓) |
|------|---------------------|----------------------|
| IP Protection | company (제한 없음) | 불필요 |
| AD Optimizer | business_unit | 담당 카테고리/SKU 필터 |
| OMS | business_unit | 담당 SKU × 마켓 필터 (마스터 파일 필수) |
| Finance | team | 담당 SKU × 마켓 필터 |
| Listing Mgmt | business_unit | 담당 SKU × 마켓 필터 |
| Product Library | company | 이 모듈이 마스터 데이터 제공 |
| Product Planning | business_unit | 담당 카테고리 필터 |
