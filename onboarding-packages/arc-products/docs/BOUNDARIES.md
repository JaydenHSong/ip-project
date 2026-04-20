# A.R.C. 개발 안전장치 (Multi-Developer Safety Rules)

> 여러 명이 같은 repo에서 다른 모듈을 개발할 때 사고 방지 규칙.

---

## 1. 브랜치 전략

```
main                                ← 프로덕션 (직접 push 금지)
├── products/feature-mapping        ← Product Library 작업
├── products/feature-assets         ← Product Library 작업
├── ads/fix-budget-pacing           ← AD 모듈 작업
├── ip/fix-search-bug               ← IP 모듈 작업
└── common/update-button            ← 공통 영역 작업
```

### 규칙:
- **main 직접 push 금지** — 반드시 PR(Pull Request)로 (branch protection 적용됨)
- PR 승인 1명 이상 필수 (CODEOWNERS 자동 리뷰어 배정)
- 브랜치 이름: `{module}/{description}` (예: `products/feature-mapping`)
- 공통 영역: `common/{description}` (예: `common/update-auth`)

---

## 2. 파일 수정 권한

### 자유 영역 (PR 리뷰 단순)

자기 모듈 폴더 안:
```
src/app/(protected)/products/*     ← 자유
src/modules/products/*             ← 자유
src/app/api/products/*             ← 자유
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
| Amazon SP-API base | `src/lib/amazon/sp-api/*` | PM |

### 금지 영역 (절대 수정 금지)

```
src/app/(protected)/ip/*       ← IP 모듈
src/modules/ip/*               ← IP 모듈
src/app/api/ip/*               ← IP 모듈
src/app/api/crawler/*          ← IP 전용

src/app/(protected)/ads/*      ← AD 모듈
src/modules/ads/*              ← AD 모듈
src/app/api/ads/*              ← AD 모듈
```

---

## 3. Provider 모듈의 특수 규칙

Product Library는 다른 모듈의 **provider** 역할입니다. 아래 규칙이 추가로 적용됩니다.

### 3.1 다른 모듈이 products 스키마 읽는 것은 OK

```sql
-- ✅ AD 모듈이 ASIN 정보 조회
SELECT sku, product_name
FROM products.asin_mapping am
JOIN products.products p ON am.product_id = p.id
WHERE am.asin = $1;

-- ✅ Listing 모듈이 호환성 참조
SELECT compat_value FROM products.product_compatibility WHERE product_id = $1;
```

### 3.2 products 스키마 변경 시 영향 분석 필수

테이블 컬럼 삭제/이름 변경 시:

1. 다른 모듈에서 참조 여부 grep: `grep -rn "products\.products" src/modules/`
2. 영향받는 모듈 담당자에게 공지 (최소 1주 전)
3. 점진적 마이그레이션 (deprecation 기간)
4. 한 번에 변경 금지 (Breaking change 최소화)

### 3.3 API contract 변경 금지

`GET /api/products/mapping` 같은 read API의 응답 구조는 **SLA처럼 유지**:
- 필드 추가: OK (다른 모듈 영향 없음)
- 필드 삭제/이름 변경: 금지 (전 모듈 영향)
- 응답 shape 변경 시 v2 endpoint 새로 만들기

---

## 4. 사고 시나리오 & 방지법

| # | 사고 | 예시 | 방지법 |
|:--|:--|:--|:--|
| 1 | 공통 UI 파괴 | Button 수정 → IP 모듈 깨짐 | PR + 전체 빌드 체크 |
| 2 | 인증 파괴 | withAuth 수정 → 전체 API 깨짐 | PR + PM 리뷰 |
| 3 | 타입 에러 폭발 | User 타입 변경 → 수십 개 에러 | PR + typecheck |
| 4 | DB 충돌 | 같은 테이블명 사용 | 모듈별 스키마 분리 |
| 5 | Git 충돌 | 같은 파일 동시 수정 | 모듈별 폴더 분리 |
| 6 | 배포 사고 | main에 직접 push | 브랜치 보호 |
| 7 | 환경변수 실수 | 필요한 env 누락 | .env.local 패키지 포함 |
| 8 | 모듈 간 의존성 | products에서 ads import | ESLint 규칙으로 차단 |
| 9 | **Provider API 깨기** | `/api/products/mapping` 응답 구조 바꿈 → AD/Listing 동시 깨짐 | **v2 endpoint** 새로 만들기 |
| 10 | **스키마 컬럼 삭제** | `products.asin_mapping.asin` 제거 → 전 모듈 깨짐 | Deprecation 기간 + 공지 |

---

## 5. PR(Pull Request) 체크리스트

PR 올리기 전 반드시 확인:

```bash
pnpm typecheck    # 타입 에러 없는지
pnpm lint         # 린트 에러 없는지
pnpm build        # 빌드 성공하는지
```

PR 설명에 포함할 것:
- [ ] 어떤 모듈 작업인지
- [ ] 공통 영역 수정 여부
- [ ] **products 스키마 변경 여부 (변경 시 영향받는 모듈 리스트 첨부)**
- [ ] 스크린샷 (UI 변경 시)

---

## 6. DB 안전 규칙

```sql
-- ✅ OK: 자기 스키마에 테이블 생성
CREATE TABLE products.products (...);

-- ✅ OK: 공통 테이블 읽기
SELECT * FROM public.users WHERE id = $1;
SELECT * FROM public.brands WHERE id = $1;

-- ✅ OK: 자기 모듈 내 스키마 간 JOIN
SELECT p.*, am.asin
FROM products.products p
JOIN products.asin_mapping am ON am.product_id = p.id;

-- ❌ NEVER: 다른 모듈 스키마 직접 접근
SELECT * FROM ads.campaigns WHERE ...;       -- AD 모듈 테이블
SELECT * FROM public.reports WHERE ...;       -- IP 모듈 테이블
```

- DB 스키마 변경은 Supabase SQL Editor에서 먼저
- 코드 배포는 그 다음
- **Provider 테이블(`products.asin_mapping`) 변경은 다른 모듈 담당자 사전 공지 필수**

---

## 7. 도움이 필요할 때

- **PM**: Jayden Song (jsong@spigen.com)
- **공통 영역 수정**: PM에게 먼저 확인
- **다른 모듈 데이터 필요**:
  - `products` 스키마에서 읽기 필요 → 자유 (read-only)
  - `ads` / `ip` 스키마 접근 필요 → `modules/shared/` 경유 요청
- **Provider API (products) 변경 필요**: PM + 영향받는 모듈 담당자 컨설트
