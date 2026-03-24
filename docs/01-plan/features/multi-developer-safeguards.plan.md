# Multi-Developer Safeguards Planning Document

> **Summary**: A.R.C. 플랫폼에서 여러 개발자가 동시에 모듈을 개발할 때 공통 영역 충돌을 방지하는 안전장치 체계
>
> **Project**: Sentinel (A.R.C. Platform)
> **Version**: 0.9.0-beta
> **Author**: CTO Lead (Claude)
> **Date**: 2026-03-23
> **Status**: Draft

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **문제** | 같은 repo에서 여러 개발자가 각자 모듈을 개발하면, 공통 영역(UI, Auth, DB) 수정 시 서로의 코드를 파괴할 수 있음 |
| **해결** | 모듈 경계 자동 감지(ESLint) + 공통 영역 보호(CODEOWNERS + PR 필수) + 브랜치 전략(모듈별 prefix) |
| **기능/UX 효과** | 개발자는 자기 모듈 폴더 안에서 자유롭게 작업, 공통 영역 건드리면 자동으로 리뷰 요청이 감 |
| **핵심 가치** | "자유롭게 개발하되, 남의 것은 안 부순다" -- 소규모 팀에서 실현 가능한 최소 안전망 |

---

## 1. 구체적 사고 시나리오

### 1.1 공통 UI 컴포넌트 파괴

**시나리오**: AD 모듈 개발자가 `DataTable.tsx`에 AD 전용 기능을 추가하면서 기존 props 구조를 변경. IP 모듈의 모든 테이블이 깨짐.

**현재 위험 파일들** (23개 공통 UI 컴포넌트):
```
src/components/ui/DataTable.tsx    -- 모든 모듈이 사용
src/components/ui/Modal.tsx        -- 모든 모듈이 사용
src/components/ui/Badge.tsx        -- 모든 모듈이 사용
src/components/ui/SlidePanel.tsx   -- 모든 모듈이 사용
src/components/ui/TableFilters.tsx -- 모든 모듈이 사용
... (18개 더)
```

**피해 범위**: IP 모듈 전체 페이지 (Dashboard, Campaigns, Reports, Patents, Notices)

**안전장치**:
- ESLint 규칙: `components/ui/` 파일 수정 시 warning
- CODEOWNERS: `components/ui/` 변경은 PM(Jayden) 승인 필수
- 공통 컴포넌트 수정 대신 → 모듈 전용 wrapper 작성 권장

---

### 1.2 인증/미들웨어 파괴

**시나리오**: 새 모듈 개발자가 `withAuth()` 미들웨어에 모듈별 권한 체크를 추가하면서 기존 Role 체크 로직이 변경됨. 모든 API가 403 에러 반환.

**현재 위험 파일들**:
```
src/lib/auth/middleware.ts         -- 모든 API가 의존
src/lib/auth/session.ts            -- 세션 관리
src/lib/auth/dual-middleware.ts    -- Extension + Web 인증
src/lib/auth/service-middleware.ts -- Crawler 인증
src/lib/supabase/server.ts        -- DB 클라이언트
src/lib/supabase/admin.ts         -- Admin 클라이언트
```

**피해 범위**: 전체 앱 (모든 API + 모든 페이지)

**안전장치**:
- CODEOWNERS: `lib/auth/`, `lib/supabase/` 변경은 반드시 리뷰
- 모듈별 권한 추가는 `lib/auth/module-access.ts` (새 파일)에만 작성
- 기존 `withAuth()`는 수정 금지, 확장은 새 wrapper로

---

### 1.3 공통 타입 변경으로 타입 에러 폭발

**시나리오**: 개발자가 `types/users.ts`의 `User` 타입에 필드를 추가하면서 optional을 빠뜨림. 기존 코드에서 타입 에러 수십 개 발생.

**현재 위험 파일들**:
```
src/types/users.ts       -- User, Role 타입 (모든 모듈 의존)
src/types/api.ts         -- API 응답 타입
src/types/table.ts       -- 테이블 공통 타입
```

**안전장치**:
- 공통 타입은 기존 필드 삭제/변경 금지, 추가만 허용 (optional로)
- `pnpm typecheck`이 CI에서 통과해야 merge 가능
- 모듈 전용 타입은 `modules/{module}/types/`에 생성

