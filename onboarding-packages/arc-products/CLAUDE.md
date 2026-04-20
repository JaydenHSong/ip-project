# CLAUDE.md

This file provides guidance to Claude Code when working with the A.R.C. platform.

# A.R.C. (Amazon Resource Controller)

Spigen의 아마존 운영 통합 플랫폼 — IP 보호, 광고 최적화, 리스팅 관리, 제품 기획, 재무, 물류

## 현재 작업: Product Library 모듈

이 세션에서는 **Product Library 모듈**을 개발합니다.
- 페이지: `src/app/(protected)/products/*`
- 로직: `src/modules/products/*`
- DB: `products` PostgreSQL 스키마
- 모듈 전용 컨텍스트: `src/modules/products/CLAUDE.md`

Product Library는 **모든 다른 모듈의 기반 데이터**를 제공합니다 (SKU/ASIN master).
AD, Listing, Finance, OMS, Reimbursement가 전부 이 모듈의 ASIN mapping을 참조합니다.

## Tech Stack

Next.js 15 (App Router) + TypeScript + Tailwind CSS + Supabase (PostgreSQL/Auth/Storage) + pnpm

## Development & Deployment

```bash
pnpm dev                # 로컬 개발
pnpm typecheck && pnpm lint && pnpm build  # 필수 검증
npx vercel              # Preview 배포 (먼저 확인)
npx vercel --prod       # Production 배포 (확인 후)
```

- **Preview 없이 바로 `--prod` 금지**
- DB 스키마 변경 → Supabase SQL Editor 먼저 → 코드 배포

| 서비스 | 플랫폼 | URL |
|--------|--------|-----|
| Web | Vercel | https://arc.spigen.com |
| DB | Supabase | njbhqrrdnmiarjjpgqwd.supabase.co |

## Auth & RBAC

- Google OAuth (@spigen.com), 역할: owner(5) > admin(4) > editor(3) > viewer_plus(2) > viewer(1)
- API: `withAuth(handler, roles)`

## Coding Conventions

- `type` 사용 (`interface`/`enum` 금지), `any` 금지 → `unknown` + 타입 가드
- 컴포넌트 PascalCase, 함수 camelCase, 상수 UPPER_SNAKE_CASE, 파일 kebab-case
- Server Components 기본, 필요시에만 `"use client"`
- 절대 경로: `@/components/...`, `@/lib/...`
- named export 사용 (page.tsx 제외)
- **단일 소스 파일 권장 상한: 250줄** — ESLint `max-lines`(공백·주석 제외)와 동일

## Module Isolation (절대 규칙)

**한 모듈의 개발/업데이트/장애가 다른 모듈에 절대 영향을 주면 안 된다.**

```
✅ OK:
  modules/products/ → components/ui/      (공통 UI)
  modules/products/ → lib/auth/           (공통 라이브러리)
  modules/products/ → modules/shared/     (공유 유틸)
  products.* → public.users JOIN          (공통 테이블)
  products.* → public.org_units JOIN      (조직 트리 — 접근 제어용)

❌ NEVER:
  modules/products/ → modules/ip/         (다른 모듈 import)
  modules/products/ → modules/ads/        (다른 모듈 import)
  products.* → public.reports JOIN        (IP 모듈 테이블)
  products.* → ads.campaigns JOIN         (AD 모듈 테이블 직접)
  /api/products/* → /api/ads/* 서버 호출  (다른 모듈 API)
```

**단, 역방향은 OK**: AD/Listing 등이 `products.asin_mapping` 읽는 건 정상 의존 방향입니다. Product Library는 **제공자(provider)** 역할이므로 타 모듈이 의존하는 건 자연스럽습니다.

## Restrictions

- 큐 사인 없이 코딩 금지
- console.log 금지 (디버깅 후 제거), inline styles 금지 (Tailwind), `var` 금지
- 관리자 설정값 하드코딩 금지 → `system_configs` 테이블에서 읽기
- API 키/시크릿 코드 직접 작성 금지 → 환경변수

## Notification

작업 완료, 승인 필요, 에러 발생, 긴 작업 종료 시 → 터미널 벨 (`\a`)

## Architecture Reference

- Platform Plan: `docs/00-architecture/spigen-platform-architecture.plan.md`
- Platform Roadmap 2026: `docs/01-plan/features/platform-roadmap-2026.plan.md`
- Platform Design: `docs/00-architecture/spigen-platform-architecture.design.md`
- Permission System: `docs/01-plan/features/org-permission-system.plan.md`
- Safety Rules: `docs/BOUNDARIES.md`
- Module onboarding: `docs/ONBOARDING.md`
