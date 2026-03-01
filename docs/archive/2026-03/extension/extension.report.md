# PDCA Completion Report: Chrome Extension

> **Status**: Complete
>
> **Project**: Sentinel - Spigen Brand Protection Platform
> **Version**: 1.0.0
> **Author**: Sentinel Team
> **Completion Date**: 2026-03-01
> **PDCA Cycle**: #2 (MS1 Extension Feature)

---

## 1. Summary

### 1.1 Project Overview

| Item | Content |
|------|---------|
| Feature | Sentinel Chrome Extension (Manifest V3) |
| Start Date | 2026-03-01 |
| End Date | 2026-03-01 |
| Duration | MS1 sprint |
| Scope | 29 extension files + 2 web API files = 31 files total |

Spigen 오퍼레이터(20명+)가 아마존 상품 페이지에서 위반 리스팅을 원클릭으로 제보할 수 있는 Chrome Extension (MS1)을 완성했습니다. 기존 OMS Extension 대비 위반 유형이 10개에서 19개로 확장되었고, Supabase Auth 기반 인증, 스크린샷 자동 캡처, Sentinel Web API 연동이 새롭게 구현되었습니다.

### 1.2 Results Summary

```
+-----------------------------------------------+
|  Design Match Rate: 91%                        |
+-----------------------------------------------+
|  PASS:  192 / 210 checklist items  (91%)       |
|  WARN:   14 / 210 checklist items  ( 7%)       |
|  FAIL:    4 / 210 checklist items  ( 2%)       |
+-----------------------------------------------+
|  Critical Issues Found:     3  (all fixed)     |
|  High Issues Found:         6  (all fixed)     |
|  Code Quality Grade:        B+ (83/100)        |
+-----------------------------------------------+
```

---

## 2. Related Documents

| Phase | Document | Status |
|-------|----------|--------|
| Plan | [extension.plan.md](../01-plan/features/extension.plan.md) | Finalized |
| Design | [extension.design.md](../02-design/features/extension.design.md) | Finalized |
| Check | [extension.analysis.md](../03-analysis/extension.analysis.md) | Complete |
| Act | Current document | Complete |

---

## 3. PDCA Cycle Summary

### Plan Phase

- **문서**: `docs/01-plan/features/extension.plan.md`
- **목표**: Spigen 오퍼레이터가 아마존 페이지에서 원클릭으로 위반을 제보하는 Chrome Extension 구축
- **핵심 기능 (P0)**: 페이지 정보 자동 캡처(F06), 위반 유형 선택 UI(F07), 스크린샷 캡처(F08), Sentinel Web API 연동(F09)
- **MS1/MS2 구분**: AI 미리보기, 중복 체크, 내 제보 상태는 MS2로 명확히 분리

### Design Phase

- **문서**: `docs/02-design/features/extension.design.md`
- **주요 설계 결정**:
  - Manifest V3 + Vite 멀티 엔트리 빌드 (popup / content / background 분리)
  - Service Worker 기반 Background 처리 (Manifest V3 제약 대응)
  - Shadow DOM으로 Content Script CSS 격리
  - Extension 전용 통합 API 엔드포인트: `POST /api/ext/submit-report`
  - 5개 Phase 구현 순서 정의 (Setup → Content → Service Worker → Popup → Web API)
- **총 설계 항목**: 210개 체크리스트 항목

### Do Phase

- **구현 파일**: 31개 (extension 29 + web API 2)
- **5개 Phase 완전 구현**:
  1. 프로젝트 셋업: `package.json`, `tsconfig.json`, `vite.config.ts`, `manifest.json`
  2. Content Script: `parser.ts`, `floating-button.ts`, `index.ts`, `styles.css`
  3. Service Worker: `auth.ts`, `screenshot.ts`, `api.ts`, `service-worker.ts`
  4. Popup UI: `popup.html`, `popup.ts`, 4개 View, 3개 Component, `popup.css`
  5. Web API: `submit-report/route.ts`, `auth-status/route.ts`
