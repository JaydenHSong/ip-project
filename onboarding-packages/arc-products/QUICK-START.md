# Product Library — 5분 시작 가이드

> 이 문서를 따라가면 5분 안에 로컬 개발 환경이 뜹니다.

---

## ✅ 체크리스트

### 1. 사전 준비 (이미 되어있으면 스킵)

- [ ] Node.js v20+ 설치됨 (`node --version`)
- [ ] pnpm 설치됨 (`pnpm --version`) — 없으면 `npm i -g pnpm`
- [ ] Git 설치됨 (`git --version`)
- [ ] Claude Code CLI 설치됨 — https://docs.anthropic.com/claude-code

### 2. 원본 repo 클론

```bash
cd ~/Projects   # 원하는 위치 (예시)
git clone https://github.com/JaydenHSong/ip-project.git arc-products
cd arc-products
```

### 3. 이 패키지 내용 덮어쓰기

arc-products 온보딩 패키지 폴더(지금 이 파일이 있는 폴더)의 내용을 방금 clone한 폴더에 복사:

```bash
# 패키지 폴더에서 실행 (현재 위치 가정)
PKG_DIR=$(pwd)
PROJECT_DIR=~/Projects/arc-products    # 2단계에서 clone한 경로

# 루트 파일 복사
cp "$PKG_DIR/CLAUDE.md"     "$PROJECT_DIR/CLAUDE.md"
cp "$PKG_DIR/.env.local"    "$PROJECT_DIR/.env.local"
cp "$PKG_DIR/README.md"     "$PROJECT_DIR/ONBOARDING-README.md"        # 기존 README 보존
cp "$PKG_DIR/QUICK-START.md" "$PROJECT_DIR/QUICK-START.md"

# docs 복사 (기존 repo의 docs/도 있으므로 덮어쓰기 주의)
cp "$PKG_DIR/docs/ONBOARDING.md"   "$PROJECT_DIR/docs/ONBOARDING-products.md"
cp "$PKG_DIR/docs/ARCHITECTURE.md" "$PROJECT_DIR/docs/ARCHITECTURE-summary.md"
cp "$PKG_DIR/docs/BOUNDARIES.md"   "$PROJECT_DIR/docs/BOUNDARIES.md"

# 모듈 CLAUDE.md 배치 (src/modules/products는 아직 없으므로 생성)
mkdir -p "$PROJECT_DIR/src/modules/products"
cp "$PKG_DIR/modules/products/CLAUDE.md" "$PROJECT_DIR/src/modules/products/CLAUDE.md"
```

> 💡 파일명 충돌이 걱정되면 위 `cp` 대신 `cp -i` (덮어쓰기 확인) 사용.

### 4. 의존성 설치

```bash
cd "$PROJECT_DIR"
pnpm install
```

### 5. 로컬 서버 실행

```bash
pnpm dev
```

- 포트 3000이 이미 사용 중(예: arc-ads가 떠있음)이면:
  ```bash
  pnpm dev --port 3001
  ```
- http://localhost:3000 (또는 3001) 접속 → Google OAuth 로그인 (@spigen.com)

### 6. 검증

```bash
pnpm typecheck    # 타입 에러 없어야 함
pnpm lint         # 린트 에러 없어야 함 (기존 warning은 무시 OK)
pnpm build        # 빌드 성공해야 함
```

### 7. Claude Code 세션 시작

```bash
claude                       # 또는 IDE 내 Claude Code 열기
```

첫 지시:

```
/pdca pm product-library
```

이 명령 하나로 PM Agent Team이:
1. Discovery (Opportunity Solution Tree)
2. Strategy (JTBD + Lean Canvas)
3. Research (Persona + Competitor + Market size)
4. PRD 생성

→ `docs/00-pm/product-library.prd.md` 파일이 생성됩니다.

---

## 🎯 Week 1 MVP 목표

**ASIN Mapping 페이지 하나만 완성**하면 Phase 1 MVP 완료.

| 체크 | 항목 | 파일 |
|:---:|---|---|
| [ ] | DB 스키마 `products` 생성 | Supabase SQL Editor |
| [ ] | `products.products` 테이블 | Supabase SQL Editor |
| [ ] | `products.asin_mapping` 테이블 | Supabase SQL Editor |
| [ ] | `/products` 라우트 (카탈로그 리스트) | `src/app/(protected)/products/page.tsx` |
| [ ] | `/products/mapping` 라우트 (매핑 테이블) | `src/app/(protected)/products/mapping/page.tsx` |
| [ ] | `GET /api/products/mapping` | `src/app/api/products/mapping/route.ts` |
| [ ] | `POST /api/products/mapping` (bulk import) | 같음 |
| [ ] | `GET /api/products/by-asin/[asin]` (다른 모듈용) | `src/app/api/products/by-asin/[asin]/route.ts` |
| [ ] | Amazon Catalog API 클라이언트 | `src/modules/products/api/adapters/amazon-catalog.ts` |
| [ ] | `src/constants/modules.ts` products 항목 `coming_soon` → `active` |
| [ ] | `pnpm typecheck && pnpm lint && pnpm build` 통과 |
| [ ] | Preview 배포 (`npx vercel`) |

---

## 🔑 주요 환경변수 (`.env.local`)

이미 세팅된 값들. 그대로 사용하면 됩니다:

| 키 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase DB 접속 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side DB key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin-side DB key (API 라우트에서 사용) |
| `AMAZON_APP_ID`, `AMAZON_CLIENT_ID`, `AMAZON_CLIENT_SECRET` | Amazon SP-API 앱 자격 |
| `AMAZON_SP_API_REFRESH_TOKEN_US/EU/UK` | SP-API 토큰 (지역별) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `ANTHROPIC_API_KEY` | AI 제안 (선택) |
| `NEXT_PUBLIC_APP_URL` | 앱 URL (로컬은 http://localhost:3000) |

Product Library에 **필수**: Supabase × 3, Amazon SP-API × 4, Google OAuth × 2
**선택**: Anthropic (AI 제안 사용 시)
**미사용**: BR_*, MONDAY_*, SENTINEL_*, CRAWLER_* (IP 모듈 전용, 삭제해도 무방)

---

## ⚠️ 절대 건드리지 말 것

```
❌ src/app/(protected)/ip/*    ← IP 모듈 (다른 팀)
❌ src/app/(protected)/ads/*   ← AD 모듈 (다른 팀)
❌ src/modules/ip/*            ← IP 모듈
❌ src/modules/ads/*           ← AD 모듈
❌ src/app/api/ip/*            ← IP 모듈
❌ src/app/api/ads/*           ← AD 모듈
```

공통 영역 (`src/components/ui/*`, `src/lib/auth/*` 등)은 수정하려면 PR + PM 리뷰 필수.

---

## 🚀 그 다음

- 자세한 가이드: `docs/ONBOARDING.md`
- 전체 플랫폼 맥락: `docs/ARCHITECTURE.md`
- 안전 규칙 (꼭 읽기): `docs/BOUNDARIES.md`
- Claude 세션 시 참고: `CLAUDE.md` + `src/modules/products/CLAUDE.md`

질문: Jayden Song (jsong@spigen.com)
