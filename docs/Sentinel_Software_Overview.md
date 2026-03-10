# Sentinel (센티널) — 소프트웨어 전체 기획 기술 정리서

> **목적**: 이 문서는 Sentinel 플랫폼의 전체 기획, 아키텍처, 기술 스택, 파이프라인, 기능을 한 눈에 파악하기 위한 **교육/온보딩용 종합 문서**입니다.
> 새로운 개발자, 팀원, 또는 협업자가 이 문서를 읽으면 시스템 전체를 이해할 수 있습니다.
>
> **최종 업데이트**: 2026-03-08
> **버전**: 0.9.0-beta (Web) / 1.5.0 (Extension)

---

## 1. 제품 개요

### 한 줄 요약

아마존 마켓플레이스에서 경쟁사 리스팅의 **폴리시 위반을 자동 탐지**하고, **AI로 신고서를 작성**하여 **PD(Product Detail) 페이지 신고 + BR(Brand Registry) 케이스 관리를 자동화**하는 Spigen 브랜드 보호 플랫폼.

### 핵심 가치

| 기존 (AS-IS) | Sentinel (TO-BE) |
|------|------|
| 하루 200개+ 리스팅 수동 브라우징 | 크롤러가 자동 수집 + AI가 위반 판단 |
| 사람이 눈으로 위반 확인 | Claude AI가 이미지+텍스트+특허 교차 분석 |
| 엑셀에 수동 정리 | 자동 분류 + 신고서 드래프트 생성 |
| Seller Central에 직접 신고 | 승인 후 PD Reporting + BR 케이스 자동 제출 |
| 제출 후 결과 추적 없음 | 자동 모니터링 + 케이스 관리 |

### 사용자

- Spigen 브랜드 보호 팀 (아마존 마켓플레이스 담당)
- @spigen.com 도메인 Google OAuth 인증
- 3단계 권한: **Admin** > **Editor** > **Viewer**

---

## 2. 시스템 아키텍처

### 3개 컴포넌트 구성

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Sentinel 플랫폼                              │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Sentinel Web    │  │  Sentinel        │  │  Sentinel        │  │
│  │  (Next.js)       │  │  Crawler         │  │  Extension       │  │
│  │                  │  │  (Node.js)       │  │  (Chrome MV3)    │  │
│  │  • 대시보드       │  │                  │  │                  │  │
│  │  • 신고 관리      │  │  • 키워드 크롤링  │  │  • 원클릭 제보    │  │
│  │  • AI 분석        │  │  • SC 자동 신고   │  │  • DOM 파싱      │  │
│  │  • 승인 워크플로우 │  │  • BR 자동 신고   │  │  • 스크린샷      │  │
│  │  • 케이스 관리     │  │  • 모니터링       │  │  • Auto-Report   │  │
│  │  • 설정           │  │  • 답장 발송      │  │                  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│          │                      │                      │            │
│          └──────────┬───────────┘                      │            │
│                     │                                  │            │
│  ┌──────────────────┴──────────────────────────────────┴──────┐    │
│  │                    Supabase                                  │    │
│  │  PostgreSQL (DB) + Google OAuth + Storage + RLS              │    │
│  └──────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 배포 환경

| 컴포넌트 | 플랫폼 | 비고 |
|---------|--------|------|
| Web | Vercel | Next.js 15 App Router |
| Crawler | Railway | Node.js + Playwright |
| Extension | .crx 사내 배포 | Chrome Manifest V3 |
| Database | Supabase | PostgreSQL + Auth + Storage |

---

## 3. 기술 스택 상세

### 프론트엔드 (Web)

| 기술 | 용도 | 버전 |
|------|------|------|
| Next.js 15 | App Router, Server Components, API Routes | 16.1.6 |
| React 19 | UI 렌더링 | 19.2.3 |
| TypeScript | 타입 안전성 | strict mode |
| Tailwind CSS 4 | 스타일링 | PostCSS |
| Recharts | 대시보드 차트 | 3.7.0 |
| Lucide React | 아이콘 | 0.575.0 |

### 백엔드 / 인프라

| 기술 | 용도 |
|------|------|
| Supabase PostgreSQL | 메인 데이터베이스 (RLS 적용) |
| Supabase Auth | Google OAuth (@spigen.com 한정) |
| Supabase Storage | 스크린샷, 첨부파일 저장 |
| Vercel Serverless | API Routes (Next.js) |

### 크롤러

| 기술 | 용도 |
|------|------|
| Node.js | 런타임 |
| Playwright | 브라우저 자동화 (아마존, PD, BR) |
| BullMQ | 작업 큐 / 스케줄링 |
| Bright Data / Oxylabs | 프록시 (Anti-bot 우회) |

