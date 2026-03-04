# Crawler Deployment Plan

> **Feature**: Sentinel Crawler 서버 배포 (Railway + Redis + Proxy)
>
> **Project**: Sentinel (센티널)
> **Author**: Claude (AI)
> **Date**: 2026-03-03
> **Status**: Draft
> **Priority**: P0 (최우선)
> **Estimated Effort**: Medium (인프라 설정 위주, 코드 변경 최소)

---

## 1. Background

### 1.1 현재 상황

Sentinel Crawler 엔진 코드가 **17개 모듈, 26개 항목**으로 구현 완료되었습니다 (PDCA 96%, archived).
그러나 **배포 인프라가 없어** 실제 크롤링이 불가능한 상태입니다.

**완료된 것:**
- `crawler/src/` 전체 코드 (index, scheduler, scraper, anti-bot, API client)
- BullMQ 기반 스케줄링 + 재시도 로직
- Anti-bot 회피 (프록시, fingerprint, stealth, human behavior)
- Web API 연동 (3개 엔드포인트, 서비스 토큰 인증)
- pnpm workspace 통합 (`pnpm-workspace.yaml`)

**없는 것:**
- Dockerfile
- Railway 배포 설정
- Upstash Redis 계정/URL
- Bright Data 프록시 계정
- 프로덕션 환경변수 설정
- 헬스체크/모니터링

### 1.2 목표

Crawler를 **Railway.com**에 배포하여 실제 아마존 리스팅을 수집할 수 있는 상태로 만든다.

---

## 2. Requirements

### FR (Functional Requirements)

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| FR-01 | Crawler Dockerfile 작성 (Playwright 포함) | P0 |
| FR-02 | Railway 배포 설정 (railway.json or railway.toml) | P0 |
| FR-03 | TypeScript 빌드 파이프라인 (tsc → dist/) | P0 |
| FR-04 | Upstash Redis 연결 (BullMQ 큐) | P0 |
| FR-05 | Bright Data 프록시 연동 검증 | P0 |
| FR-06 | 환경변수 프로덕션 설정 (14개) | P0 |
| FR-07 | Web App에 CRAWLER_SERVICE_TOKEN 설정 (Vercel) | P0 |
| FR-08 | 헬스체크 엔드포인트 (/health) | P1 |
| FR-09 | Google Chat 알림 연동 (크롤링 완료/에러) | P2 |
| FR-10 | 로컬 docker-compose 개발환경 | P2 |

### NFR (Non-Functional Requirements)

| ID | 요구사항 | 기준 |
|----|----------|------|
| NFR-01 | 컨테이너 시작 시간 | < 30초 |
| NFR-02 | 메모리 사용량 | < 2GB (Playwright 포함) |
| NFR-03 | Graceful shutdown | SIGTERM 시 진행 중 잡 완료 후 종료 |
| NFR-04 | 로그 포맷 | JSON structured (Railway 로그 뷰어 호환) |
| NFR-05 | 비용 | < $20/월 (Railway Pro) |

---

## 3. Architecture

### 3.1 배포 아키텍처

```
┌──────────────────────────────────────────────────────────────┐
│                    Railway.com                                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Sentinel Crawler (Docker)                   │   │
│  │                                                       │   │
│  │  node dist/index.js                                   │   │
│  │    ├─ Scheduler (5분 주기 캠페인 동기화)                │   │
│  │    ├─ BullMQ Worker (크롤링 잡 실행)                    │   │
│  │    ├─ Playwright (headless Chromium)                    │   │
│  │    └─ Health Check HTTP (:8080/health)                 │   │
│  │                                                       │   │
│  └───────────┬───────────────────────┬───────────────────┘   │
│              │                       │                        │
└──────────────┼───────────────────────┼────────────────────────┘
               │                       │
     ┌─────────▼─────────┐   ┌────────▼──────────┐
     │  Upstash Redis     │   │  Bright Data       │
     │  (BullMQ Queue)    │   │  (Proxy Pool)      │
     │  redis://...       │   │  brd.superproxy.io │
     └───────────────────┘   └────────────────────┘
               │
     ┌─────────▼──────────────────────────────────┐
     │  Sentinel Web (Vercel)                      │
     │  ip-project-khaki.vercel.app                │
     │                                             │
     │  GET  /api/crawler/campaigns                │
     │  POST /api/crawler/listings                 │
     │  POST /api/crawler/listings/batch           │
     └─────────────────────────────────────────────┘
```

### 3.2 통신 흐름

```
1. Crawler 시작
   └─ Redis 연결 확인
   └─ BullMQ Queue + Worker 초기화
   └─ Scheduler 시작 (5분마다 캠페인 동기화)

2. 캠페인 동기화
   └─ GET /api/crawler/campaigns (Bearer 토큰)
   └─ 활성 캠페인별 BullMQ repeatable job 등록/갱신/삭제

3. 크롤링 잡 실행
   └─ Playwright 브라우저 생성 (Stealth + Fingerprint + Proxy)
   └─ 아마존 검색 → ASIN 추출 → 상세 파싱 → 스크린샷
   └─ POST /api/crawler/listings/batch (수집 데이터 전송)

4. 에러 시
   └─ 프록시 교체 후 재시도 (3회)
   └─ 3회 실패 → BullMQ backoff (60s → 2min → 4min)
   └─ Google Chat 알림 (선택)
```

