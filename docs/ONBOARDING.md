# A.R.C. — AD Optimizer Module Onboarding

> **Module**: AD Optimizer (광고 최적화)
> **Platform**: A.R.C. (Amazon Resource Controller)
> **URL**: arc.spigen.com

---

## 1. 시작하기

### 1.1 Git Clone

```bash
git clone https://github.com/JaydenHSong/ip-project.git arc-ads
cd arc-ads
```

### 1.2 온보딩 파일 덮어쓰기

이 패키지의 파일들을 클론한 폴더에 복사:
- `CLAUDE.md` → 프로젝트 루트에 덮어쓰기
- `.env.local` → 프로젝트 루트에 복사
- `modules/ads/CLAUDE.md` → `src/modules/ads/CLAUDE.md`로 복사
- `docs/*.md` → `docs/`에 복사

### 1.3 설치 & 실행

```bash
pnpm install
pnpm dev          # 로컬 개발 서버 (http://localhost:3000)
```

### 1.4 검증

```bash
pnpm typecheck    # 타입 체크
pnpm lint         # 린트
pnpm build        # 빌드
```

---

## 2. 프로젝트 구조

```
src/
├── app/(protected)/
│   ├── ip/              ← IP Protection (완료, 건드리지 마세요)
│   ├── ads/             ← AD Optimizer (여기서 작업)
│   │   ├── dashboard/
│   │   ├── campaigns/
│   │   ├── optimization/
│   │   ├── autopilot/
│   │   └── reports/
│   ├── settings/        ← 공통
│   └── ...
│
├── modules/
│   ├── ip/              ← IP 모듈 로직 (건드리지 마세요)
│   ├── ads/             ← AD 모듈 로직 (여기서 작업)
│   │   ├── components/
│   │   ├── lib/
│   │   ├── types/
│   │   └── constants/
│   └── shared/          ← 모듈 간 공유 유틸
│
├── components/ui/       ← 공통 UI 컴포넌트 (재사용)
├── lib/                 ← 공통 라이브러리
└── types/               ← 공통 타입
```

---

## 3. 절대 규칙

### 모듈 격리 (반드시 지켜야 함)

```
✅ 할 수 있는 것:
  modules/ads/ → components/ui/     (공통 UI 사용)
  modules/ads/ → lib/auth/          (공통 라이브러리)
  modules/ads/ → modules/shared/    (공유 유틸)

❌ 절대 하면 안 되는 것:
  modules/ads/ → modules/ip/        (다른 모듈 직접 참조)
  ads DB 스키마 → ip DB 스키마 JOIN  (다른 모듈 DB 직접 접근)
  /api/ads/* → /api/ip/* 서버 호출   (다른 모듈 API 호출)
```

### 코딩 컨벤션

- `type` 사용 (`interface`/`enum` 금지)
- `any` 금지 → `unknown` + 타입 가드
- `console.log` 금지 (디버깅 후 제거)
- inline styles 금지 (Tailwind)
- Server Components 기본, 필요시에만 `"use client"`
- 절대 경로: `@/components/...`, `@/lib/...`

---

## 4. DB

- Supabase (PostgreSQL)
- AD 모듈 테이블은 `ads` 스키마에 생성
- 공통 테이블 (`public.users`, `public.org_units` 등)은 읽기 가능
- IP 모듈 테이블 (`public.reports` 등) 직접 접근 금지

```sql
-- 예시: ads 스키마에 테이블 생성
CREATE SCHEMA IF NOT EXISTS ads;
CREATE TABLE ads.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
);
```

### 4.1 권한 관련 필수 컬럼

AD 테이블 설계 시 아래 컬럼을 포함할 것:

| 컬럼 | 용도 | 참조 |
|------|------|------|
| `org_unit_id` | 조직 기반 접근 제어 (레이어 1) | `public.org_units(id)` |
| `marketplace` | 마켓플레이스 구분 (US, DE, JP 등) | 향후 레이어 2 필터 |

> **레이어 1 (org_units)**: 사업부 단위로 광고 데이터 분리. RLS로 자동 적용.
> **레이어 2 (카테고리/SKU × 마켓 담당)**: Product Library 모듈 완성 후 적용 예정. 같은 카테고리라도 마켓(국가)별로 담당자가 다를 수 있음.

---

## 5. 배포

```bash
npx vercel              # Preview 배포 (먼저 확인)
npx vercel --prod       # Production 배포 (확인 후)
```

- Preview 없이 바로 `--prod` 금지
- DB 스키마 변경 → Supabase SQL Editor 먼저 → 코드 배포

---

## 6. 사용 가능한 공통 컴포넌트

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

---

## 7. 브랜치 전략

```
main                          ← 프로덕션 (직접 push 금지, PR 필수)
├── ads/feature-dashboard     ← AD 작업
├── ads/feature-keywords      ← AD 작업
└── common/update-button      ← 공통 영역 (PR + PM 리뷰 필수)
```

- main에 직접 push 불가 (branch protection 적용됨)
- PR 제출 → 1명 이상 승인 → merge
- CODEOWNERS 파일로 자동 리뷰어 배정됨
- 상세: `docs/BOUNDARIES.md`

---

## 8. 퍼미션 매트릭스

Google Sheets에서 모듈별 역할/권한 관리:
https://docs.google.com/spreadsheets/d/1Z6m2ez4ITpjeQVr4zeLmLFyr-Ac-JyPVxluE3UQEIvY

- iP 탭: 참고용 (IP 모듈 권한 예시)
- AD 탭: AD 모듈 기획 진행하면서 채울 것

---

## 9. 문의

- PM: Jayden Song (jsong@spigen.com)
- 아키텍처: `docs/01-plan/features/spigen-platform-architecture.plan.md`
- 디자인: `docs/02-design/features/spigen-platform-architecture.design.md`
- 권한 시스템: `docs/01-plan/features/org-permission-system.plan.md`
- 안전장치: `docs/BOUNDARIES.md`
