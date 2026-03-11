# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Sentinel (센티널)

아마존 마켓플레이스에서 경쟁사 리스팅의 폴리시 위반을 자동 탐지하고, AI로 신고서를 작성하여 PD(Product Detail) 페이지 신고 + BR(Brand Registry) 케이스 관리를 자동화하는 Spigen 브랜드 보호 플랫폼

## Product Architecture

3개 컴포넌트로 구성:
- **Sentinel Web**: 신고 관리 웹 (Next.js) — 대기열, AI 분석, 승인, 대시보드
- **Sentinel Crawler**: 키워드 캠페인 기반 리스팅 자동 수집 (Playwright)
- **Sentinel Extension**: 오퍼레이터 원클릭 위반 제보 (Chrome Manifest V3, .crx 사내 배포)

## Tech Stack

| 영역 | 기술 |
|------|------|
| Web Frontend + API | Next.js 15 (App Router) + TypeScript + Tailwind CSS |
| Database / Auth / Storage | Supabase (PostgreSQL + Google OAuth + Storage) |
| Crawler + BR 자동화 | Node.js + Playwright |
| Chrome Extension | Manifest V3 |
| AI 분석 엔진 | Anthropic Claude API (Opus: 학습, Sonnet: 드래프트, Haiku: 모니터링) |
| 작업 큐 / 스케줄링 | BullMQ |
| 특허 데이터 동기화 | Monday.com GraphQL API (단방향, 하루 1회) |
| 프록시 | Bright Data / Oxylabs |
| 배포 | Vercel (Web) + AWS/Railway (Crawler) |
| 패키지 매니저 | pnpm |

## Core Pipeline

```
크롤러/익스텐션 수집
  → Claude AI 위반 판단 (이미지 + 텍스트 + 특허)
  → 신고서 드래프트 자동 생성
  → Editor/Admin 승인
  → PD Reporting (Extension이 Product Detail 페이지에서 신고)
  → BR 케이스 제출 (Brand Registry에 케이스 오픈)
  → BR 팔로업 모니터링 (삭제/수정/미해결 감지)
  → 미해결 시 AI 강화 재신고
```

## Auth & RBAC

- Google OAuth (@spigen.com 도메인 한정)
- 가입 즉시 Viewer 배정, Admin이 권한 변경
- 3단계: **Admin** (전체 권한) > **Editor** (신고 작성/승인) > **Viewer** (읽기 전용)

## Key Domain Concepts

- **Campaign**: 키워드 + 기간 + 국가 + 빈도로 등록하는 자동 크롤링 단위
- **Violation (V01~V19)**: 5카테고리 19개 위반 유형 체계
- **Report Lifecycle**: Draft → Review → Approve/Re-write → Submitted → Pending (AI 모니터링) → Done/Re-submitted
- **Patent Registry**: Monday.com에서 동기화하는 Spigen 특허 데이터

## Architecture Patterns

### Supabase Client Types (`src/lib/supabase/`)

4가지 클라이언트 팩토리 — 컨텍스트에 맞는 클라이언트 사용 필수:

| Factory | File | 용도 |
|---------|------|------|
| `createClient()` | `client.ts` | Client Components (브라우저, public key) |
| `createClient()` | `server.ts` | Server Components & API routes (async, cookie 기반) |
| `createAdminClient()` | `admin.ts` | API routes 전용, RLS 우회 (service role key) |
| `createClientFromToken(token)` | `server-token.ts` | Extension API routes (`/api/ext/*`), Bearer token |

- 브라우저/서버 `createClient`는 이름이 같지만 import 경로가 다름
- Admin 클라이언트는 RLS를 우회하므로 API route에서만 사용

### Auth Middleware (`src/lib/auth/`)

- `withAuth(handler, allowedRoles)` — API route 래퍼, cookie + Bearer token 인증 모두 처리
- `withServiceAuth(handler)` — Crawler/Cron routes, 환경변수 토큰 체크
- `getCurrentUser()` — Server Components에서 세션 확인
- `hasRole(user, minimumRole)` — 역할 계층 비교
- 역할 계층: owner(5) > admin(4) > editor(3) > viewer_plus(2) > viewer(1)