---

### 1.4 DB 스키마 충돌

**시나리오**: 두 개발자가 각각 다른 모듈에서 같은 이름의 테이블을 만들거나, 공통 테이블(users, system_configs)에 컬럼을 추가하면서 충돌.

**안전장치**:
- 모듈별 PostgreSQL Schema 분리 (design 문서에 이미 계획됨)
  - IP: `public` 스키마 (기존)
  - AD: `ads` 스키마
  - 각 모듈 개발자는 자기 스키마에서만 작업
- 공통 테이블(`users`, `system_configs`, `teams`) 변경은 PM 승인 필수
- DB 변경은 반드시 `docs/db-changes/` 에 SQL 파일 기록 후 리뷰

---

### 1.5 constants/modules.ts 동시 수정

**시나리오**: 두 모듈 개발자가 각각 `MODULES` 배열에 자기 모듈 설정을 추가. Git merge 시 충돌.

**안전장치**:
- `constants/modules.ts` 수정은 PM만 (CODEOWNERS)
- 새 모듈 등록 요청은 PR comment로 PM에게 요청 → PM이 추가

---

### 1.6 환경변수 충돌

**시나리오**: AD 모듈 개발자가 Vercel에 환경변수를 추가하면서 기존 변수를 실수로 삭제하거나 덮어씀.

**안전장치**:
- 환경변수 추가/변경 시 반드시 `.env.example` 업데이트 + PR
- Vercel 환경변수는 PM만 관리 (개발자는 요청)
- 모듈별 prefix: `IP_*`, `ADS_*`, `FINANCE_*`

---

### 1.7 layout.tsx / middleware.ts 파괴

**시나리오**: 모듈 개발자가 `(protected)/layout.tsx` (전체 앱 레이아웃)를 수정하면서 사이드바, 인증 플로우가 깨짐.

**안전장치**:
- `app/(protected)/layout.tsx` 변경은 PM 승인 필수
- 각 모듈은 `app/(protected)/{module}/layout.tsx` (모듈 레이아웃)에서만 수정
- root `middleware.ts` 변경 금지 (확장 필요시 PM과 협의)

---

### 1.8 배포 사고 (Vercel)

**시나리오**: 개발자가 main에 직접 push → 자동 배포 → 버그가 프로덕션에 나감.

**안전장치**:
- main 브랜치 보호: 직접 push 금지 → PR만 허용
- PR merge 전 필수 체크: `typecheck` + `lint` + `build` 통과
- Preview 배포 확인 후에만 main merge

---

## 2. Git 워크플로우

### 2.1 브랜치 전략

```
main (보호됨 -- 직접 push 금지)
 |
 ├── ip/feature-name        ← IP 모듈 개발자
 ├── ip/fix-report-table
 |
 ├── ads/feature-name       ← AD 모듈 개발자
 ├── ads/dashboard-chart
 |
 ├── shared/fix-datatable   ← 공통 영역 (PM 승인 필수)
 ├── shared/add-new-module
 |
 └── fix/hotfix-name        ← 긴급 수정
```

**규칙**:
| 브랜치 prefix | 누가 만드는가 | 어디를 수정하는가 | 머지 조건 |
|:--|:--|:--|:--|
| `ip/*` | IP 개발자 | `app/(protected)/ip/`, `modules/ip/`, `app/api/ip/` | CI 통과 + 1 리뷰 |
| `ads/*` | AD 개발자 | `app/(protected)/ads/`, `modules/ads/`, `app/api/ads/` | CI 통과 + 1 리뷰 |
| `shared/*` | 누구든 | `components/ui/`, `lib/auth/`, `lib/supabase/`, `constants/`, `types/` | CI 통과 + **PM 승인** |
| `fix/*` | 누구든 | 어디든 | CI 통과 + PM 승인 |

### 2.2 PR 규칙

1. **타이틀 형식**: `[IP] 기능명` / `[ADS] 기능명` / `[SHARED] 기능명`
2. **자동 라벨**: 수정 경로에 따라 `module:ip`, `module:ads`, `shared` 라벨 자동 부착
3. **머지 방식**: Squash merge (커밋 히스토리 깔끔하게)
4. **리뷰어 자동 배정**: CODEOWNERS 파일 기반