- **TypeScript strict mode**: extension + root 모두 통과
- **빌드**: `pnpm build` 정상 통과 (ext API routes 등록 포함)

### Check Phase

- **문서**: `docs/03-analysis/extension.analysis.md`
- **최종 Match Rate**: 91% (PASS 기준 90% 초과)
- **발견 및 수정된 이슈**: Critical 3개, High 6개 (모두 수정 완료)
- **WARN 항목 14개**: 설계 문서 업데이트 권장 사항 (기능 결함 없음)

---

## 4. Implementation Summary

### 4.1 파일 구조 (구현 완료)

```
extension/                          # Extension 프로젝트 루트
  manifest.json                     # Manifest V3 (V3 permissions, host_permissions)
  package.json                      # sentinel-extension v1.0.0
  tsconfig.json                     # ES2022 target, strict mode
  vite.config.ts                    # 멀티 엔트리 빌드 (popup/content/background)
  src/
    env.d.ts                        # Vite 환경변수 타입 선언
    content/
      parser.ts                     # 아마존 DOM 파서 (8개 마켓플레이스, 13개 필드)
      floating-button.ts            # Shadow DOM 플로팅 버튼 (#F97316, 48px)
      index.ts                      # Content Script 엔트리
      styles.css                    # Content Script 스타일 (Shadow DOM)
    popup/
      popup.html                    # 팝업 HTML (4개 뷰 구조)
      popup.ts                      # 뷰 라우터 + 초기화 로직
      views/
        LoadingView.ts              # 스피너 로딩 상태
        LoginView.ts                # Google OAuth 로그인 화면
        ReportFormView.ts           # 위반 신고 폼 (제품 정보 + 셀렉터)
        SuccessView.ts              # 제출 성공 + Sentinel 링크
      components/
        ViolationSelector.ts        # 2단계 카테고리/유형 선택 셀렉터
        NoteInput.ts                # 메모 입력 (maxlength 2000)
        SubmitButton.ts             # 제출 버튼 (로딩 상태 포함)
    background/
      service-worker.ts             # 메시지 라우터 (6개 메시지 타입)
      auth.ts                       # Supabase Auth + 5분 전 자동 갱신
      api.ts                        # Sentinel API 클라이언트
      screenshot.ts                 # captureVisibleTab + 2MB 제한 자동 압축
    shared/
      types.ts                      # 공유 타입 (ParsedPageData, SubmitReportPayload 등)
      constants.ts                  # 위반 유형 상수 + MARKETPLACE_MAP + API_BASE
      messages.ts                   # chrome.runtime 메시지 타입 유니온
      storage.ts                    # chrome.storage.local 타입 안전 래퍼
  assets/
    styles/
      popup.css                     # 팝업 글로벌 스타일 (CSS 변수 + 360px 레이아웃)

src/app/api/ext/                    # Sentinel Web — Extension 전용 API
  submit-report/route.ts            # POST: listing + report 원자적 생성
  auth-status/route.ts              # GET: 인증 상태 확인
```

### 4.2 핵심 아키텍처 패턴

| 패턴 | 적용 위치 | 이유 |
|------|----------|------|
| Shadow DOM 격리 | floating-button.ts | 아마존 CSS 간섭 방지 |
| 메시지 기반 통신 | Popup ↔ Service Worker | Manifest V3 아키텍처 요구사항 |
| 멀티 폴백 셀렉터 | parser.ts SELECTORS | 아마존 DOM 구조 변경 대응 |
| 타입 안전 스토리지 | storage.ts | chrome.storage.local 키 오타 방지 |
| 원자적 API 처리 | submit-report/route.ts | listing + report 생성 일관성 보장 |
| Vite 환경변수 주입 | auth.ts | 빌드 시점 시크릿 주입 (`import.meta.env`) |

---

## 5. Functional Requirements Status

