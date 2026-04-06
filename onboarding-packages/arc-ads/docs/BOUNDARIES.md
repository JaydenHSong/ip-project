# A.R.C. 개발 안전장치 (Multi-Developer Safety Rules)

> 여러 명이 같은 repo에서 다른 모듈을 개발할 때 사고 방지 규칙.

---

## 1. 브랜치 전략

```
main                          ← 프로덕션 (직접 push 금지)
├── ads/feature-dashboard     ← AD 모듈 작업
├── ads/feature-keywords      ← AD 모듈 작업
├── ip/fix-search-bug         ← IP 모듈 작업
└── common/update-button      ← 공통 영역 작업
```

### 규칙:
- **main 직접 push 금지** — 반드시 PR(Pull Request)로 (branch protection 적용됨)
- PR 승인 1명 이상 필수 (CODEOWNERS 자동 리뷰어 배정)
- 브랜치 이름: `{module}/{description}` (예: `ads/feature-dashboard`)
- 공통 영역: `common/{description}` (예: `common/update-auth`)

---

## 2. 파일 수정 권한

### 자유 영역 (PR 없이 가능)

자기 모듈 폴더 안:
```
src/app/(protected)/ads/*     ← 자유
src/modules/ads/*             ← 자유
src/app/api/ads/*             ← 자유
```

### 보호 영역 (PR + 리뷰 필수)

| 영역 | 파일 | 리뷰어 |
|:--|:--|:--|
| 공통 UI | `src/components/ui/*` | PM (Jayden) |
| 인증 | `src/lib/auth/*` | PM |
| DB 클라이언트 | `src/lib/supabase/*` | PM |
| 레이아웃 | `src/components/layout/*` | PM |
| 타입 | `src/types/*` | PM |
| 모듈 설정 | `src/constants/modules.ts` | PM |
| 루트 설정 | `CLAUDE.md`, `package.json`, `next.config.ts` | PM |

### 금지 영역 (절대 수정 금지)

```
src/app/(protected)/ip/*      ← 다른 모듈
src/modules/ip/*              ← 다른 모듈
src/app/api/ip/*              ← 다른 모듈
src/app/api/crawler/*         ← IP 전용
```

---

## 3. 사고 시나리오 & 방지법

| # | 사고 | 예시 | 방지법 |
|:--|:--|:--|:--|
| 1 | 공통 UI 파괴 | Button 수정 → IP 모듈 깨짐 | PR + 전체 빌드 체크 |
| 2 | 인증 파괴 | withAuth 수정 → 전체 API 깨짐 | PR + PM 리뷰 |
| 3 | 타입 에러 폭발 | User 타입 변경 → 수십 개 에러 | PR + typecheck |
| 4 | DB 충돌 | 같은 테이블명 사용 | 모듈별 스키마 분리 |
| 5 | Git 충돌 | 같은 파일 동시 수정 | 모듈별 폴더 분리 |
| 6 | 배포 사고 | main에 직접 push | 브랜치 보호 |
| 7 | 환경변수 실수 | 필요한 env 누락 | .env.local 패키지 포함 |
| 8 | 모듈 간 의존성 | ads에서 ip import | ESLint 규칙으로 차단 |

---

## 4. PR(Pull Request) 체크리스트

PR 올리기 전 반드시 확인:

```bash
pnpm typecheck    # 타입 에러 없는지
pnpm lint         # 린트 에러 없는지
pnpm build        # 빌드 성공하는지
```

PR 설명에 포함할 것:
- [ ] 어떤 모듈 작업인지
- [ ] 공통 영역 수정 여부
- [ ] 스크린샷 (UI 변경 시)

---

## 5. DB 안전 규칙

```sql
-- ✅ OK: 자기 스키마에 테이블 생성
CREATE TABLE ads.campaigns (...);

-- ✅ OK: 공통 테이블 읽기
SELECT * FROM public.users WHERE id = $1;

-- ❌ NEVER: 다른 모듈 스키마 접근
SELECT * FROM public.reports WHERE ...;  -- IP 모듈 테이블
```

- DB 스키마 변경은 Supabase SQL Editor에서 먼저
- 코드 배포는 그 다음

---

## 6. 도움이 필요할 때

- **PM**: Jayden Song (jsong@spigen.com)
- **공통 영역 수정**: PM에게 먼저 확인
- **다른 모듈 데이터 필요**: `modules/shared/`에 공유 유틸 추가 요청