### 2.3 CODEOWNERS 파일

```
# .github/CODEOWNERS

# 공통 영역 -- PM(Jayden) 승인 필수
/src/components/ui/                @jaydensong
/src/lib/auth/                     @jaydensong
/src/lib/supabase/                 @jaydensong
/src/constants/modules.ts          @jaydensong
/src/types/users.ts                @jaydensong
/src/types/api.ts                  @jaydensong
/src/app/(protected)/layout.tsx    @jaydensong
/src/middleware.ts                 @jaydensong
/CLAUDE.md                        @jaydensong
/.env.example                     @jaydensong

# 모듈별 -- 해당 모듈 개발자가 리뷰어
/src/app/(protected)/ip/           @ip-developer
/src/modules/ip/                   @ip-developer
/src/app/api/ip/                   @ip-developer

/src/app/(protected)/ads/          @ads-developer
/src/modules/ads/                  @ads-developer
/src/app/api/ads/                  @ads-developer
```

---

## 3. 자동화

### 3.1 ESLint 커스텀 규칙 — 모듈 격리 감지

**파일**: `eslint-rules/no-cross-module-import.js`

기능:
- `modules/ip/` 안에서 `modules/ads/`를 import하면 에러
- `modules/ads/` 안에서 `modules/ip/`를 import하면 에러
- `modules/*/` 안에서 `components/ui/`는 import 허용 (공통이니까)
- `app/(protected)/ip/` 안에서 `modules/ads/`를 import하면 에러

```javascript
// eslint-rules/no-cross-module-import.js (개념)
// import 경로에서 모듈 추출 → 현재 파일의 모듈과 비교 → 다르면 에러
```

ESLint 설정에 추가할 규칙:
```javascript
// eslint.config.mjs 추가
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        // IP 모듈 파일에서 AD 모듈 import 금지 (그 반대도)
        { group: ['@/modules/ip/*'], message: 'AD 모듈에서 IP 모듈 import 금지' },
        { group: ['@/modules/ads/*'], message: 'IP 모듈에서 AD 모듈 import 금지' },
      ]
    }]
  }
}
```

### 3.2 Pre-commit Hook (husky + lint-staged)

```bash
# 설치
pnpm add -D husky lint-staged

# .husky/pre-commit
pnpm lint-staged
```

```json
// package.json 추가
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": [
      "eslint --fix",
      "tsc-files --noEmit"
    ]
  }
}
```

### 3.3 GitHub Actions CI

```yaml
# .github/workflows/pr-check.yml
name: PR Check
on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm build

  # 공통 영역 수정 감지
  shared-area-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check shared area changes
        uses: dorny/paths-filter@v3
        id: changes
        with:
          filters: |
            shared:
              - 'src/components/ui/**'
              - 'src/lib/auth/**'
              - 'src/lib/supabase/**'
              - 'src/constants/modules.ts'
              - 'src/types/users.ts'
              - 'src/types/api.ts'
      - name: Warn on shared changes
        if: steps.changes.outputs.shared == 'true'
        run: |
          echo "::warning::이 PR은 공통 영역을 수정합니다. PM 승인이 필요합니다."
          gh pr comment ${{ github.event.pull_request.number }} \
            --body "공통 영역 변경 감지: PM 리뷰가 필요합니다."
```

### 3.4 GitHub Branch Protection (main)

| 설정 | 값 |
|:--|:--|
| Require pull request | Yes |
| Required approvals | 1 |
| Require status checks | typecheck, lint, build |
| Require branches up to date | Yes |
| Allow force push | No |
| Allow deletions | No |

---

## 4. CLAUDE.md에 추가할 규칙