### AI 엔진

| 모델 | 용도 |
|------|------|
| Claude Opus | 프롬프트 학습/최적화 (주간) |
| Claude Sonnet | 신고서 드래프트 자동 작성 |
| Claude Haiku | 모니터링 AI 판단 (빠른 분류) |

### 외부 연동

| 서비스 | 용도 |
|--------|------|
| Monday.com GraphQL API | 특허 데이터 동기화 (단방향, 하루 1회) |
| Amazon Product Detail | PD Reporting — Extension이 리스팅 페이지에서 위반 신고 |
| Amazon Brand Registry | BR 케이스 제출 + 케이스 모니터링 (Playwright) |

---

## 4. 핵심 파이프라인

### 4.1 신고 파이프라인 (메인 플로우)

```
1. 수집 (Collection)
   크롤러: 키워드 캠페인 기반 자동 수집
   익스텐션: 오퍼레이터 원클릭 제보
         ↓
2. AI 분석 (Analysis)
   Claude AI가 이미지 + 텍스트 + 특허 교차 분석
   위반 유형 자동 분류 (V01~V19)
   위반 확신도 점수 산출
         ↓
3. 드래프트 생성 (Draft)
   Claude Sonnet이 신고서 자동 작성
   위반 유형별 맞춤 템플릿 적용
         ↓
4. 승인 (Approval)
   Editor/Admin이 내용 검토 + 승인/수정
         ↓
5. 자동 신고 (Submission)
   ├── Track A: Seller Central (PD) → Report a Violation
   └── Track B: Brand Registry (BR) → Report Infringement
         ↓
6. 모니터링 (Monitoring)
   ├── Track 1: 리스팅 모니터링 — 상품 페이지 재방문, 삭제/수정 감지
   └── Track 2: BR 케이스 모니터링 — 아마존 응답, 상태 변화 추적
         ↓
7. 후속 조치 (Follow-up)
   미해결 → AI 강화 재신고 / 에스컬레이션
   해결 → 완료 처리
```

### 4.2 Report 라이프사이클

```
Draft → Review → Approve (또는 Re-write)
  → Submitted → Monitoring (AI 자동 모니터링)
  → Done / Re-submitted / Escalated
```

상태 전환:
- **Draft**: AI 드래프트 생성됨, 검토 대기
- **Review**: Editor가 검토 중
- **Approved**: 승인됨, 제출 대기
- **Submitted**: PD/BR에 자동 제출 완료
- **Monitoring**: 제출 후 결과 모니터링 중
- **Done**: 아마존이 조치 완료 (리스팅 삭제/수정)
- **Re-submitted**: 미해결로 재신고

---

## 5. 위반 유형 체계

### 5카테고리 19개 위반 유형 (V01~V19)

| 카테고리 | 위반 유형 |
|---------|----------|
| **Trademark** | V01 상표 침해, V02 무단 상표 사용, V03 유사 상표 |
| **Copyright** | V04 이미지 무단 사용, V05 컨텐츠 카피, V06 디자인 모방 |
| **Patent** | V07 유틸리티 특허 침해, V08 디자인 특허 침해 |
| **Listing Content** | V09 변형, V10 메인 이미지, V11 잘못된 카테고리, V12 리뷰 위반, V13 사전 출시 리스팅, V14 중복 리스팅 |
| **Counterfeit** | V15 위조품, V16~V19 기타 |

> 상세 정의: `src/constants/violations.ts` 참조

---

## 6. 두 트랙 모니터링 체계

### Track 1: 리스팅 모니터링 (기존)

- **대상**: 아마존 상품 상세 페이지
- **방식**: 크롤러가 ASIN 주기적 재방문 → 스냅샷 diff
- **주기**: 7일마다
- **감지 항목**: 리스팅 삭제, 제목/설명/이미지 변경, 가격 변경, 셀러 변경
- **목적**: 신고 "결과" 추적 — 위반 리스팅이 실제로 변했는지
- **코드**: `/api/monitoring/*`, `crawler/src/follow-up/`

### Track 2: BR 케이스 모니터링 (신규 — 개발 예정)

- **대상**: Amazon Brand Registry Case Dashboard
- **방식**: 케이스 페이지 Playwright 스크래핑 → 상태/답장 추출
- **주기**: 30분마다
- **감지 항목**: 아마존 응답, 케이스 상태 변화, 추가 정보 요청
- **목적**: 신고 "과정" 추적 — 아마존이 어떻게 처리하고 있는지
- **코드**: `/api/crawler/br-monitor-*` (신규)

