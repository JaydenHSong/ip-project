# A.R.C. — Product Library Module Onboarding

> **Module**: Product Library (제품 카탈로그 / 에셋 / ASIN 마스터)
> **Platform**: A.R.C. (Amazon Resource Controller)
> **URL**: arc.spigen.com
> **Role in Platform**: 모든 다른 모듈의 기반 데이터 (Single Source of Truth)

---

## 0. Quick Reference (서버 / Git / 포트)

### Git Repository

| 항목 | 값 |
|---|---|
| **Clone URL** | `https://github.com/JaydenHSong/ip-project.git` |
| **Default branch** | `main` (직접 push 금지 — branch protection 적용) |
| **이 모듈 브랜치 규칙** | `products/{description}` (예: `products/feature-mapping`) |
| **공통 영역 브랜치** | `common/{description}` (PR + PM 리뷰 필수) |
| **PR 대상** | `main` (CODEOWNERS 자동 리뷰어 배정) |

### Production 환경

| 서비스 | URL / 값 | 용도 |
|---|---|---|
| Web | https://arc.spigen.com | 프로덕션 앱 |
| Vercel Project | `arc-ads` (모든 모듈 공유) | 단일 Vercel 프로젝트 |
| DB | njbhqrrdnmiarjjpgqwd.supabase.co | Supabase PostgreSQL |
| Auth | Google OAuth (@spigen.com) | SSO |

### 로컬 개발

| 항목 | 값 |
|---|---|
| 포트 기본값 | `3000` |
| 포트 충돌 시 | `pnpm dev --port 3001` |
| Node 버전 | v20+ |
| 패키지 매니저 | pnpm |
| Turbopack | 기본 활성화 (Next.js 16) |

### 환경변수 (`.env.local`)

- 패키지에 실 값 포함되어 있음 (`arc-products/.env.local`)
- 공개 저장소 / 외부 공유 금지
- 포함 키 카테고리:
  - Supabase (필수): 3개 키
  - Amazon SP-API (필수): 5개 키 (App ID, Client ID/Secret, Refresh token × 3 region)
  - Google OAuth (필수): 2개 키
  - Anthropic AI (선택): 1개
  - 기타 IP/Monday (미사용, 무시 OK)
- 상세 주석: `.env.local` 상단 참조

### PM / 연락처