```markdown
## Multi-Module Development Rules

### Module Boundaries (모듈 경계)
- 각 모듈 개발자는 자기 영역에서만 작업:
  - 페이지: `src/app/(protected)/{module}/`
  - 로직: `src/modules/{module}/`
  - API: `src/app/api/{module}/` (IP는 기존 구조 유지)
  - 타입: `src/modules/{module}/types/`

### Forbidden (금지 사항)
- 다른 모듈 폴더 import 금지 (`modules/ip/` <-> `modules/ads/`)
- 다른 모듈 DB 스키마 직접 조회 금지
- 공통 영역 직접 수정 금지 → `shared/*` 브랜치로 PR

### Shared Area (공통 영역 — 수정 시 PM 승인 필수)
- `src/components/ui/*` — 공통 UI 컴포넌트
- `src/lib/auth/*` — 인증/미들웨어
- `src/lib/supabase/*` — DB 클라이언트
- `src/constants/modules.ts` — 모듈 정의
- `src/types/users.ts`, `src/types/api.ts` — 공통 타입
- `src/app/(protected)/layout.tsx` — 앱 레이아웃

### Branch Naming
- `{module}/feature-name` — 모듈 작업 (ip/*, ads/*, ...)
- `shared/feature-name` — 공통 영역 (PM 승인 필수)
- `fix/hotfix-name` — 긴급 수정

### PR Rules
- 타이틀: `[IP] 설명` / `[ADS] 설명` / `[SHARED] 설명`
- main 직접 push 금지
- `pnpm typecheck && pnpm lint && pnpm build` 통과 필수

### Environment Variables
- 모듈별 prefix 사용: `IP_*`, `ADS_*`, `FINANCE_*`
- `.env.example` 업데이트 필수
- Vercel 환경변수 추가는 PM에게 요청

### DB Changes
- 모듈 전용 테이블 → 자기 스키마에서 생성 (ads.*, finance.* 등)
- 공통 테이블 변경 → PM 승인 필수
- SQL 파일은 `docs/db-changes/{module}/` 에 기록
```

---

## 5. 온보딩 패키지에 포함할 파일

### 5.1 파일 목록

| 파일 | 설명 | 생성 시점 |
|:--|:--|:--|
| `onboarding/{module}/README.md` | 모듈별 온보딩 가이드 (목적, 시작 방법) | 모듈 시작 전 |
| `onboarding/{module}/CLAUDE.md` | 모듈별 Claude Code 지시사항 | 모듈 시작 전 |
| `onboarding/{module}/BOUNDARIES.md` | 건드려도 되는 곳 / 안 되는 곳 목록 | 모듈 시작 전 |
| `.github/CODEOWNERS` | 파일별 리뷰어 자동 배정 | 즉시 |
| `.github/workflows/pr-check.yml` | CI 자동 검증 | 즉시 |
| `.github/pull_request_template.md` | PR 작성 가이드 | 즉시 |
| `.husky/pre-commit` | 로컬 lint + typecheck | 즉시 |
| `eslint-rules/no-cross-module-import.js` | 모듈 간 import 차단 | 즉시 |
| `.env.example` | 환경변수 목록 (모듈별 prefix 포함) | 유지/업데이트 |

### 5.2 모듈별 CLAUDE.md 예시 (AD 모듈)

```markdown
# AD Optimizer Module — CLAUDE.md

## My Territory (내 영역)
- 페이지: `src/app/(protected)/ads/`
- 로직: `src/modules/ads/`
- API: `src/app/api/ads/`
- DB: `ads` 스키마

## Off Limits (건드리면 안 되는 곳)
- `src/components/ui/*` — 공통 UI (수정 필요시 shared/* 브랜치로 PR)
- `src/lib/auth/*` — 인증
- `src/lib/supabase/*` — DB 클라이언트
- `src/modules/ip/*` — IP 모듈 (import도 금지)
- `src/app/(protected)/layout.tsx` — 앱 레이아웃

## Can Use (사용 가능)
- `src/components/ui/*` — import해서 사용 OK (수정은 안 됨)
- `src/lib/utils/*` — 유틸리티 함수
- `src/modules/shared/*` — 공유 모듈 (Amazon API 등)
- `src/constants/modules.ts` — 읽기만 (수정은 PM에게 요청)

## Branch
- `ads/feature-name` 브랜치에서 작업
- 공통 수정 필요시 → `shared/feature-name` 별도 PR

## DB
- `ads` 스키마에서만 작업
- 테이블명: `ads.campaigns`, `ads.keywords`, ...
- `public.users` 조회는 OK (수정 금지)
```

### 5.3 BOUNDARIES.md 예시

```
== AD 모듈 개발자 경계 ==

초록 (자유롭게 수정) :
  src/app/(protected)/ads/**
  src/modules/ads/**
  src/app/api/ads/**

노랑 (사용은 OK, 수정은 PR) :
  src/components/ui/**          → shared/* 브랜치로 PR
  src/lib/utils/**              → shared/* 브랜치로 PR
  src/modules/shared/**         → shared/* 브랜치로 PR

빨강 (절대 금지) :
  src/modules/ip/**             → IP 모듈 영역
  src/app/(protected)/ip/**     → IP 페이지
  src/app/api/reports/**        → IP API (기존)
  src/app/api/campaigns/**      → IP API (기존)
  src/lib/auth/middleware.ts    → 인증 코어
  src/lib/supabase/server.ts    → DB 코어
```

### 5.4 PR Template

```markdown
<!-- .github/pull_request_template.md -->

## 모듈
- [ ] IP
- [ ] ADS
- [ ] SHARED (공통 영역 — PM 승인 필수)
- [ ] FIX

## 변경 내용


## 공통 영역 수정 여부
- [ ] components/ui/ 수정함
- [ ] lib/auth/ 수정함
- [ ] lib/supabase/ 수정함
- [ ] constants/modules.ts 수정함
- [ ] 공통 타입 수정함
- [ ] 위 해당 없음

## 체크리스트
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm lint` 통과
- [ ] `pnpm build` 통과
- [ ] 다른 모듈 import 없음
- [ ] 환경변수 추가 시 `.env.example` 업데이트
```

---

## 6. 우선순위별 실행 순서

### Phase 1 — 즉시 (개발자 합류 전)
1. GitHub main 브랜치 보호 설정
2. `.github/CODEOWNERS` 생성
3. `.github/workflows/pr-check.yml` 생성
4. `.github/pull_request_template.md` 생성
5. CLAUDE.md에 Multi-Module Rules 추가

### Phase 2 — 첫 모듈 개발자 합류 시
1. 해당 모듈 온보딩 패키지 생성 (README, CLAUDE.md, BOUNDARIES.md)
2. DB 스키마 생성 (`CREATE SCHEMA ads`)
3. ESLint cross-module import 규칙 추가
4. husky + lint-staged 설치

### Phase 3 — 운영 안정화 (2~3주 후)
1. 자동 라벨링 GitHub Action 추가
2. 공통 영역 변경 자동 comment bot
3. 모듈별 E2E 테스트 분리

---

## 7. 비용 대비 효과

| 안전장치 | 구현 난이도 | 사고 방지 효과 | 우선순위 |
|:--|:--|:--|:--|
| Branch Protection (main) | 5분 (GitHub UI) | 배포 사고 방지 | 1순위 |
| CODEOWNERS | 10분 (파일 1개) | 공통 영역 무단 수정 방지 | 1순위 |
| PR Template | 5분 (파일 1개) | 공통 수정 누락 방지 | 1순위 |
| CI (typecheck + lint + build) | 30분 (GitHub Actions) | 빌드 깨짐 방지 | 1순위 |
| CLAUDE.md 규칙 추가 | 10분 | Claude Code가 규칙 준수 | 1순위 |
| 모듈별 CLAUDE.md | 모듈당 15분 | Claude Code 모듈 격리 | 2순위 |
| ESLint cross-module 규칙 | 1시간 | import 격리 자동화 | 2순위 |
| husky pre-commit | 15분 | 로컬에서 에러 잡기 | 2순위 |
| DB 스키마 분리 | 30분 | DB 충돌 방지 | 2순위 |
| 자동 라벨/comment bot | 2시간 | 리뷰 편의 | 3순위 |

---

## 8. 핵심 원칙 (한 줄 요약)

> **"자기 폴더 안에서는 자유, 밖으로 나가면 PR"**

- 모듈 개발자: `modules/{my-module}/` + `app/(protected)/{my-module}/` = 내 영역
- 공통 영역: 수정하려면 `shared/*` 브랜치 + PM 승인
- CI가 지키는 것: 빌드 깨짐, 타입 에러
- CODEOWNERS가 지키는 것: 공통 영역 무단 수정
- ESLint가 지키는 것: 모듈 간 import 격리
