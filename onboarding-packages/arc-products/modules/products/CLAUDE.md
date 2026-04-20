# Product Library Module — Claude Context

> 이 파일은 Product Library 모듈 작업 시 Claude가 참조하는 컨텍스트입니다.

## Module Info

- **Module**: Product Library (제품 카탈로그 / ASIN 마스터)
- **Path**: `/products/*`
- **DB Schema**: `products`
- **Status**: 개발 시작 (Phase 1, 시나리오 C)
- **Role**: **Provider** — 모든 다른 모듈의 SKU/ASIN Single Source of Truth

## 작업 범위

```
src/app/(protected)/products/     ← 페이지 (라우트)
  ├── page.tsx                     ← 카탈로그 리스트
  ├── mapping/                     ← ASIN Mapping (MVP 최우선)
  ├── assets/                      ← 에셋 라이브러리
  ├── compat/                      ← 호환성 매트릭스
  └── lifecycle/                   ← 라이프사이클 관리

src/modules/products/              ← 비즈니스 로직
  ├── features/
  │   ├── catalog/                 ← 카탈로그 기능
  │   ├── mapping/                 ← ASIN ↔ SKU mapping
  │   ├── assets/                  ← 에셋 관리
  │   ├── compatibility/           ← 호환성
  │   └── lifecycle/               ← 라이프사이클
  ├── api/
  │   └── adapters/
  │       └── amazon-catalog.ts    ← Amazon Catalog API 클라이언트
  ├── shared/                      ← 모듈 내 공유 컴포넌트
  └── types/                       ← products 전용 타입

src/app/api/products/              ← API 라우트
  ├── mapping/                     ← ASIN mapping CRUD
  ├── by-asin/[asin]/              ← ASIN 역조회 (다른 모듈이 호출)
  ├── [id]/                        ← 제품 상세
  └── assets/                      ← 에셋 CRUD
```

## 절대 금지

- `modules/ip/` import 금지
- `modules/ads/` import 금지
- `public.*` IP 테이블 (reports, listings, campaigns 등) 직접 접근 금지
- `ads.*` 테이블 직접 접근 금지
- `/api/ip/*`, `/api/ads/*`, `/api/crawler/*` API 호출 금지

## 사용 가능

- `components/ui/*` — 공통 UI
- `lib/auth/*` — 인증
- `lib/supabase/*` — DB 클라이언트
- `lib/i18n/*` — 다국어
- `lib/amazon/sp-api/*` — Amazon SP-API 기본 클라이언트
- `modules/shared/*` — 공유 유틸
- `public.users` — 사용자 테이블 (읽기)
- `public.system_configs` — 설정 테이블 (읽기)
- `public.org_units` — 조직 트리 (읽기, 접근 제어용)
- `public.user_org_units` — 사용자 소속 (읽기)
- `public.module_access_configs` — 모듈 접근 설정 (읽기)
- `public.brands` — 브랜드 마스터 (읽기)
- `public.brand_markets` — 브랜드 × 마켓 (읽기)

## Provider 역할 (중요)

Product Library는 **다른 모듈이 참조하는 데이터의 주인**입니다. 아래를 신중히:

### 다른 모듈이 읽을 수 있는 것

- `products.products` — 제품 마스터
- `products.asin_mapping` — ASIN ↔ SKU 매핑
- `products.product_assets` — 에셋
- `products.product_compatibility` — 호환성

### Provider 규칙

1. **스키마 변경 전 영향 분석**: `grep -rn "products\.products\|products\.asin_mapping" src/modules/`
2. **Breaking change 금지**: 컬럼 삭제/이름 변경은 deprecation 기간 필수
3. **Read API 공개**: `/api/products/*` GET 엔드포인트는 모든 모듈에서 호출 가능
4. **Write API 제한**: POST/PUT/PATCH/DELETE는 `editor` 이상만
5. **버전 관리**: 응답 구조 바꿀 때 `v2` endpoint 새로 만들기

## 페이지 구성 (Phase 1 MVP → Full)

### Phase 1 MVP (Week 1) — ASIN mapping만

| 페이지 | 경로 | 설명 |
|:--|:--|:--|
| Products Dashboard | `/products` | 간단한 catalog 리스트 (SKU / ASIN / 브랜드) |
| **ASIN Mapping** | `/products/mapping` | **MVP 최우선** — SKU ↔ ASIN × 마켓 매핑 테이블 + CSV 임포트 |

### Phase 1 확장 (Week 2~4) — Full Spec

| 페이지 | 경로 | 설명 |
|:--|:--|:--|
| Product Detail | `/products/[id]` | SKU 상세 + variant 트리 |
| Assets Library | `/products/assets` | 이미지/영상/A+ 에셋 라이브러리 |
| Compatibility | `/products/compat` | 기기 × 제품 호환성 매트릭스 |
| Lifecycle | `/products/lifecycle` | Draft / Active / Phaseout / EOL |

## DB 스키마 (products)

### 주요 테이블

