# 온보딩 패키지 생성 가이드

> 새 모듈 개발자에게 전달할 온보딩 패키지를 만드는 방법.
> Claude에게 "XX 모듈 온보딩 패키지 만들어줘"라고 하면 이 템플릿대로 생성됨.

---

## 패키지 구조

```
arc-{module}/
├── CLAUDE.md                    ← 플랫폼 공통 규칙 + 해당 모듈 포커스
├── .env.local                   ← 환경변수 (ip-project/.env.local 복사)
├── docs/
│   ├── ONBOARDING.md            ← 시작 가이드 (클론, 설치, 실행)
│   ├── ARCHITECTURE.md          ← 플랫폼 구조 요약 (7개 모듈)
│   └── BOUNDARIES.md            ← 안전장치 규칙 (사고 방지)
└── modules/{module}/
    └── CLAUDE.md                ← 모듈 전용 컨텍스트
```

---

## 생성 방법

### Claude에게 요청:

```
"{module_name} 모듈 온보딩 패키지 만들어줘"
```

### Claude가 해야 할 것:

1. `/Users/jaydensong/Projects/onboarding-packages/arc-{module}/` 폴더 생성
2. `arc-ads/` 패키지를 참고해서 아래 파일 생성:
   - `CLAUDE.md` — 모듈명, 경로, DB 스키마만 교체
   - `docs/ONBOARDING.md` — 모듈명, 페이지 목록만 교체
   - `docs/ARCHITECTURE.md` — 동일 (공통)
   - `docs/BOUNDARIES.md` — 동일 (공통)
   - `modules/{module}/CLAUDE.md` — 모듈 전용 컨텍스트
3. `.env.local` 복사: `cp ip-project/.env.local → arc-{module}/.env.local`

### 모듈별 교체 항목:

| 항목 | 값 | 예시 (AD) | 예시 (Listings) |
|:--|:--|:--|:--|
| 모듈명 | {module_name} | AD Optimizer | Listing Management |
| 경로 prefix | /ads | /ads | /listings |
| DB 스키마 | ads | ads | listings |
| 폴더 | modules/ads/ | modules/ads/ | modules/listings/ |
| 패키지명 | arc-ads | arc-ads | arc-listings |

---

## 전달 방법

1. 패키지 폴더를 압축: `zip -r arc-{module}.zip arc-{module}/`
2. Jayden이 개발자에게 직접 전달 (Slack DM, 파일 공유 등)
3. 개발자는:
   - `git clone https://github.com/JaydenHSong/ip-project.git arc-{module}`
   - 압축 풀어서 클론 폴더에 덮어쓰기
   - `pnpm install && pnpm dev`
   - Claude Code 시작 → CLAUDE.md 자동 로드

---

## 기존 패키지 목록

| 모듈 | 패키지 | 상태 |
|:--|:--|:--|
| AD Optimizer | `arc-ads/` | ✅ 생성됨 |
| **Product Library** | **`arc-products/`** | **✅ 생성됨 (Phase 1)** |
| Reimbursement | `arc-reimb/` | 미생성 (Phase 1 병렬) |
| Listing Management | `arc-listings/` | 미생성 (Phase 2) |
| Finance | `arc-finance/` | 미생성 (Phase 3) |
| OMS | `arc-oms/` | 미생성 (Phase 4) |
| Product Planning | `arc-planning/` | 미생성 (Phase 5) |

> Phase 순서는 `docs/01-plan/features/platform-roadmap-2026.plan.md` 참조