### 연동 규칙

- 리스팅 삭제 감지 (Track 1) → BR 케이스도 자동 resolved
- BR 케이스 해결 (Track 2) → 리스팅 모니터링도 종료
- 둘 다 미해결 → 에스컬레이션 전략 분기

### 아마존 거부 시 대응 전략

| 전략 | 설명 | 조건 |
|------|------|------|
| Reply & Reopen | BR Reply로 추가 증거 + 반박 제출 | 증거 보강 가능 시 |
| New Case | 새 BR 케이스로 에스컬레이션 | 기존 케이스 진전 없을 시 |
| Accept | 아마존 판단 수용 → resolved | AI 판단으로도 위반 약함 |
| 다른 채널 | SC Report a Violation으로 재시도 | BR에서 반복 거부 시 |

---

## 7. 브라우저 자동화 아키텍처

### 브라우저 풀 (Persistent Context)

```
Crawler 시작 (오퍼레이터 로그인 1회)
  │
  ├── Browser 1: PD Reporting (Extension 전용, Crawler 미사용)
  │   └── Extension이 Product Detail 페이지에서 직접 신고
  │   └── 케이스 ID 없음 — 추적 불가, 주기적 재방문으로 확인
  │
  ├── Browser 2: BR 제출 전용
  │   └── user-data-dir: /tmp/br-submit-data/
  │   └── Brand Registry → Report Infringement
  │
  └── Browser 3: BR 모니터링 + 답장 전용
      └── user-data-dir: /tmp/br-monitor-data/
      └── Case Dashboard 스크래핑, Reply 발송, Case Close
```

- 각 브라우저는 **독립 user-data-dir**로 세션 격리
- 로그인 1회 후 하루종일 재사용 (쿠키 유지)
- BullMQ 큐로 **동시성 1** 제어 (한 번에 하나만 작업)

### KAT 웹 컴포넌트 (Amazon 전용)

Amazon은 `kat-*` Shadow DOM 웹 컴포넌트를 사용:
- `kat-input`, `kat-textarea` → 텍스트 입력 시 `nativeInputValueSetter` 사용 필요
- `kat-button` → label 속성으로 버튼 식별
- `kat-dropdown` → 선택 항목 자동화
- Shadow DOM 내부 접근: `element.shadowRoot.querySelector()`

### BR 폼 자동 채우기 — Playwright Crawler 전용 (Extension 불가)

> **결론**: BR 폼 채우기는 **Crawler(Playwright)에서만 가능**. Extension(Content Script)은 구조적으로 불가.

**불가 원인 (Extension)**:
1. BR 폼은 `spl-hill-form` → shadowRoot → **iframe** → `kat-*` 구조. Chrome Extension content script는 **Isolated World**에서 실행되어 shadow DOM 내부 iframe의 `contentDocument` 접근 불가
2. MAIN world 실행(`chrome.scripting.executeScript({ world: 'MAIN' })`) 시도했으나, Vite 빌드된 함수의 직렬화 문제로 결과 미반환
3. `<script>` 인라인 주입은 Amazon BR 페이지 CSP가 차단
4. KAT 메뉴 확장(`kat-expander`)은 `isTrusted=true` 물리 클릭 필요 — 프로그래밍 `.click()`은 `isTrusted=false`

**BR 폼 DOM 구조** (2026-03 확인):
```
메인 프레임 (brandregistry.amazon.com/cu/contact-us)
  ├── 좌측 메뉴: kat-expander → li.cu-tree-browseTree-ctExpander-type
  └── 우측 폼 영역:
      └── spl-hill-form (custom element)
          └── shadowRoot (open)
              └── iframe.spl-element-frame
                  (src: brandregistry.amazon.com/hill/website/form/{id})
                  └── kat-label → "라벨 텍스트"
                      kat-textarea / kat-input (custom element)
                        └── shadowRoot (open)
                            └── native textarea / input
```

**필드 찾기 전략**: 라벨 텍스트 기반 (`kat-label.textContent.startsWith(prefix)`) → 다음 형제에서 `kat-textarea`/`kat-input` → shadowRoot → native element

**값 입력 패턴**: `Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(native, value)` + `input`/`change` 이벤트 dispatch

**Playwright 장점**: CDP(Chrome DevTools Protocol) 기반으로 MAIN world 접근 + `page.frames()`에서 shadow DOM 내부 iframe도 자동 탐지 + 실제 물리 클릭 시뮬레이션

---

## 8. 데이터 모델 요약

### 핵심 테이블

