# Playwright — AD S03 visual checks

`DEMO_MODE=true`일 때 미들웨어·`getCurrentUser`·`withAuth`가 데모 사용자로 동작해 **Google 로그인 없이** UI를 열 수 있습니다.

**Next.js 16**은 프로젝트당 `next dev` **한 인스턴스만** 허용합니다 (`.next/dev/lock`). 그래서 Playwright가 자동으로 두 번째 dev 서버를 띄우지 **않습니다**. 비교 테스트 전에 **직접 dev를 켠 뒤** 아래 스크립트만 실행하세요.

## 한 번만 설치

```bash
pnpm exec playwright install
```

(Chromium만 쓰려면 `pnpm exec playwright install chromium` — **Apple Silicon이면 arm64**가 받아지는지 확인.)

## 1) 터미널 A — 데모 모드 개발 서버

```bash
DEMO_MODE=true pnpm dev
```

## 2) 터미널 B — 스크린샷 / 스냅샷

기본은 `http://127.0.0.1:3000` 입니다. 다른 포트면 `PW_BASE_URL` 사용.

**최초 또는 UI 변경 후 베이스라인 갱신**

```bash
pnpm test:e2e:s03:update
```

**이후 회귀 비교 (픽셀 diff)**

```bash
pnpm test:e2e:s03
```

### 산출물

| 산출물 | 설명 |
|--------|------|
| `tools/playwright/output/s03-campaigns-full.png` | 전체 페이지 PNG (Paper S03과 눈으로 비교) |
| `tools/playwright/output/s03-campaigns-full.json` | 캡처 메타 |
| `tools/playwright/tests/*-snapshots/*.png` | `toHaveScreenshot` 베이스라인 (OS별 접미사 있음) |

`expect` 허용 오차는 `tools/playwright/playwright.config.ts`의 `maxDiffPixelRatio` 참고.

## 브라우저

기본 프로젝트 설정은 **Desktop Firefox**입니다 (Chromium headless-shell이 아키텍처별로 빠지는 환경이 있어서). Chromium으로 통일하려면 `playwright.config.ts`의 `devices`만 바꾸고 로컬에서 `playwright install chromium` 확인.

## 주의

- **`DEMO_MODE`는 프로덕션에서 절대 켜지 마세요.**
- `tools/playwright/output/`, `.auth/` 등 로컬 산출물은 Git에 올리지 않는 것을 권장합니다. 스냅샷 베이스라인은 팀 정책에 따라 커밋할 수 있습니다.
