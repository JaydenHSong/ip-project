# products — Module Context

> **Module**: `products` (feature id `products`, display "Product Library")
> **Role**: Provider — 다른 모든 모듈(AD/Listing/Finance/OMS/Reimbursement)의 SKU/ASIN Single Source of Truth
> **Phase**: 1 (Week 1 MVP) — ASIN Mapping
> **Status**: `active` in `src/constants/modules.ts` (2026-04 공개)

## 1. Purpose

Spigen의 SKU ↔ ASIN × Marketplace 매핑 SSOT. 8개 모듈 플랫폼 로드맵의 데이터 기반.

- 자체 UI보다 **타 모듈에 제공하는 데이터 품질**이 더 중요
- Provider API contract (`GET /api/products/by-asin/[asin]`) v1 **shape LOCKED**
- 변경 = /api/products/v2/... 신규 엔드포인트 + 3개월 deprecation

## 2. Folder Structure

```
src/modules/products/
├── CLAUDE.md                    ← 이 파일
├── api/
│   ├── response.ts              ← 공통 응답 헬퍼 (ok/created/badRequest/...)
│   └── adapters/
│       └── amazon-catalog.ts    ← SP-API Catalog Items v2022-04-01
├── features/
│   ├── catalog/
│   │   ├── queries.ts           ← products 테이블 CRUD
│   │   └── components/
│   │       ├── catalog-table.tsx
│   │       └── product-detail-sections.tsx
│   └── mapping/
│       ├── queries.ts           ← asin_mapping CRUD + Provider v1
│       ├── validators.ts        ← Zod schemas
│       ├── csv-parser.ts        ← dry-run + 충돌 감지
│       ├── orchestrator.ts      ← bulk upsert orchestration
│       └── components/
│           ├── mapping-page-shell.tsx    ← Client wrapper (modal states)
│           ├── mapping-table.tsx
│           ├── marketplace-filter.tsx    ← Client (URL mutation)
│           ├── csv-import-drawer.tsx     ← 3-step drawer
│           ├── csv-import/               ← Drawer sub-components
│           ├── quick-add-modal.tsx
│           ├── quick-add-form.tsx
│           ├── quick-add-optional.tsx
│           ├── edit-slide-panel.tsx
│           ├── edit-panel-body.tsx
│           └── audit-timeline.tsx
└── shared/
    ├── types.ts                 ← Product, AsinMapping, ByAsinResponse (LOCKED)
    ├── constants.ts             ← MARKETPLACES, SP_API_REGIONS, CSV_HEADERS
    ├── row-mappers.ts           ← snake_case DB ↔ camelCase TS
    └── client/
        └── api.ts               ← Client-side fetch wrappers
```

## 3. Key Decisions

| 축 | 선택 | 근거 |
|---|---|---|
| Architecture | **Option C Pragmatic** | ads 모듈 패턴 재사용 + 신규 deps 0 + 1주 MVP |
| State Management | Server Components + fetch + 최소 Client | React Query 미도입 (새 deps 금지) |
| CSV Parser | **Server-side dry-run endpoint** | 클라/서버 검증 로직 중복 제거 |
| Audit 구현 | **DB Trigger** | ads 모듈 패턴 재사용 + 앱 코드 실수 무관 기록 |
| Primary 제약 | **Partial UNIQUE** (`WHERE is_primary=true`) | DB level 강제 |
| Rate limiter | `src/lib/rate-limiter.ts` 공통 util | ads에서 이관 → 다른 모듈도 재사용 |
| Catalog enrich | **Future / disabled by default** | 현재 운영 흐름은 Supabase `products` 스키마를 SSOT로 사용 |

## 4. API Contract v1 — 🔒 LOCKED

`ByAsinResponse` shape (`shared/types.ts`):
```typescript
{ sku, productName, brand, category, marketplace, isPrimary, status }
```

- 필드 **추가**: OK (하위 호환)
- 필드 **삭제/이름 변경**: ❌ — `/api/products/v2/by-asin/` 신규 엔드포인트로
- Consumer 모듈(AD/Listing/Finance/OMS): 이 shape에 의존하고 있음. 변경 시 3개월 deprecation 필수.

## 5. DO / DON'T

### ✅ DO
- Supabase 접근: `createAdminClient().schema('products').from('table')` — dot-notation 금지
- Audit 기록: DB trigger에 위임 (app 레이어 audit 코드 작성 금지)
- 타 모듈 참조: `@/modules/products/shared/types`에서 타입 import 가능
- Amazon enrich 활성화 전: `PRODUCTS_AMAZON_ENRICH_ENABLED=true` 설정 + partial update 경로만 사용
- 신규 마켓플레이스 추가: `MARKETPLACES`, `MARKETPLACE_LABELS`, `SP_API_REGIONS`, DB CHECK constraint 4곳 모두 업데이트

### ❌ DON'T
- ❌ `@/modules/ads`, `@/modules/ip` import — Module Isolation (NFR-05)
- ❌ `interface` / `enum` / `any` — type only (NFR-07)
- ❌ 250줄 초과 파일 — 분할 (NFR-06)
- ❌ `ByAsinResponse` 필드 삭제/이름 변경
- ❌ `products.*` 테이블 컬럼 삭제 — 3개월 deprecation 기간 필수
- ❌ CSV `brand_id` 누락 행 자동 생성 — Reject (Q5 정책)
- ❌ 'use client' in route.ts / page.tsx — Server Components 기본

## 6. Feature Flag Rollback

```typescript
// src/constants/modules.ts
{
  key: 'products',
  status: 'coming_soon',  // ← 'active' 되돌리기
  menuItems: [],          // ← 빈 배열로
}
```

1줄 변경 + Vercel 이전 배포 promote.

## 7. Key References

- PRD: `docs/00-pm/products.prd.md`
- Plan: `docs/01-plan/features/products.plan.md`
- Design: `docs/02-design/features/products.design.md`
- API v1 명세: `docs/api-contract-v1.md`
- CSV 템플릿: `docs/csv-template.md` + `public/csv-template/products.csv`
- 마이그레이션: `supabase/sql-migrations/010-products-schema.sql` (applied to `njbhqrrdnmiarjjpgqwd`)
- 검증 스크립트: `tools/scripts/verify-products.sh`

## 8. Supabase Schema Exposure

PostgREST는 기본적으로 `public` 스키마만 노출. `products` 스키마의 테이블에 접근하려면:

1. **Supabase Dashboard → Settings → API → Exposed schemas**에 `products` 추가, OR
2. 코드에서 `.schema('products').from('table_name')` 패턴 사용 (현재 구현)

현재 코드는 (2) 패턴 사용. (1)을 추가하면 dot-notation도 가능.

## 9. Running Verification

```bash
bash tools/scripts/verify-products.sh
```

8 섹션 17개 자동 체크 (Module Isolation, Type Safety, File Size, Client/Server Boundary, Provider v1 Fields, DB Migration, Feature Flag, API Contract docs).