```sql
products.products              -- 제품 마스터 (Spigen SKU 기준)
products.asin_mapping          -- SKU ↔ ASIN × Marketplace
products.product_assets        -- 에셋 라이브러리
products.product_compatibility -- 호환성 매트릭스
```

상세 CREATE 문은 `docs/ONBOARDING.md` §4 참조.

### 권한 필수 컬럼

| 컬럼 | 테이블 | 용도 |
|---|---|---|
| `org_unit_id` | products.products | 조직 기반 접근 제어 (레이어 1) |
| `brand_id` | products.products | 브랜드 필터 (Spigen/Legato/Cyrill) |
| `brand_market_id` | products.asin_mapping | 마켓별 담당자 필터 (레이어 2) |
| `marketplace` | products.asin_mapping | 마켓플레이스 구분 (US/DE/JP...) |

## Amazon API

### 주요 API (이 모듈에서 사용)

- **Catalog Items API v2022-04-01** — ASIN 검색/조회 (가장 중요)
- **Listings Items API v2021-08-01** — Seller 리스팅 상세 (SKU → ASIN 매핑)
- **Product Types Definitions** — 카테고리 스키마 (고급)

### 구현 위치

```
src/modules/products/api/adapters/
  ├── amazon-catalog.ts        ← Catalog Items API (ASIN 조회)
  └── amazon-listings.ts       ← Listings Items API (내 리스팅 조회)
```

### 패턴 참고

AD 모듈의 Amazon Ads API adapter 패턴을 재사용:
- `src/modules/ads/api/adapters/amazon-ads-adapter.ts` (base class)
- `src/modules/ads/api/adapters/amazon-campaigns.ts` (resource)
- Rate limiter + retry + error mapping 로직 공통

## 모듈 등록

`src/constants/modules.ts`에 products 모듈이 이미 등록되어 있음 (`status: 'coming_soon'`).

Phase 1 착수 시:

```ts
{
  key: 'products',
  name: 'Product Library',
  icon: 'package',
  path: '/products',
  status: 'active',              // coming_soon → active 로 변경
  menuItems: [
    { label: 'Catalog', labelKey: 'nav.productsCatalog', path: '/products', icon: 'package' },
    { label: 'ASIN Mapping', labelKey: 'nav.productsMapping', path: '/products/mapping', icon: 'link' },
    { label: 'Assets', labelKey: 'nav.productsAssets', path: '/products/assets', icon: 'image' },
    { label: 'Compatibility', labelKey: 'nav.productsCompat', path: '/products/compat', icon: 'layers' },
    { label: 'Lifecycle', labelKey: 'nav.productsLifecycle', path: '/products/lifecycle', icon: 'activity' },
  ],
},
```

## 개발 순서 권장 (Phase 1 MVP — 1주)

```
1. SQL 스키마 작성 (Supabase SQL Editor)
   ├─ CREATE SCHEMA products;
   ├─ CREATE TABLE products.products (...);
   └─ CREATE TABLE products.asin_mapping (...);

2. 타입 정의 (src/modules/products/types/)

3. Server queries (src/modules/products/features/mapping/queries.ts)
   ├─ getProducts (list)
   ├─ getAsinMappings (list + filter)
   └─ upsertAsinMapping

4. API routes (src/app/api/products/)
   ├─ GET /mapping
   ├─ POST /mapping
   └─ GET /by-asin/[asin] ← 다른 모듈용

5. 페이지 (src/app/(protected)/products/)
   ├─ page.tsx (간단 리스트)
   └─ mapping/page.tsx (테이블 + CSV 임포트)

6. Amazon Catalog API client
   └─ src/modules/products/api/adapters/amazon-catalog.ts

7. Bulk Import UI (CSV upload + 파싱 + 업서트)

8. typecheck + lint + build

9. PR + Preview 배포 + Prod 배포
```

## PDCA 흐름 권장

```bash
/pdca pm product-library         # PM Agent Team 분석 (1회)
/pdca plan product-library       # Plan 문서 작성
/pdca design product-library     # Design (3 옵션 제시 후 선택)
/pdca do product-library --scope mvp   # MVP만 구현
/pdca analyze product-library    # Gap 분석
/pdca iterate product-library    # <90%면 자동 개선
/pdca report product-library     # 완료 보고서
```

## 체크리스트 (Week 1 MVP 완료 조건)

- [ ] `products` 스키마 + `products.products` + `products.asin_mapping` 테이블 생성됨
- [ ] `/products` 라우트 작동 (간단한 리스트)
- [ ] `/products/mapping` CSV bulk import 작동
- [ ] `GET /api/products/mapping` + `GET /api/products/by-asin/[asin]` 작동
- [ ] `src/constants/modules.ts`의 products status: `coming_soon` → `active`
- [ ] `pnpm typecheck && pnpm lint && pnpm build` 통과
- [ ] Preview 배포에서 동작 확인
- [ ] AD 모듈에서 `GET /api/products/by-asin/[asin]` 호출 테스트
