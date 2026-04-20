# arc-products — Product Library 온보딩 패키지

> **이 폴더를 독립된 작업 폴더로 옮겨서 새 Claude Code 세션에서 작업하세요.**
> 이 패키지 하나만으로 Product Library 모듈을 처음부터 개발할 수 있도록 구성되어 있습니다.

---

## 0. 5초 요약

| 항목 | 값 |
|---|---|
| **모듈** | Product Library (제품 카탈로그 / ASIN 마스터) |
| **URL 경로** | `/products/*` |
| **DB 스키마** | `products` (신규 생성) |
| **역할** | **Provider** — 모든 다른 모듈의 SKU/ASIN Single Source of Truth |
| **Phase** | 1 (Week 1 MVP: ASIN mapping만) |
| **예상 기간** | MVP 1주 / Full Spec 3-4주 |

---

## 1. Quick Reference — 서버 & 리포지토리 정보

### Git Repository

```bash
# Clone URL (모든 모듈 공통 단일 repo)
https://github.com/JaydenHSong/ip-project.git

# 브랜치 전략
main                          ← 프로덕션 (직접 push 금지)
products/feature-mapping      ← 이 모듈 작업 브랜치 (예시)
products/feature-assets
products/feature-catalog
```

### Production 환경

| 서비스 | URL | 용도 |
|---|---|---|
| Web | https://arc.spigen.com | 프로덕션 앱 |
| DB | njbhqrrdnmiarjjpgqwd.supabase.co | Supabase PostgreSQL |
| Auth | Google OAuth (@spigen.com) | SSO |

### 로컬 개발

| 항목 | 값 |
|---|---|
| 포트 | `3000` (기본) — 기존 arc-ads가 쓰고 있으면 `pnpm dev --port 3001` |
| Node | v20+ |
| 패키지 매니저 | pnpm |

### PM / 연락처

- **PM**: Jayden Song (jsong@spigen.com)
- **퍼미션 매트릭스**: [Google Sheets](https://docs.google.com/spreadsheets/d/1Z6m2ez4ITpjeQVr4zeLmLFyr-Ac-JyPVxluE3UQEIvY)

---

## 2. 패키지 파일 구조

```
arc-products/
├── README.md                   ← 이 파일 (처음 읽기)
├── QUICK-START.md              ← 5분 안에 시작하는 체크리스트
├── CLAUDE.md                   ← Claude Code 세션용 컨텍스트 (자동 로드)
├── .env.local                  ← 환경변수 (실 값 포함 — 외부 공유 금지)
│
├── docs/
│   ├── ONBOARDING.md           ← 자세한 온보딩 가이드
│   ├── ARCHITECTURE.md         ← 플랫폼 아키텍처 요약 (8개 모듈)
│   └── BOUNDARIES.md           ← Provider 모듈 특수 규칙 (중요)
│
└── modules/products/
    └── CLAUDE.md               ← 이 모듈 작업 시 세부 컨텍스트
```

---

## 3. 처음 시작하는 순서

### Step 1: 작업 폴더 준비

```bash
# 1) 원본 repo 클론 (원하는 위치에)
cd ~/Projects
git clone https://github.com/JaydenHSong/ip-project.git arc-products
cd arc-products

# 2) 이 패키지 내용을 클론 폴더에 덮어쓰기
#    arc-products 패키지 폴더를 어디에 보관하고 있든 해당 경로에서 복사
cp -r /path/to/arc-products-package/* ./
cp /path/to/arc-products-package/.env.local ./

# 3) 모듈별 CLAUDE.md 배치
mkdir -p src/modules/products
cp modules/products/CLAUDE.md src/modules/products/CLAUDE.md
```

### Step 2: 설치 & 실행

```bash
pnpm install
pnpm dev                  # http://localhost:3000 (포트 충돌 시 --port 3001)
```

### Step 3: Claude Code 세션 시작

1. 작업 폴더에서 Claude Code 실행
2. CLAUDE.md + modules/products/CLAUDE.md 자동 로드됨
3. 첫 지시:
   ```
   /pdca pm product-library
   ```

### Step 4: MVP 목표 (Week 1)

**ASIN Mapping** 페이지 하나만 완성하면 Phase 1 MVP 완료:
- `/products/mapping` — SKU ↔ ASIN × Marketplace 테이블
- CSV bulk import 기능
- `GET /api/products/by-asin/[asin]` — 다른 모듈이 호출할 read API

---

## 4. 읽어야 할 문서 (순서대로)

| 순서 | 파일 | 목적 | 예상 시간 |
|---|---|---|---|
| 1 | `README.md` (이 파일) | 전체 개요 | 3분 |
| 2 | `QUICK-START.md` | 5분 시작 체크리스트 | 5분 |
| 3 | `docs/ONBOARDING.md` | 상세 가이드 + Amazon API + DB 스키마 | 20분 |
| 4 | `docs/ARCHITECTURE.md` | 플랫폼 전체 맥락 + Product Library 역할 | 10분 |
| 5 | `docs/BOUNDARIES.md` | Provider 모듈 특수 규칙 (꼭 읽기) | 10분 |
| 6 | `modules/products/CLAUDE.md` | 작업 시 Claude 참조 컨텍스트 | 10분 |

---

## 5. ⚠️ 주의사항

### 5.1 보안
- `.env.local`에는 실제 API 키/시크릿 포함 (Amazon SP-API refresh token, Supabase service role key 등)
- **이 패키지를 공개 저장소 / Slack 외부 채널 / 이메일 첨부로 공유 금지**
- 개발자에게 전달 시 Slack DM 또는 1Password 같은 안전한 채널 사용

### 5.2 Provider 모듈 특수성
- Product Library는 다른 모듈의 **데이터 제공자**입니다
- `products` 스키마 변경은 AD/Listing/Finance/OMS에 전파됨
- 컬럼 삭제 / 이름 변경 금지 → deprecation 기간 필수
- 상세: `docs/BOUNDARIES.md` §3

### 5.3 다른 모듈 코드 수정 금지
```
❌ src/app/(protected)/ip/*     ← IP 모듈
❌ src/app/(protected)/ads/*    ← AD 모듈
❌ src/modules/ip/*             ← IP 모듈
❌ src/modules/ads/*            ← AD 모듈
❌ src/app/api/ip/*             ← IP 모듈
❌ src/app/api/ads/*            ← AD 모듈
```

모듈 격리 원칙: `docs/BOUNDARIES.md` §2

---

## 6. 전체 플랫폼 로드맵

Product Library는 **Phase 1** 모듈. 전체 8개 모듈 로드맵:

```
Phase 1 (지금): Product Library MVP + Reimbursement  ← 4주
Phase 2:        Listing Management                     ← 5주
Phase 3:        Finance + Product Library 완성         ← 4주
Phase 4:        OMS                                    ← 7주
Phase 5:        Product Planning                       ← 5주
```

자세한 로드맵: 원본 repo의 `docs/01-plan/features/platform-roadmap-2026.plan.md`

---

## 7. 도움이 필요할 때

- 막히면: Jayden (jsong@spigen.com) DM
- 공통 영역 수정: PM 사전 승인
- Provider API (products) 변경: PM + 영향받는 모듈 담당자 컨설트
- 기존 AD 모듈 코드 참고: `src/modules/ads/` (패턴 많이 재사용 가능)

---

## 8. 다음 단계

```bash
cat QUICK-START.md
```
