# A.R.C. Platform Architecture Summary

> **A.R.C.** = Amazon Resource Controller
> **URL**: arc.spigen.com
> **Tech**: Next.js 15 App Router + TypeScript + Tailwind CSS + Supabase

---

## 모듈 구조 (7개)

| # | 모듈 | 경로 | DB 스키마 | 상태 |
|:--|:--|:--|:--|:--|
| 1 | IP Protection | `/ip/*` | `public` (기존) | ✅ 완료 |
| 2 | **AD Optimizer** | **`/ads/*`** | **`ads`** | **개발 중** |
| 3 | Listing Management | `/listings/*` | `listings` | 예정 |
| 4 | Product Library | `/products/*` | `products` | 예정 |
| 5 | Product Planning | `/planning/*` | `planning` | 예정 |
| 6 | Finance | `/finance/*` | `finance` | 예정 |
| 7 | OMS (물류자동화) | `/oms/*` | `oms` | 예정 |

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

---

## 권한 시스템 (2-Layer)

### 레이어 1: 조직 기반 접근 (org_units)

- `public.org_units` — 트리 구조 (회사 > 부문 > 사업부 > 팀 > 파트)
- `public.module_access_configs` — 모듈별 데이터 공유 레벨 설정
- AD는 `access_level: 'business_unit'` → 사업부 내에서만 광고 데이터 공유
- AD 테이블에 `org_unit_id` 컬럼 필수 → RLS로 접근 범위 자동 제한

### 레이어 2: 마켓 × SKU/카테고리 담당 필터 (Product Library 의존)

- 같은 사업부 내에서도 담당 카테고리/SKU의 광고만 볼 수 있어야 함
- **Product Library 모듈의 마스터 데이터에 의존** (SKU, 카테고리, 마켓플레이스, 담당자 매핑)
- AD 테이블 설계 시 `marketplace` 컬럼을 포함하여 향후 필터링 가능하게 준비

> **참고**: Product Library 모듈이 아직 없으므로, 레이어 2는 나중에 적용.
> AD 테이블 설계 시 `marketplace` 컬럼만 미리 잡아두면 됨.

---

## 자세한 내용

- Full Plan: `docs/01-plan/features/spigen-platform-architecture.plan.md`
- Full Design: `docs/02-design/features/spigen-platform-architecture.design.md`