### API Route Conventions

모든 API route는 `withAuth()` 또는 `withServiceAuth()`로 래핑:

```typescript
export const GET = withAuth(async (req, { user }) => {
  // user는 DB에서 조회된 사용자 객체
}, ['admin', 'editor'])
```

- **에러 응답**: `{ error: { code: string, message: string, details?: unknown } }`
- **단건 응답**: `{ data: T }` 또는 `{ template: T }`
- **목록 응답**: `{ data: T[], pagination: { page, limit, total, totalPages } }`
- Extension routes (`/api/ext/*`)는 `src/middleware.ts`에서 CORS 처리

### i18n (`src/lib/i18n/`)

- 외부 라이브러리 없는 자체 구현, localStorage 기반 locale (en/ko)
- `createT(locale)` → 타입 안전한 번역 함수 (파라미터 보간 지원)
- 번역 파일: `src/lib/i18n/locales/`

### Violation System

- `src/constants/violations.ts`: V01–V19, 5카테고리 (IP, Listing Content, Review, Selling, Regulatory)
- `SC_VIOLATION_MAP`: V-code → Amazon PD form 값 매핑
- `src/constants/front-report-paths.ts`: V-code → Amazon "Report an issue" 모달 경로 매핑 (16/19 자동화 가능)
- BR Form Types: `other_policy`, `incorrect_variation`, `product_review`, `product_not_as_described`

### Extension Build (`extension/`)

- Vite 빌드 + 커스텀 플러그인:
  - `stripCrossoriginPlugin`: Vite가 추가하는 crossorigin 속성 제거 (Chrome CSP 위반 방지)
  - `buildContentScriptsPlugin`: 4개 content script를 IIFE로 빌드 (`content.ts`, `search-content.ts`, `pd-form-filler.ts`, `br-form-filler.ts`)
- Extension → Web 통신: Bearer token 인증 (`/api/ext/*` 엔드포인트)

## Development Workflow

### Web (Next.js)

```bash
pnpm dev              # 로컬 개발 서버
pnpm typecheck        # TypeScript 타입 체크
pnpm lint             # ESLint
pnpm build            # Production 빌드
pnpm test:e2e         # Playwright E2E 테스트
pnpm test:e2e:ui      # Playwright UI 모드
```

### Extension

```bash
cd extension
pnpm dev              # Vite watch 모드 (개발)
pnpm build            # Production 빌드
pnpm ext:release "변경1|변경2|변경3"  # 릴리스 (빌드→zip→Supabase 업로드→DB 등록)
```

## Deployment (프로덕션 라이브 — 반드시 준수)

사이트가 라이브 운영 중이므로 배포 시 아래 순서를 반드시 따른다.

### 배포 순서

```
1. 로컬 검증 (필수)
   pnpm typecheck && pnpm lint && pnpm build

2. Preview 배포 (확인용)
   npx vercel          ← Production 아님, Preview URL 생성
   → Preview URL에서 기능 확인

3. Production 배포 (확인 후)
   npx vercel --prod   ← 실제 라이브 반영
```

### 규칙

- **Preview 없이 바로 `--prod` 금지** — 반드시 Preview에서 먼저 확인
- **DB 스키마 변경 시** — Supabase SQL Editor에서 먼저 적용 후 코드 배포
- **환경변수 변경 시** — `npx vercel env add` 후 재배포 필요
- **롤백 필요 시** — Vercel 대시보드에서 이전 배포로 즉시 롤백 가능
- **Crawler (Railway)** — 별도 배포, `git push`로 자동 빌드

### 배포 환경

| 컴포넌트 | 플랫폼 | URL |
|---------|--------|-----|
| Web | Vercel | https://ip-project-khaki.vercel.app |
| Crawler | Railway | lovely-magic 프로젝트 |
| DB | Supabase | njbhqrrdnmiarjjpgqwd.supabase.co |

## Coding Conventions

### TypeScript
- `type` 사용, `interface` 자제
- `enum` 절대 금지 → `as const` 객체 또는 문자열 리터럴 유니온 사용
- `any` 사용 금지 → `unknown` 사용 후 타입 가드
- 함수 반환 타입 명시