---

## 4. Implementation Plan

### Phase 1: Dockerfile + 빌드 (P0)

| # | Task | Detail |
|---|------|--------|
| 1.1 | `crawler/Dockerfile` 작성 | `mcr.microsoft.com/playwright:v1.49.1-noble` 베이스 |
| 1.2 | `.dockerignore` 작성 | node_modules, .env, test 파일 제외 |
| 1.3 | `tsconfig.json` 빌드 설정 확인 | outDir: dist, target: ES2022, module: NodeNext |
| 1.4 | `package.json` 빌드 스크립트 추가 | `"build": "tsc"`, `"start": "node dist/index.js"` |
| 1.5 | 로컬 Docker 빌드 테스트 | `docker build -t sentinel-crawler .` |

### Phase 2: Railway 배포 설정 (P0)

| # | Task | Detail |
|---|------|--------|
| 2.1 | Railway 프로젝트 생성 | `sentinel-crawler` 서비스 |
| 2.2 | `railway.toml` 작성 | Builder: Dockerfile, Start command |
| 2.3 | 환경변수 14개 설정 | Railway Dashboard에서 직접 설정 |
| 2.4 | Vercel에 `CRAWLER_SERVICE_TOKEN` 추가 | Web App 측 인증 토큰 |
| 2.5 | 첫 배포 + 로그 확인 | `railway up` or GitHub 연동 배포 |

### Phase 3: Redis + 프록시 연동 (P0)

| # | Task | Detail |
|---|------|--------|
| 3.1 | Upstash Redis 계정 생성 | Free tier (10K commands/day) 또는 Pro |
| 3.2 | Redis 연결 테스트 | BullMQ Queue 생성 확인 |
| 3.3 | Bright Data 계정 확인/생성 | Residential 프록시 플랜 |
| 3.4 | 프록시 연결 테스트 | 아마존 접속 성공 확인 |

### Phase 4: 헬스체크 + 모니터링 (P1)

| # | Task | Detail |
|---|------|--------|
| 4.1 | `/health` HTTP 엔드포인트 추가 | Redis 연결 + Worker 상태 반환 |
| 4.2 | Railway Health Check 설정 | healthcheckPath: /health |
| 4.3 | Graceful shutdown 검증 | SIGTERM → 진행 잡 완료 → 종료 |

### Phase 5: 개발환경 + 옵션 (P2)

| # | Task | Detail |
|---|------|--------|
| 5.1 | `docker-compose.yml` 작성 | Crawler + Redis (로컬 개발용) |
| 5.2 | Google Chat Webhook 설정 | 크롤링 완료/에러 알림 |
| 5.3 | 첫 캠페인 실제 크롤링 테스트 | 소규모 키워드로 E2E 검증 |

---

## 5. Tech Stack

| 영역 | 기술 | 비고 |
|------|------|------|
| Container | Docker (Playwright 공식 이미지) | `mcr.microsoft.com/playwright:v1.49.1-noble` |
| Hosting | Railway.com | Docker 서비스, $5~20/월 |
| Queue/Cache | Upstash Redis | BullMQ 전용, 서버리스 Redis |
| Proxy | Bright Data | Residential 프록시, 세션 기반 |
| 알림 | Google Chat Webhook | 선택사항 |
| 빌드 | TypeScript → tsc → Node.js ESM | `"type": "module"` |

---

## 6. Environment Variables

### Railway (Crawler)

| 변수 | 필수 | 설명 | 예시 |
|------|:----:|------|------|
| `SENTINEL_API_URL` | O | Web App URL | `https://ip-project-khaki.vercel.app` |
| `SENTINEL_SERVICE_TOKEN` | O | 서비스 인증 토큰 | (랜덤 생성) |
| `UPSTASH_REDIS_URL` | O | Redis 연결 문자열 | `redis://default:xxx@xxx.upstash.io:6379` |
| `BRIGHTDATA_PROXY_HOST` | O | 프록시 호스트 | `brd.superproxy.io` |
| `BRIGHTDATA_PROXY_PORT` | O | 프록시 포트 | `22225` |
| `BRIGHTDATA_PROXY_USER` | O | 프록시 사용자명 | (Bright Data 계정) |
| `BRIGHTDATA_PROXY_PASS` | O | 프록시 비밀번호 | (Bright Data 계정) |
| `CRAWLER_CONCURRENCY` | - | 동시 크롤링 수 | `3` |
| `CRAWLER_PAGE_DELAY_MIN` | - | 페이지 딜레이 최소 | `2000` |
| `CRAWLER_PAGE_DELAY_MAX` | - | 페이지 딜레이 최대 | `5000` |
| `CRAWLER_DETAIL_DELAY_MIN` | - | 상세 딜레이 최소 | `1500` |
| `CRAWLER_DETAIL_DELAY_MAX` | - | 상세 딜레이 최대 | `4000` |
| `CRAWLER_MAX_RETRIES` | - | 재시도 횟수 | `3` |
| `GOOGLE_CHAT_WEBHOOK_URL` | - | 알림 Webhook | (Google Chat URL) |