| ID | 요구사항 | 상태 | 비고 |
|----|---------|------|------|
| F06 | 페이지 정보 자동 캡처 (ASIN, 제목, 판매자, 가격, 이미지, bullet points) | Complete | 13개 필드, 8개 마켓플레이스 |
| F07 | 위반 유형 선택 UI (5카테고리 × 19유형 그룹 셀렉터 + 메모) | Complete | 2단계 셀렉트, 카테고리 선택 후 유형 동적 필터링 |
| F08 | 스크린샷 자동 캡처 | Complete | 2MB 자동 압축 (PNG → JPEG fallback) |
| F09 | Sentinel Web API 연동 | Complete | POST /api/ext/submit-report (listing + report 원자적) |
| — | @spigen.com 계정 전용 인증 | Complete | Google OAuth via chrome.identity |
| — | 플로팅 버튼 (아마존 상품 페이지 전용) | Complete | Shadow DOM, /dp/ 패턴 감지 |
| — | 인증 토큰 자동 갱신 | Complete | 만료 5분 전 자동 refresh |
| AI 미리보기 | AI 분석 결과 팝업 표시 | Deferred | MS2 scope |
| 중복 체크 | 동일 ASIN 기존 신고 경고 | Deferred | MS2 scope (is_duplicate 필드는 API 응답에 이미 포함) |
| 내 제보 상태 | 최근 제보 상태 목록 | Deferred | MS2 scope |

### Non-Functional Requirements

| 항목 | 목표 | 결과 | 상태 |
|------|------|------|------|
| TypeScript strict mode | 전체 파일 통과 | 통과 | Pass |
| 빌드 | pnpm build 정상 | 정상 통과 | Pass |
| 코드 품질 | B 이상 | B+ (83/100) | Pass |
| 보안 | 시크릿 코드 하드코딩 금지 | 수정 완료 | Pass |
| 컨벤션 (CLAUDE.md) | 전체 준수 | 95% 준수 | Pass |
| 설계 일치율 | 90% 이상 | 91% | Pass |

---

## 6. Quality Metrics

### 6.1 Gap Analysis 결과

| 카테고리 | 점수 | 상태 |
|---------|:----:|:----:|
| Design Match | 94% | PASS |
| Architecture Compliance | 98% | PASS |
| Convention Compliance | 95% | PASS |
| Security | 82% → 100%* | PASS |
| **Overall** | **91%** | **PASS** |

*보안 이슈 수정 후 기준

### 6.2 수정된 이슈 (Critical / High)

**Critical Issues — 3건**

| # | 이슈 | 파일 | 수정 내용 |
|---|------|------|----------|
| C1 | `tabs` permission 누락 | `manifest.json` | `captureVisibleTab()` 사용에 필요한 `"tabs"` permission 추가 |
| C2 | 위반 유형 미선택 시 제출 허용 | `SubmitButton.ts`, `ReportFormView.ts` | 위반 유형 선택 전 Submit 버튼 `disabled` 강제, 서버 측 validation 추가 |
| C3 | 스크린샷 크기 무제한 | `screenshot.ts` | `MAX_SIZE_BYTES = 2MB` 제한 + quality 자동 감소 루프 + JPEG fallback |

**High Issues — 6건**

| # | 이슈 | 파일 | 수정 내용 |
|---|------|------|----------|
| H1 | 복수 리스너 등록 위험 | `service-worker.ts` | 메시지 핸들러를 단일 `chrome.runtime.onMessage` 리스너로 통합 |
| H2 | 역할(role) 하드코딩 | `auth-status/route.ts` | role을 Supabase users 테이블에서 동적 조회 |
| H3 | `unknown` 타입 캐스트 남용 | `service-worker.ts` | 각 메시지 타입별 타입 가드 적용 |
| H4 | PNG → JPEG fallback 부재 | `screenshot.ts` | 2MB 초과 시 JPEG `quality: 20` fallback 추가 |
| H5 | CSS 경로 오류 | `popup.html` | Vite 빌드 출력 경로에 맞게 CSS `href` 수정 |
| H6 | XSS 취약점 (ReportFormView) | `ReportFormView.ts` | 사용자 데이터를 `innerHTML`이 아닌 `textContent`로 처리, `escapeHtml()` 적용 |