### Naming
- 컴포넌트: PascalCase (`ReportCard.tsx`)
- 함수/변수: camelCase (`getListingData`)
- 상수: UPPER_SNAKE_CASE (`VIOLATION_TYPES`)
- 타입: PascalCase (`ViolationReport`)
- 파일명: kebab-case (컴포넌트 제외)

### React
- 함수 컴포넌트만 사용 (arrow function)
- Server Components 기본, 필요시에만 `"use client"`
- Props 타입은 컴포넌트 바로 위에 정의

### Imports
- 절대 경로 사용: `@/components/...`, `@/lib/...`
- 외부 → 내부 → 상대 경로 순서

## Version Management

| Component | Current Version | Location |
|-----------|:--------------:|----------|
| Web (Next.js) | 0.9.0-beta | `package.json` |
| Extension | 1.7.2 | `extension/manifest.json`, `extension/package.json` |
| Crawler | - | `crawler/package.json` |

### Extension 버전 규칙 (Semantic Versioning)
- **Major** (X.0.0): 메시지 프로토콜 호환 깨짐, manifest 구조 변경 등 breaking change
- **Minor** (0.X.0): 새 기능 추가, UX 개선, 뷰 추가 등 기능 변경
- **Patch** (0.0.X): 버그 수정, 텍스트 변경, 스타일 미세 조정

### 버전 업데이트 시 변경할 파일
1. `extension/manifest.json` → `"version"`
2. `extension/package.json` → `"version"`
3. 빌드 후 `extension/sentinel-extension/manifest.json` → `"version"`

### Extension 릴리스 절차 (필수)
- **반드시 `pnpm ext:release` 스크립트로 릴리스** — 수동으로 버전만 올리면 DB 미등록으로 설정 페이지에 구버전 표시됨
- 스크립트 동작: 빌드 → zip → Supabase Storage 업로드 → `extension_releases` 테이블 INSERT
- 변경사항 전달: `pnpm ext:release "변경1|변경2|변경3"`

## Restrictions

- console.log 금지 → 디버깅 후 반드시 제거
- inline styles 금지 → Tailwind 사용
- `var` 금지 → `const` 우선, 필요시 `let`
- default export 지양 → named export 사용 (page.tsx 제외)
- 하드코딩된 위반 유형 금지 → `constants/violations.ts`에서 관리
- API 키/시크릿 코드에 직접 작성 금지 → 환경변수 사용
- **스크린샷 캡처 설정 변경 금지** → `extension/src/background/bg-fetch.ts`의 `BOT_WINDOW_*`, `CAPTURE_*`, `MAX_CAPTURE_BYTES` 값은 확정됨. 변경 시 반드시 사용자 확인 필요

## Notification (Stop Moments)

작업 중 아래 상황이 발생하면 터미널 벨을 울려서 사용자에게 알린다:
- 사용자 승인/확인이 필요할 때
- 작업이 완료되었을 때
- 에러가 발생하여 진행이 멈췄을 때
- 긴 작업 (빌드, 배포 등) 이 끝났을 때

벨 울리는 방법: 응답 텍스트에 `\a` (BEL character) 포함 또는 Bash로 `printf '\a'` 실행

## Reference Documents

- `Sentinel_Project_Context.md` — 전체 기획, 결정사항, 위반 유형 체계
- `Sentinel_Spec_Overview.html` — 스펙 시각화 요약
- `docs/Sentinel_Software_Overview.md` — 소프트웨어 전체 기획 기술 정리서 (교육/온보딩용)

## Document Maintenance (필수)

**`docs/Sentinel_Software_Overview.md`는 항상 최신 상태를 유지해야 한다.**

아래 상황 발생 시 반드시 해당 문서를 업데이트한다:
- 새로운 기술 스택 도입 또는 기존 기술 변경
- 새로운 기능 기획 또는 기존 기능 변경
- 아키텍처 변경 (컴포넌트, 파이프라인, 데이터 모델)
- 배포 환경 변경
- 위반 유형 체계 변경
- 기타 프로젝트 구조에 영향을 주는 변경사항

변경 시 해당 문서의 `변경 이력` 섹션에도 날짜와 내용을 기록한다.