### Vercel (Web App에 추가)

| 변수 | 설명 |
|------|------|
| `CRAWLER_SERVICE_TOKEN` | Railway Crawler와 동일한 토큰 값 |

---

## 7. Dockerfile Strategy

### Base Image 선택

**`mcr.microsoft.com/playwright:v1.49.1-noble`** 사용 이유:
- Playwright + Chromium이 미리 설치됨 (별도 `npx playwright install` 불필요)
- Ubuntu Noble (24.04) 기반, 안정적
- 이미지 크기 ~1.5GB (Chromium 포함 불가피)

### 빌드 단계

```
1. playwright 이미지 사용
2. WORKDIR /app
3. package.json + pnpm-lock.yaml 복사
4. pnpm install --frozen-lockfile --prod
5. TypeScript 소스 복사
6. tsc 빌드 → dist/
7. CMD ["node", "dist/index.js"]
```

### 최적화

- Multi-stage 빌드: 빌드 스테이지 (devDependencies) → 런타임 스테이지 (dependencies만)
- `.dockerignore`로 불필요 파일 제외
- pnpm 사용 (`corepack enable`)

---

## 8. Risk & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|:------:|:----------:|------------|
| Bright Data 프록시 미확보 | 크롤링 불가 | Medium | 대안: Oxylabs, SmartProxy 검토 |
| Railway 무료 플랜 제한 | 실행 시간 제한 | Low | Pro 플랜 ($5/월) 사용 |
| Playwright 메모리 초과 | 컨테이너 OOM | Medium | concurrency 2로 제한, 1GB→2GB RAM |
| 아마존 IP 차단 | 크롤링 실패율 증가 | Medium | 프록시 풀 5→10개 확대, 딜레이 증가 |
| Redis 무료 플랜 한도 | 큐 처리 중단 | Low | Upstash Pro ($10/월) 전환 |
| 서비스 토큰 유출 | 비인가 API 접근 | Low | 환경변수 관리, 토큰 주기적 교체 |

---

## 9. Success Criteria

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-01 | Docker 빌드 성공 | `docker build` 오류 없음 |
| SC-02 | Railway 배포 성공 | 서비스 Running 상태 |
| SC-03 | Redis 연결 성공 | 헬스체크 200 OK |
| SC-04 | 캠페인 동기화 동작 | 로그에서 캠페인 목록 조회 확인 |
| SC-05 | 실제 크롤링 1회 성공 | 아마존에서 리스팅 수집 → DB 저장 확인 |
| SC-06 | 프록시 경유 확인 | 로그에서 프록시 IP 로테이션 확인 |
| SC-07 | Graceful shutdown | SIGTERM 시 잡 완료 후 종료 |
| SC-08 | 에러 시 알림 | Google Chat에 에러 알림 수신 (P2) |

---

## 10. Out of Scope

- SC 자동화 서버 사이드 (Cookie Injection 방식) — 현재 Extension에서 처리
- Follow-up 재방문 로직 구현 — 타입만 정의된 상태, 별도 PDCA로 진행
- Crawler 코드 수정 — 이미 완료 (96%), 배포 인프라만 추가
- CI/CD 파이프라인 — Railway GitHub 연동으로 자동 배포
- 다중 인스턴스 / 로드밸런싱 — 단일 인스턴스로 시작

---

## 11. Dependencies

### 외부 계정 (사용자 확인 필요)

| 서비스 | 필요 여부 | 현재 상태 | Action |
|--------|:---------:|:---------:|--------|
| Railway.com | 필수 | 미확인 | 계정 생성 + Pro 플랜 |
| Upstash Redis | 필수 | 미확인 | 계정 생성 + DB 생성 |
| Bright Data | 필수 | 미확인 | 계정 + Residential 프록시 |
| Google Chat | 선택 | 미확인 | Webhook URL 생성 |

### 내부 의존성

| 항목 | 상태 |
|------|------|
| Crawler 코드 (`crawler/src/`) | 완료 |
| Web API (`/api/crawler/*`) | 완료 |
| Service Auth Middleware | 완료 |
| Middleware 경로 예외 처리 | 완료 |

---

## 12. Timeline

| Phase | 작업 | 예상 |
|:-----:|------|:----:|
| Phase 1 | Dockerfile + 빌드 | 코드 작업 |
| Phase 2 | Railway 설정 + 배포 | 사용자 계정 필요 |
| Phase 3 | Redis + 프록시 연동 | 사용자 계정 필요 |
| Phase 4 | 헬스체크 + 모니터링 | 코드 작업 |
| Phase 5 | 개발환경 + E2E 테스트 | 최종 검증 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-03 | Initial plan | Claude (AI) |