| 테이블 | 용도 |
|--------|------|
| `users` | Supabase Auth 사용자 (role: admin/editor/viewer) |
| `campaigns` | 크롤링 캠페인 (키워드 + 기간 + 국가 + 빈도) |
| `listings` | 수집된 아마존 리스팅 데이터 |
| `reports` | 신고서 (드래프트 → 승인 → 제출 → 모니터링) |
| `patents` | Monday.com에서 동기화한 특허 데이터 |
| `listing_snapshot` | 리스팅 스냅샷 이력 (모니터링 diff용) |

### BR 케이스 관리 테이블 (개발 예정)

| 테이블 | 용도 |
|--------|------|
| `br_case_messages` | BR 대화 이력 (inbound/outbound) |
| `br_case_notes` | 팀 내부 메모 |
| `br_case_events` | 케이스 활동 로그 |
| `br_sla_configs` | SLA 규칙 설정 |

### reports 테이블 주요 컬럼

| 컬럼 | 용도 |
|------|------|
| `status` | Report 상태 (draft, review, approved, submitted, monitoring, done) |
| `violation_category`, `violation_type` | 위반 분류 |
| `sc_submit_data` | SC 자동 신고용 데이터 (JSONB) |
| `br_submit_data` | BR 자동 신고용 데이터 (JSONB) |
| `br_case_id` | BR 케이스 번호 (신고 후 연결) |
| `br_case_status` | BR 케이스 상태 (개발 예정) |
| `parent_report_id` | 케이스 연결 (재신고/에스컬레이션) |
| `resubmit_count` | 재신고 횟수 |

---

## 9. 인증 및 권한 (RBAC)

| 역할 | 권한 |
|------|------|
| **Admin** | 전체 권한 — 사용자 관리, 설정, 승인, 삭제 |
| **Editor** | 신고서 작성/검토/승인, 캠페인 관리 |
| **Viewer** | 읽기 전용 — 대시보드, 리포트 조회 |

- Google OAuth (@spigen.com 도메인 한정)
- 가입 즉시 Viewer 자동 배정, Admin이 승격

---

## 10. 주요 기능 목록

### 현재 구현 완료

| 기능 | 상태 |
|------|------|
| 키워드 캠페인 기반 크롤링 | 완료 |
| Extension 원클릭 제보 | 완료 (v1.5.0) |
| Claude AI 위반 분석 (이미지+텍스트+특허) | 완료 |
| 신고서 AI 드래프트 자동 생성 | 완료 |
| Editor/Admin 승인 워크플로우 | 완료 |
| SC 자동 신고 (Seller Central) | 완료 |
| BR 자동 신고 (Brand Registry) | 완료 |
| Extension Auto-Report (원클릭 자동 신고) | 완료 |
| 리스팅 모니터링 (Track 1) | 완료 |
| 대시보드 (Masonry 위젯) | 완료 |
| 특허 레지스트리 (Monday.com Sync) | 완료 |
| 모바일 반응형 UI | 완료 |

### 개발 예정 (BR 케이스 관리)

| # | 기능 | 중요도 | Phase |
|---|------|:------:|:-----:|
| R01 | 케이스 상태 분리 (Awaiting Amazon / Action Required) | ★★★★★ | 1 |
| R02 | SLA 카운트다운 뱃지 | ★★★★☆ | 2 |
| R03 | 대화 스레드 뷰 + 내부 메모 | ★★★★★ | 2 |
| R04 | Needs Attention 스마트 큐 | ★★★★★ | 1 |
| R05 | 케이스 활동 로그 | ★★★★☆ | 2 |
| R06 | 알림/에스컬레이션 규칙 | ★★★★☆ | 3 |
| R07 | 케이스 연결 (Parent-Child) | ★★★☆☆ | 1 |
| R08 | AI 응답 분석 + 행동 제안 | ★★★☆☆ | 3 |
| R09 | BR 케이스 대시보드/통계 | ★★★☆☆ | 3 |
| R10 | 양방향 답장 (Reply + 파일 첨부) | ★★★★★ | 2 |
| R11 | BR 케이스 자동 스크래핑 (모니터링 워커) | ★★★★★ | 1 |

> 상세 명세: `docs/02-design/features/br-case-management/` 참조
> 마스터 플랜: `docs/01-plan/features/br-case-management.plan.md` 참조

---

## 11. Extension 아키텍처

### Chrome Manifest V3

```
extension/
  src/
    content/     → Content Script (아마존 DOM 파싱, 스크린샷)
    popup/       → 위반 신고 UI (React)
    background/  → Service Worker (API 통신)
```

### 주요 기능

