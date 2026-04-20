# A.R.C. Platform Architecture Summary

> **A.R.C.** = Amazon Resource Controller
> **URL**: arc.spigen.com
> **Tech**: Next.js 15 App Router + TypeScript + Tailwind CSS + Supabase

---

## 모듈 구조 (8개 — 최종 계획)

| # | 모듈 | 경로 | DB 스키마 | 상태 |
|:--|:--|:--|:--|:--|
| 1 | IP Protection | `/ip/*` | `public` (기존) | ✅ 완료 |
| 2 | AD Optimizer | `/ads/*` | `ads` | ✅ 완료 |
| 3 | **Product Library** | **`/products/*`** | **`products`** | **이 모듈 — Phase 1** |
| 4 | Reimbursement | `/reimb/*` | `reimb` | Phase 1 (병렬) |
| 5 | Listing Management | `/listings/*` | `listings` | Phase 2 |
| 6 | Finance | `/finance/*` | `finance` | Phase 3 |
| 7 | OMS | `/oms/*` | `oms` | Phase 4 |
| 8 | Product Planning | `/planning/*` | `planning` | Phase 5 |

> 전체 로드맵은 `docs/01-plan/features/platform-roadmap-2026.plan.md` 참조

---

## Product Library의 플랫폼 내 역할

Product Library는 **Single Source of Truth for SKU/ASIN**. 모든 다른 모듈이 이 모듈의 `products.asin_mapping` 테이블을 참조합니다:

```
         ┌──────────────────────────────┐
         │   Product Library (이 모듈)   │
         │   products.asin_mapping       │
         │   products.products           │
         └──────────┬────────────────────┘
                    │ provides ASIN ↔ SKU master
       ┌────────────┼────────────────────┐
       ▼            ▼                    ▼
   AD Optimizer  Listing         Finance / OMS
   (광고 ASIN)   (리스팅 ASIN)   (매출/주문 ASIN)
```

**시사점**: 이 모듈의 스키마 변경은 다른 모듈에 전파됩니다. DB 설계 시 신중히.

---

## 인증

- Google OAuth (@spigen.com 전용)
- SSO — 한 번 로그인으로 모든 모듈 접근
- 역할: owner > admin > editor > viewer_plus > viewer

---

## 핵심 원칙

1. **모듈 격리**: 다른 모듈 코드/DB/API 직접 참조 금지
2. **공유는 shared 경유**: `modules/shared/` 또는 `components/ui/`
3. **Server Components 기본**: `"use client"`는 필요할 때만
4. **DB 스키마 분리**: 모듈별 PostgreSQL 스키마
5. **Provider 예외**: Product Library는 다른 모듈의 provider이므로 **타 모듈이 products 스키마 읽기 허용**. 단, 쓰기는 금지.

---

## 권한 시스템 (2-Layer)

### 레이어 1: 조직 기반 접근 (org_units)

- `public.org_units` — 트리 구조 (회사 > 부문 > 사업부 > 팀 > 파트)
- `public.module_access_configs` — 모듈별 데이터 공유 레벨 설정
- Product Library는 `access_level: 'company'` 권장 (전사 공유 카탈로그)
- 단, 편집 권한은 역할 기반으로 제한 (editor 이상)
- Products 테이블에 `org_unit_id` 컬럼 포함 (소유 사업부 추적용, RLS 필터 아님)

### 레이어 2: 마켓 × SKU/카테고리 담당 필터

- Product Library 자체가 이 레이어의 **구현 주체**입니다.
- `products.asin_mapping.brand_market_id`, `products.products.org_unit_id`를 통해 다른 모듈의 데이터 필터링에 사용됩니다.

---

## 공통 인프라 (이미 완비)

| 모듈 | 경로 | 용도 |
|---|---|---|
| Brand/Market | `public.brands`, `public.brand_markets` | 브랜드 × 마켓 마스터 |
| Org Units | `public.org_units`, `public.user_org_units` | 조직 트리 |
| Auth | `src/lib/auth/` | Google OAuth + RBAC |
| i18n | `src/lib/i18n/` | 영어/한국어 |
| Theme | `src/lib/theme/` | Light/Dark |
| UI | `src/components/ui/` | 공통 컴포넌트 |
| Amazon SP-API | `src/lib/amazon/sp-api/` | 기본 클라이언트 (Orders/Reports) — Catalog API 추가 예정 |
| Supabase | `src/lib/supabase/` | Admin/Client DB 클라이언트 |

---

## 자세한 내용

- Full Plan: `docs/01-plan/features/spigen-platform-architecture.plan.md`
- **2026 Roadmap**: `docs/01-plan/features/platform-roadmap-2026.plan.md`
- Full Design: `docs/02-design/features/spigen-platform-architecture.design.md`
