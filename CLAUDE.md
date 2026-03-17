# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
For detailed architecture, patterns, and domain knowledge, see `docs/CLAUDE-reference.md`.

# Sentinel (센티널)

아마존 마켓플레이스 위반 자동 탐지 + AI 신고서 작성 + PD/BR 케이스 자동화 — Spigen 브랜드 보호 플랫폼

3개 컴포넌트: **Web** (Next.js), **Crawler** (Playwright), **Extension** (Chrome MV3)

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
- Extension 릴리스: `cd extension && pnpm ext:release "변경사항"` (수동 버전 범프 금지)

| 컴포넌트 | 플랫폼 | URL |
|---------|--------|-----|
| Web | Vercel | https://ip-project-khaki.vercel.app |
| Crawler | Railway | lovely-magic 프로젝트 |
| DB | Supabase | njbhqrrdnmiarjjpgqwd.supabase.co |

## Auth & RBAC

- Google OAuth (@spigen.com), 역할 계층: owner(5) > admin(4) > editor(3) > viewer_plus(2) > viewer(1)
- API: `withAuth(handler, roles)`, Extension: `withServiceAuth(handler)`

## Coding Conventions

- `type` 사용 (`interface`/`enum` 금지), `any` 금지 → `unknown` + 타입 가드
- 컴포넌트 PascalCase, 함수 camelCase, 상수 UPPER_SNAKE_CASE, 파일 kebab-case
- Server Components 기본, 필요시에만 `"use client"`
- 절대 경로: `@/components/...`, `@/lib/...`
- named export 사용 (page.tsx 제외)

## Restrictions

- 큐 샤인 없이 코딩 금지
- console.log 금지 (디버깅 후 제거), inline styles 금지 (Tailwind), `var` 금지
- 하드코딩된 위반 유형 금지 → `constants/violations.ts`
- API 키/시크릿 코드 직접 작성 금지 → 환경변수
- **스크린샷 캡처 설정 변경 금지** → `bg-fetch.ts`의 `BOT_WINDOW_*`, `CAPTURE_*`, `MAX_CAPTURE_BYTES` 확정값

## Notification (Stop Moments)

작업 완료, 승인 필요, 에러 발생, 긴 작업 종료 시 → 터미널 벨 (`\a`)

## Version Management

| Component | Version | Location |
|-----------|:-------:|----------|
| Web | 0.9.0-beta | `package.json` |
| Extension | 1.7.2 | `extension/manifest.json`, `extension/package.json` |

## Document Maintenance

`docs/Sentinel_Software_Overview.md`는 기술 스택/기능/아키텍처 변경 시 항상 업데이트한다.