- 아마존 상품 페이지에서 자동 DOM 파싱 (제목, 이미지, 셀러 정보)
- 원클릭 위반 제보 → Sentinel Web API로 전송
- Auto-Report: 제보 → AI 분석 → 드래프트 → 승인까지 자동 진행
- 스크린샷 캡처 (WebP, q40/300KB)
- .crx 사내 배포 (Chrome Web Store 비공개)

---

## 12. AI 프롬프트 전략

### 3단계 AI 모델 활용

| 단계 | 모델 | 용도 |
|------|------|------|
| 학습/최적화 | Claude Opus | 주간 프롬프트 분석 → 프롬프트 개선 |
| 드래프트 작성 | Claude Sonnet | 신고서 AI 작성 (위반 유형별 맞춤) |
| 모니터링 판단 | Claude Haiku | 빠른 분류 (리스팅 변화 감지, 응답 분석) |

### 분석 입력

- 리스팅 이미지 (최대 5장)
- 리스팅 텍스트 (제목, 설명, 불릿 포인트)
- 특허 데이터 (해당 시)
- 위반 유형 가이드라인

---

## 13. 프로젝트 구조

```
src/
  app/                    # Next.js App Router
    (auth)/               # 인증 라우트 그룹
    (protected)/          # 인증 필요 페이지
      dashboard/          # 대시보드 (Masonry 위젯)
      campaigns/          # 캠페인 관리
      reports/            # 신고 관리
      settings/           # 설정
    api/                  # API Routes
      campaigns/          # 캠페인 CRUD
      reports/            # 신고 관리 (bulk-submit, force-resubmit 등)
      listings/           # 리스팅 데이터
      patents/            # 특허 레지스트리
      ai/                 # Claude AI 분석
      monitoring/         # 리스팅 모니터링 (Track 1)
      crawler/            # 크롤러 연동 (PD/BR 제출, 모니터링)
  components/
    ui/                   # 기본 UI (Button, Input, Modal, Badge 등)
    features/             # 비즈니스 컴포넌트 (ReportCard, CampaignForm 등)
    layout/               # Header, Sidebar, Navigation, MobileTabBar
  lib/                    # 유틸리티, 헬퍼
    supabase/             # Supabase 클라이언트 설정
    ai/                   # Claude API 호출 로직
  hooks/                  # Custom React Hooks
  types/                  # TypeScript 타입 정의
  services/               # 외부 API 클라이언트
  constants/              # 위반 유형, 상수

crawler/                  # Sentinel Crawler (별도 패키지)
  src/
    scraper/              # 아마존 페이지 스크래핑
    br-submit/            # Brand Registry 자동 신고
    anti-bot/             # 프록시, Fingerprint
    scheduler/            # BullMQ 스케줄러
    follow-up/            # 팔로업 모니터링

extension/                # Chrome Extension (Manifest V3)
  src/
    content/              # Content Script
    popup/                # 위반 신고 UI
    background/           # Service Worker

docs/                     # 문서
  01-plan/                # 기획 문서
  02-design/              # 설계 명세
  04-report/              # 완료 보고서
```

---

## 14. 코딩 컨벤션

| 규칙 | 내용 |
|------|------|
| TypeScript | `type` 사용 (`interface` 자제), `enum` 금지 → `as const`, `any` 금지 |
| Naming | 컴포넌트: PascalCase, 함수: camelCase, 상수: UPPER_SNAKE_CASE |
| React | 함수 컴포넌트 (arrow function), Server Components 기본 |
| Styling | Tailwind CSS만 사용 (inline styles 금지) |
| Import | 절대 경로 (`@/components/...`), 외부 → 내부 → 상대 순서 |
| Export | named export (page.tsx 제외) |
| 보안 | API 키/시크릿 → 환경변수, console.log → 디버깅 후 반드시 제거 |

---

## 15. 배포 프로세스

```
1. 로컬 검증
   pnpm typecheck && pnpm lint && pnpm build

2. Preview 배포
   npx vercel          ← Preview URL 생성 후 확인

3. Production 배포
   npx vercel --prod   ← 확인 후 라이브 반영
```

**필수 규칙:**
- Preview 없이 바로 `--prod` 금지
- DB 스키마 변경 → Supabase SQL Editor에서 먼저 적용 후 코드 배포
- Crawler → Railway에서 별도 배포 (`git push`로 자동 빌드)

---

## 16. 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-03-08 | 문서 초판 작성, BR 케이스 관리 시스템 계획 포함 |
| 2026-03-08 | 두 트랙 모니터링 체계, 아마존 거부 대응 전략 추가 |
| 2026-03-09 | BR 폼 자동 채우기: Extension 불가 사유 + Crawler 전용 DOM 구조 기술 명시 |