- **PM**: Jayden Song (jsong@spigen.com)
- **퍼미션 매트릭스**: [Google Sheets](https://docs.google.com/spreadsheets/d/1Z6m2ez4ITpjeQVr4zeLmLFyr-Ac-JyPVxluE3UQEIvY)
- 3-레이어 권한 시스템: `docs/01-plan/features/org-permission-system.plan.md` (원본 repo)

---

## 1. 시작하기

### 1.1 Git Clone

```bash
# 원하는 작업 폴더 위치에서
cd ~/Projects   # 예시
git clone https://github.com/JaydenHSong/ip-project.git arc-products
cd arc-products
```

### 1.2 온보딩 파일 덮어쓰기

이 패키지의 파일들을 클론한 폴더에 복사. 자세한 `cp` 명령은 `QUICK-START.md` §3 참조.

핵심 파일 배치:
- `CLAUDE.md` → 프로젝트 루트 (Claude Code 자동 로드)
- `.env.local` → 프로젝트 루트
- `modules/products/CLAUDE.md` → `src/modules/products/CLAUDE.md`
- `docs/ONBOARDING.md`, `docs/ARCHITECTURE.md`, `docs/BOUNDARIES.md` → `docs/` 내 (기존 docs와 충돌 시 suffix `-products` 붙여 보존)
- `README.md`, `QUICK-START.md` → 프로젝트 루트 (기존 README가 있으면 `ONBOARDING-README.md`로)

### 1.3 설치 & 실행

```bash
pnpm install
pnpm dev                 # 로컬 개발 서버 (http://localhost:3000)
# 포트 충돌 시:
# pnpm dev --port 3001
```

### 1.4 검증

```bash
pnpm typecheck    # 타입 체크 (통과해야 함)
pnpm lint         # 린트 (기존 warning은 무시 OK, error만 해결)
pnpm build        # 빌드 (통과해야 함)
```

### 1.5 Claude Code 세션 시작

```bash
claude            # 프로젝트 루트에서 (CLAUDE.md 자동 로드)
```

첫 명령:
```
/pdca pm product-library
```

→ PM Agent Team이 Discovery + Strategy + Research + PRD 생성
→ `docs/00-pm/product-library.prd.md` 결과 파일

---

## 2. 프로젝트 구조

```
src/
├── app/(protected)/
│   ├── ip/                 ← IP Protection (완료, 건드리지 마세요)
│   ├── ads/                ← AD Optimizer (완료, 건드리지 마세요)
│   ├── products/           ← Product Library (여기서 작업)
│   │   ├── page.tsx                    ← 카탈로그 리스트
│   │   ├── mapping/                    ← ASIN Mapping (MVP 최우선)
│   │   ├── assets/                     ← 에셋 라이브러리
│   │   ├── compat/                     ← 호환성 매트릭스
│   │   └── lifecycle/                  ← 라이프사이클 관리
│   ├── settings/           ← 공통
│   └── ...
│
├── modules/
│   ├── ip/                 ← IP 모듈 (건드리지 마세요)
│   ├── ads/                ← AD 모듈 (건드리지 마세요)
│   ├── products/           ← Product Library (여기서 작업)
│   │   ├── features/                   ← 기능별 폴더
│   │   │   ├── catalog/                ← 카탈로그
│   │   │   ├── mapping/                ← ASIN ↔ SKU mapping
│   │   │   ├── assets/                 ← 에셋 관리
│   │   │   ├── compatibility/          ← 호환성
│   │   │   └── lifecycle/              ← lifecycle 관리
│   │   ├── api/                        ← API clients (Amazon Catalog 등)
│   │   ├── shared/                     ← 모듈 내 공유 컴포넌트
│   │   └── types/                      ← products 전용 타입
│   └── shared/             ← 모듈 간 공유 유틸
│
├── components/ui/          ← 공통 UI 컴포넌트 (재사용)
├── lib/                    ← 공통 라이브러리
└── types/                  ← 공통 타입
```

---

## 3. 절대 규칙

### 모듈 격리 (반드시 지켜야 함)

```
✅ 할 수 있는 것:
  modules/products/ → components/ui/     (공통 UI 사용)
  modules/products/ → lib/auth/          (공통 라이브러리)
  modules/products/ → modules/shared/    (공유 유틸)

❌ 절대 하면 안 되는 것:
  modules/products/ → modules/ip/        (다른 모듈 직접 참조)
  modules/products/ → modules/ads/       (다른 모듈 직접 참조)
  products DB 스키마 → ads/ip 스키마 JOIN (다른 모듈 DB 직접 접근)
  /api/products/* → /api/ads/* 서버 호출  (다른 모듈 API 호출)
```

### Product Library의 특수 역할

> Product Library는 **제공자(provider)** 모듈입니다.
> AD/Listing/Finance/OMS/Reimbursement 등 다른 모듈이 이 모듈의 `products.asin_mapping` 테이블을 참조합니다.
> 따라서 **다른 모듈이 products 스키마를 읽는 것은 허용**되지만, 역방향은 금지.

### 코딩 컨벤션

- `type` 사용 (`interface`/`enum` 금지)
- `any` 금지 → `unknown` + 타입 가드
- `console.log` 금지 (디버깅 후 제거)
- inline styles 금지 (Tailwind)
- Server Components 기본, 필요시에만 `"use client"`
- 절대 경로: `@/components/...`, `@/lib/...`
- 단일 소스 파일 ≤ 250줄

---

## 4. DB 설계 (products 스키마)

### 4.1 핵심 테이블

```sql
-- Product Library 스키마 생성
CREATE SCHEMA IF NOT EXISTS products;

-- 1. 제품 마스터 (Spigen SKU 기준)
CREATE TABLE products.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,                    -- Spigen 내부 SKU (예: ACS01234)
  parent_sku text,                              -- variant 관계
  product_name text NOT NULL,
  brand_id uuid REFERENCES public.brands(id),
  category text,                                -- iPhone Case, Charger, ...
  lifecycle_status text DEFAULT 'active',       -- draft / active / phaseout / eol
  org_unit_id uuid REFERENCES public.org_units(id),  -- 레이어 1 접근 제어
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. ASIN Mapping (SKU ↔ Amazon ASIN × Marketplace) — MVP 최우선
CREATE TABLE products.asin_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products.products(id) ON DELETE CASCADE,
  asin text NOT NULL,
  marketplace text NOT NULL,                    -- US, DE, JP, UK, ...
  is_primary boolean DEFAULT false,             -- 같은 SKU/마켓에 여러 ASIN일 때 주 ASIN
  status text DEFAULT 'active',                 -- active / retired
  brand_market_id uuid REFERENCES public.brand_markets(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (asin, marketplace)
);

-- 3. 에셋 라이브러리
CREATE TABLE products.product_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products.products(id) ON DELETE CASCADE,
  asset_type text NOT NULL,                     -- image / video / aplus / instruction
  url text NOT NULL,                            -- Supabase Storage URL
  display_order int DEFAULT 0,
  locale text,                                  -- 언어별 에셋 (en-US, ja-JP, ...)
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 4. 호환성 매트릭스
CREATE TABLE products.product_compatibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products.products(id) ON DELETE CASCADE,
  compat_type text NOT NULL,                    -- device / accessory / size
  compat_value text NOT NULL,                   -- "iPhone 15 Pro", "MagSafe", ...
  compat_detail jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX idx_asin_mapping_asin ON products.asin_mapping(asin);
CREATE INDEX idx_asin_mapping_product ON products.asin_mapping(product_id);
CREATE INDEX idx_products_org_unit ON products.products(org_unit_id);
CREATE INDEX idx_product_assets_product ON products.product_assets(product_id);
```

### 4.2 권한 관련 필수 컬럼

Product Library 테이블 설계 시 아래 컬럼을 포함할 것:

| 컬럼 | 용도 | 참조 |
|------|------|------|
| `org_unit_id` | 조직 기반 접근 제어 (레이어 1) | `public.org_units(id)` |
| `brand_id` | 브랜드 필터 (Spigen / Legato / Cyrill) | `public.brands(id)` |
| `marketplace` | 마켓플레이스 (asin_mapping) | — |

### 4.3 공통 테이블 접근

- 공통 테이블 (`public.users`, `public.org_units`, `public.brands`, `public.brand_markets`) 읽기 가능
- IP 모듈 테이블 (`public.reports` 등), AD 모듈 테이블 (`ads.*`) 직접 접근 금지
- 필요하면 `modules/shared/` 경유

---

## 5. Amazon API 연동

### 5.1 사용할 API

| API | 용도 | 비고 |
|---|---|---|
| **Catalog Items API** v2022-04-01 | ASIN 조회, 속성 가져오기 | 가장 중요 |
| **Listings Items API** v2021-08-01 | Seller의 리스팅 상세 | SKU ↔ ASIN 매핑 |
| Product Types Definitions | 카테고리별 속성 스키마 | 고급 기능 |
| Feeds API | A+ content upload | Listing 모듈에 가까움 |

### 5.2 공통 클라이언트

- `src/lib/amazon/sp-api/` 에 기본 클라이언트 존재
- 필요 시 `Catalog API` 클라이언트를 이 모듈에서 추가 (`modules/products/api/adapters/amazon-catalog.ts`)
- Rate limiter 패턴은 **AD 모듈의 `modules/ads/api/adapters/amazon-ads-adapter.ts` 참고** (동일 패턴 재사용)

---

## 6. MVP 착수 순서 (Phase 1 — 1주)

Platform Roadmap 2026 시나리오 C에 따라 **MVP는 ASIN mapping만**.

### Week 1 MVP 체크리스트

- [ ] DB 스키마 `products` 생성 + `products.products` + `products.asin_mapping` 테이블
- [ ] `/products` 라우트 생성 (Dashboard + Mapping 탭만)
- [ ] `/products/mapping` 페이지 — ASIN ↔ SKU 매핑 테이블 + 편집
- [ ] `/api/products/mapping` CRUD 라우트
- [ ] Amazon Catalog Items API 클라이언트 (ASIN 조회)
- [ ] Bulk Import (CSV/Excel) — Spigen 기존 SKU 일괄 입력
- [ ] 다른 모듈(AD/IP)이 `products.asin_mapping` 참조할 수 있는 read API 노출

### Week 2~4 (Full Spec 확장)

- Week 2: 카탈로그 페이지 + 변형 관계
- Week 3: 에셋 라이브러리
- Week 4: 호환성 매트릭스 + lifecycle

---

## 7. 배포

```bash
npx vercel              # Preview 배포 (먼저 확인)
npx vercel --prod       # Production 배포 (확인 후)
```

- Preview 없이 바로 `--prod` 금지
- DB 스키마 변경 → Supabase SQL Editor 먼저 → 코드 배포

---

## 8. 사용 가능한 공통 컴포넌트

| 컴포넌트 | 경로 | 용도 |
|:--|:--|:--|
| Button | `@/components/ui/Button` | 버튼 |
| Modal | `@/components/ui/Modal` | 모달 다이얼로그 |
| Card | `@/components/ui/Card` | 카드 컨테이너 |
| Badge | `@/components/ui/Badge` | 상태 배지 |
| SlidePanel | `@/components/ui/SlidePanel` | 사이드 패널 |
| StatusBadge | `@/components/ui/StatusBadge` | 상태별 배지 |
| SortableHeader | `@/components/ui/SortableHeader` | 정렬 가능 테이블 헤더 |
| useInfiniteScroll | `@/hooks/useInfiniteScroll` | 무한 스크롤 |
| useToast | `@/hooks/useToast` | 토스트 알림 |

> AD 모듈에서 만든 `data-table` 패턴도 참고 가능: `src/modules/ads/features/campaigns/components/campaign-table.tsx`

---

## 9. 모듈 접근 제어 (ModuleAccessGate)

Product Library는 **모든 관계자가 읽기 가능**, 편집은 `editor` 이상 권한 필요.

### 9.1 modules.ts 업데이트

```ts
// src/constants/modules.ts — 이미 등록된 products 항목 수정
{
  key: 'products',
  name: 'Product Library',
  icon: 'package',
  path: '/products',
  status: 'active',          // coming_soon → active 로 변경
  // minRole: 전체 viewer 이상 (공통 마스터라 접근 넓게)
  menuItems: [
    { label: 'Catalog', labelKey: 'nav.productsCatalog', path: '/products', icon: 'package' },
    { label: 'ASIN Mapping', labelKey: 'nav.productsMapping', path: '/products/mapping', icon: 'link' },
    { label: 'Assets', labelKey: 'nav.productsAssets', path: '/products/assets', icon: 'image' },
    { label: 'Compatibility', labelKey: 'nav.productsCompat', path: '/products/compat', icon: 'layers' },
    { label: 'Lifecycle', labelKey: 'nav.productsLifecycle', path: '/products/lifecycle', icon: 'activity' },
  ],
},
```

### 9.2 layout.tsx에 Gate 적용 (선택)

Product Library는 모든 사용자 접근 허용이므로 기본적으로 Gate 없이도 OK.
특정 기능(예: 대량 삭제)은 `editor` 이상 API 레벨에서 제한.

---

## 10. 브랜치 전략

```
main                                ← 프로덕션 (직접 push 금지)
├── products/feature-mapping        ← Product Library 작업
├── products/feature-assets         ← Product Library 작업
└── common/update-button            ← 공통 영역 (PR + PM 리뷰 필수)
```

- main에 직접 push 불가 (branch protection)
- PR 제출 → 1명 이상 승인 → merge
- CODEOWNERS 파일로 자동 리뷰어 배정됨
- 상세: `docs/BOUNDARIES.md`

---

## 11. 타 모듈과의 연동

### 11.1 Product Library가 제공하는 데이터

다른 모듈이 참조할 수 있도록 **Read-only API** 제공:

| Endpoint | 용도 | 소비자 |
|---|---|---|
| `GET /api/products/mapping` | ASIN ↔ SKU 조회 | AD, Listing, Finance, OMS |
| `GET /api/products/[id]` | 제품 상세 | 모든 모듈 |
| `GET /api/products/by-asin/[asin]` | ASIN으로 제품 역조회 | AD, Reimbursement |

### 11.2 타 모듈 테이블에서 참조할 컬럼

다른 모듈 테이블 설계 시 `products.products.id` 또는 `products.asin_mapping.id` FK 추가 권장:

```sql
-- 예: AD 모듈의 campaigns 테이블이 Product Library 참조
ALTER TABLE ads.campaigns
  ADD COLUMN product_id uuid REFERENCES products.products(id);
```

> 현재 AD 모듈은 ASIN을 text로만 들고 있어 Product Library 완성 후 마이그레이션 예정.

---

## 12. 퍼미션 매트릭스

Google Sheets에서 모듈별 역할/권한 관리:
https://docs.google.com/spreadsheets/d/1Z6m2ez4ITpjeQVr4zeLmLFyr-Ac-JyPVxluE3UQEIvY

- IP 탭: 참고용
- AD 탭: 완료 참고
- **Products 탭: 이 모듈 기획하면서 채울 것**

---

## 13. 문의

- PM: Jayden Song (jsong@spigen.com)
- 플랫폼 아키텍처: `docs/01-plan/features/spigen-platform-architecture.plan.md`
- **2026 로드맵 (Product Library 맥락)**: `docs/01-plan/features/platform-roadmap-2026.plan.md`
- 권한 시스템: `docs/01-plan/features/org-permission-system.plan.md`
- 안전장치: `docs/BOUNDARIES.md`