### 6.3 WARN 항목 요약 (설계 문서 업데이트 권장)

| # | 항목 | 권장 조치 |
|---|------|----------|
| W1 | Manifest 경로가 Vite 빌드 출력명 사용 | 설계 문서에 빌드 출력 경로 명시 |
| W2 | `API_BASE`가 `constants.ts`에 위치 | 설계에서 `constants.ts` 위치로 업데이트 |
| W3 | `CAPTURE_SCREENSHOT` 메시지 타입 추가 | `messages.ts` 스펙에 추가 |
| W4 | `/submit-report` 응답 코드 201 반환 | 설계 응답 코드 200 → 201 수정 |
| W5 | `auth-status` 미인증 시 401 반환 | 설계에서 401 동작 명시 |
| W6 | inline style 일부 사용 | Extension 컨텍스트 예외 문서화 |

---

## 7. Key Decisions and Trade-offs

### 결정 1: Extension 전용 통합 API 엔드포인트

**결정**: 기존 `/api/listings` + `/api/reports` 2개 호출 대신 `/api/ext/submit-report` 단일 엔드포인트로 통합

**이유**: Extension은 Network 오류에 취약. listing 생성 후 report 생성 실패 시 고아 listing이 생기는 문제를 서버 측 원자적 처리로 방지.

**트레이드오프**: API 계층이 Extension 전용 경로를 따로 가짐 → 추후 MS2 기능 추가 시 이 엔드포인트에서 처리 가능.

### 결정 2: Manifest V3 — OPEN_POPUP 처리

**결정**: Content Script에서 `chrome.runtime.sendMessage({ type: 'OPEN_POPUP' })` 수신 시 팝업을 직접 열 수 없는 MV3 제약으로 인해 뱃지 "!" 표시로 대체

**이유**: MV3는 `chrome.action.openPopup()`이 사용자 제스처 없이 호출 불가. 플로팅 버튼 클릭은 Extension 툴바 아이콘 클릭과 동일한 역할을 하도록 UX 안내.

**트레이드오프**: 플로팅 버튼이 팝업을 직접 열지 못함 → 사용자는 툴바 아이콘 클릭 필요. 이는 MV3 표준 제약.

### 결정 3: `storage.remove()` 가변 인수 시그니처

**결정**: 설계의 `remove(key: K)` 대신 `remove(...keys: K[])` 변경

**이유**: `auth.ts`의 `clearSession()`에서 4개 키를 한 번에 삭제하는 시나리오가 있어 더 유용.

### 결정 4: `API_BASE` 위치 — `constants.ts`로 이동

**결정**: 설계는 `api.ts` 내부 상수로 정의했으나 `constants.ts`로 이동

**이유**: `SuccessView.ts`에서도 "Sentinel에서 보기" 링크 생성에 `API_BASE`가 필요. 공유 상수 파일에 배치가 더 적합.

### 결정 5: 위반 유형 상수 수동 복사 (Phase 1 전략 유지)

**결정**: `src/constants/violations.ts`와 `extension/src/shared/constants.ts`를 수동 동기화

**이유**: `pnpm workspace` 재구성은 MS1 범위 초과. 설계 문서 Section 12의 Phase 1 전략 그대로 유지.

**장기 계획**: MS2에서 `packages/shared` 공유 패키지로 전환하여 drift 위험 제거.

---

## 8. Lessons Learned

### 8.1 잘 된 점 (Keep)

