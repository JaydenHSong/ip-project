# Sentinel (센티널)

아마존 마켓플레이스에서 경쟁사 리스팅의 폴리시 위반을 자동 탐지하고, AI로 신고서를 작성하여 Seller Central에 자동 신고하는 Spigen 브랜드 보호 플랫폼

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
| Crawler + SC 자동화 | Node.js + Playwright |
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
  → Seller Central 자동 신고
  → 팔로업 모니터링 (삭제/수정/미해결 감지)
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

## Development Workflow

1. 변경 사항 작성
2. 타입체크: `pnpm typecheck`
3. 린트: `pnpm lint`
4. 테스트: `pnpm test`
5. 빌드: `pnpm build`

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

## Project Structure

```
src/
  app/                    # Next.js App Router
    (auth)/               # 인증 관련 라우트 그룹
    api/                  # API Routes
      campaigns/          # 캠페인 CRUD
      reports/            # 신고 관리
      listings/           # 리스팅 데이터
      patents/            # 특허 레지스트리
      ai/                 # Claude API 분석 호출
    dashboard/            # 대시보드
    campaigns/            # 캠페인 관리 페이지
    reports/              # 신고 관리 페이지
    settings/             # 설정 (사용자, 권한, 위반유형)
  components/
    ui/                   # 기본 UI (Button, Input, Modal, Badge)
    features/             # 비즈니스 컴포넌트 (ReportCard, CampaignForm 등)
    layout/               # Header, Sidebar, Navigation
  lib/                    # 유틸리티, 헬퍼
    supabase/             # Supabase 클라이언트 설정
    ai/                   # Claude API 호출 로직
  hooks/                  # Custom React Hooks
  types/                  # TypeScript 타입 (violations, reports, campaigns 등)
  services/               # 외부 API 클라이언트
  constants/              # 위반 유형 목록, 금지 키워드 등 상수

crawler/                  # Sentinel Crawler (별도 패키지)
  src/
    scraper/              # 아마존 페이지 스크래핑 로직
    anti-bot/             # 프록시, Fingerprint, 행동 모방
    scheduler/            # BullMQ 스케줄러
    follow-up/            # 팔로업 재방문 로직

extension/                # Sentinel Extension (Chrome Extension)
  src/
    content/              # Content Script (DOM 파싱)
    popup/                # 위반 신고 UI
    background/           # Service Worker
```

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
| Extension | 1.5.0 | `extension/manifest.json`, `extension/package.json` |
| Crawler | - | `crawler/package.json` |

### Extension 버전 규칙 (Semantic Versioning)
- **Major** (X.0.0): 메시지 프로토콜 호환 깨짐, manifest 구조 변경 등 breaking change
- **Minor** (0.X.0): 새 기능 추가, UX 개선, 뷰 추가 등 기능 변경
- **Patch** (0.0.X): 버그 수정, 텍스트 변경, 스타일 미세 조정

### 버전 업데이트 시 변경할 파일
1. `extension/manifest.json` → `"version"`
2. `extension/package.json` → `"version"`
3. 빌드 후 `extension/sentinel-extension/manifest.json` → `"version"`

## Restrictions

- console.log 금지 → 디버깅 후 반드시 제거
- inline styles 금지 → Tailwind 사용
- `var` 금지 → `const` 우선, 필요시 `let`
- default export 지양 → named export 사용 (page.tsx 제외)
- 하드코딩된 위반 유형 금지 → `constants/violations.ts`에서 관리
- API 키/시크릿 코드에 직접 작성 금지 → 환경변수 사용

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