- **설계 선행의 효과**: 210개 체크리스트 항목을 포함한 세밀한 설계 문서로 인해 구현 시 방향성 혼란 없이 91% match rate 달성. 설계 문서 품질이 구현 품질에 직결됨.
- **Manifest V3 제약 사전 식별**: 설계 단계에서 Service Worker 기반 Background와 `chrome.alarms` 활용을 명시하여 구현 중 블로커 없음.
- **Shadow DOM 격리**: 아마존 페이지의 복잡한 CSS 환경에서 플로팅 버튼이 간섭 없이 동작. 설계 단계 결정의 올바름 검증.
- **폴백 셀렉터 패턴**: `SELECTORS` 객체에 배열로 폴백을 정의하여 아마존 DOM 변경에 대한 탄력적 대응 구조 확보.
- **타입 안전 스토리지**: `ExtensionStorage` 타입으로 chrome.storage.local 키를 제네릭으로 안전하게 관리, 오타로 인한 런타임 오류 사전 방지.

### 8.2 개선이 필요한 점 (Problem)

- **환경변수 패턴 미흡**: Supabase URL/Anon Key가 placeholder 값으로 하드코딩된 채 커밋됨. CLAUDE.md의 "API 키/시크릿 하드코딩 금지" 원칙을 구현 시작 전 `env.d.ts` + `.env.example` 파일을 함께 생성하는 루틴이 필요.
- **설계 문서의 빌드 경로**: 설계에서 매니페스트 경로를 소스 경로로 기술하여 Vite 빌드 출력 경로와 혼동. 설계 단계에서 빌드 아티팩트 경로를 명시하는 패턴 필요.
- **XSS 방어 초기 누락**: ReportFormView에서 DOM 데이터를 innerHTML로 삽입하는 초안이 작성됨. Content Script는 외부 페이지 데이터를 직접 다루므로 초기 설계 시 XSS 방어를 체크리스트 항목으로 명시해야 함.

### 8.3 다음에 시도할 것 (Try)

- **`.env.example` 파일 템플릿화**: Extension 프로젝트 시작 시 환경변수 파일을 첫 번째 deliverable로 생성하는 루틴 도입.
- **설계 문서에 빌드 아티팩트 경로 섹션 추가**: Vite/webpack 빌드를 사용하는 Extension이나 별도 빌드 프로세스가 있는 기능의 설계 시, "Build Output Paths" 섹션을 별도로 두어 소스 경로와 빌드 경로를 명확히 구분.
- **Security Checklist 항목 강화**: 분석 단계에서 XSS, 시크릿 하드코딩, 권한 최소화를 독립 체크리스트 섹션으로 분리하여 누락 방지.
- **pnpm workspace 공유 패키지**: MS2 시작 전 `packages/shared` 구조로 전환하여 Web과 Extension 간 위반 유형 상수 drift 문제를 근본적으로 해결.

---

## 9. Process Improvement Suggestions

### 9.1 PDCA 프로세스

| Phase | 현재 상태 | 개선 제안 |
|-------|----------|----------|
| Plan | MS1/MS2 경계 명확히 구분됨 | 유지 — 기능 단위 분리가 구현 집중도를 높임 |
| Design | 세밀한 체크리스트 효과적 | 빌드 아티팩트 경로 섹션 추가, Security 체크리스트 강화 |
| Do | 5개 Phase 순서 준수 효과 좋음 | `.env.example` 생성을 Phase 1 첫 번째 항목으로 추가 |
| Check | 210개 항목 체계적 검증 | 자동화 가능한 항목(파일 존재 확인, 타입체크) 스크립트화 검토 |

### 9.2 도구/환경

| 영역 | 개선 제안 | 예상 효과 |
|------|----------|----------|
| Extension 빌드 | `pnpm build:ext` 스크립트를 root package.json에 추가 | 단일 명령어로 Web + Extension 동시 빌드 |
| 공유 상수 | MS2에서 `packages/shared` 모노레포 구조 전환 | 위반 유형 drift 위험 제거 |
| 배포 | Google Workspace Admin Console ExtensionInstallForcelist 설정 | 오퍼레이터 수동 설치 불필요, 자동 업데이트 |

---

## 10. Next Steps

### 10.1 즉시 (배포 전)

- [ ] `extension/.env` 파일 생성 — 실제 Supabase URL/Anon Key 설정
- [ ] `extension/.env.example` 파일 생성 및 커밋 (키 값 제외)
- [ ] `pnpm build` 후 `extension/dist/` 폴더 생성 확인
- [ ] Chrome 개발자 모드에서 `dist/` 폴더 로드 테스트
- [ ] 아마존 상품 페이지(amazon.com, amazon.co.uk, amazon.co.jp)에서 플로팅 버튼 동작 확인
- [ ] `@spigen.com` 계정으로 Google OAuth 로그인 → 신고 제출 → Sentinel Web 대기열 도착 확인

### 10.2 단기 (설계 문서 업데이트)

- [ ] `extension.design.md` Section 4 — 매니페스트 경로를 Vite 빌드 출력 경로로 수정
- [ ] `extension.design.md` Section 5.4 — `CAPTURE_SCREENSHOT` 메시지 타입 추가
- [ ] `extension.design.md` Section 5.3 — `API_BASE` 위치를 `constants.ts`로 업데이트
- [ ] `extension.design.md` Section 6.1 — 응답 코드 200 → 201 수정
- [ ] `extension.design.md` Section 6.2 — 미인증 시 401 동작 명시
- [ ] `extension.design.md` Section 11 — `@anthropic-ai/sdk`를 MS2 의존성으로 이동

### 10.3 MS2 기능 (다음 PDCA 사이클)

| 기능 | 우선순위 | 비고 |
|------|---------|------|
| AI 분석 미리보기 | High | 제보 후 팝업에서 Claude 분석 결과 표시 |
| 중복 ASIN 체크 | High | `is_duplicate` 필드가 이미 API에 포함 — UI 경고만 추가 |
| 내 제보 상태 목록 | Medium | `GET /api/reports?created_by=me` 활용 |
| 버전 업데이트 알림 | Low | F31 — 새 버전 배포 시 설치 유도 |
| `packages/shared` 전환 | Medium | 위반 유형 상수 Web/Extension 공유 |
| Admin Console 배포 | High | `.crx` side-loading → 강제 배포 전환 |

---

## 11. Changelog

### v1.0.0 (2026-03-01)

**Added:**
- Chrome Extension Manifest V3 기반 프로젝트 구조 (Vite 멀티 엔트리 빌드)
- Content Script: 아마존 DOM 파서 (8개 마켓플레이스, 13개 필드, 폴백 셀렉터)
- Content Script: Shadow DOM 기반 플로팅 버튼 (Spigen orange #F97316)
- Service Worker: Supabase Auth (Google OAuth) + 5분 전 자동 토큰 갱신
- Service Worker: `captureVisibleTab()` 스크린샷 캡처 (2MB 자동 압축)
- Service Worker: Sentinel API 클라이언트 (JWT Bearer 인증)
- Popup UI: LoadingView / LoginView / ReportFormView / SuccessView
- Popup UI: ViolationSelector (5카테고리 × 19유형 2단계 셀렉트)
- Shared: 타입 안전 `chrome.storage.local` 래퍼
- Shared: `VIOLATION_TYPES`, `VIOLATION_CATEGORIES`, `VIOLATION_GROUPS`, `MARKETPLACE_MAP` 상수
- Web API: `POST /api/ext/submit-report` (listing + report 원자적 생성 + 스크린샷 업로드)
- Web API: `GET /api/ext/auth-status` (인증 상태 확인)

**Fixed:**
- `tabs` permission 추가 (`captureVisibleTab` 정상 동작)
- 위반 유형 미선택 시 제출 차단 (클라이언트 + 서버 양측 validation)
- 스크린샷 2MB 크기 제한 + JPEG fallback 자동 압축
- 복수 메시지 리스너 → 단일 리스너로 통합
- 역할(role) 하드코딩 제거 → DB 동적 조회
- `unknown` 타입 캐스트 → 타입 가드 적용
- XSS 취약점 → `escapeHtml()` + `textContent` 방어 적용
- Supabase URL/Anon Key → `import.meta.env.VITE_*` 환경변수 주입

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-01 | Extension MS1 PDCA completion report | Sentinel Team |
