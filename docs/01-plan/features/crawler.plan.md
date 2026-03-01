# Crawler Planning Document

> **Summary**: 아마존 마켓플레이스 리스팅 자동 수집 크롤러 — 키워드 캠페인 기반 Playwright 브라우저 자동화
>
> **Project**: Sentinel (센티널)
> **Version**: 0.1
> **Author**: Claude (AI)
> **Date**: 2026-03-01
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

아마존 마켓플레이스에서 캠페인(키워드 + 국가 + 빈도)에 따라 리스팅을 자동 수집하고, Sentinel Web API를 통해 DB에 저장하는 백그라운드 크롤러. 수집된 데이터는 AI 위반 분석의 입력 소스가 된다.

### 1.2 Background

- 현재: 오퍼레이터가 하루 200개+ 리스팅을 수동 브라우징 → 막대한 시간, 누락 불가피
- 목표: 키워드 캠페인 등록 시 크롤러가 자동으로 1~5페이지 리스팅 수집 → DB 적재 → 신고 대기열 표시
- MS1의 마지막 미완료 컴포넌트 (Web ✅, Extension ✅, Crawler ⏳)
- Crawler 완료 시 MS1 검증 가능: "크롤러로 수집한 리스팅 + Extension 제보가 Sentinel Web 대기열에 표시되는가?"

### 1.3 Related Documents

- 기획: `Sentinel_Project_Context.md` (Section 3, 6, 6-1, 7)
- 설계 참조: `docs/archive/2026-03/sentinel/sentinel.design.md` (DD-01, DD-02, campaigns 테이블, /api/listings)
- Extension: `docs/archive/2026-03/extension/` (구현 완료)

---

## 2. Scope

### 2.1 In Scope

- [x] F01: 키워드 기반 리스팅 검색 및 목록 수집 (검색 결과 페이지 파싱)
- [x] F02: 리스팅 상세 정보 수집 (제목, 설명, 이미지, 가격, 리뷰, 셀러 정보)
- [x] F03: Anti-bot 회피 (프록시 로테이션, Fingerprint 랜덤화, 사람 행동 모방)
- [x] F04a: US 마켓플레이스 지원 (amazon.com)
- [x] F05: BullMQ 기반 스케줄링 및 자동 실행 관리

### 2.2 Out of Scope (MS2/MS3)

- F04b: 다국가 마켓플레이스 확장 (UK, JP 등) — MS3
- F19: 신고 후 리스팅 자동 재방문 (팔로업 모니터링) — MS3
- F35: 모니터링 스크린샷 + AI 리마크 — MS3
- AI 위반 분석 (Claude API 연동) — MS2
- SC 자동 신고 — MS2

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 캠페인 ID로 키워드 + 국가 조회 후 아마존 검색 실행 | High | Pending |
| FR-02 | 검색 결과 1~N 페이지 파싱 (ASIN, 제목, 가격, 이미지URL, 셀러) | High | Pending |
| FR-03 | 각 리스팅 상세 페이지 방문 → 전체 데이터 수집 (설명, 불릿, 이미지 전체, 리뷰 요약, 셀러 정보) | High | Pending |
| FR-04 | 수집 데이터를 Sentinel Web API (`POST /api/listings`)로 전송 | High | Pending |
| FR-05 | BullMQ 큐에 캠페인별 스케줄 등록 (daily/weekly/hourly) | High | Pending |
| FR-06 | 프록시 로테이션 (Bright Data / Oxylabs) | High | Pending |
| FR-07 | 브라우저 Fingerprint 랜덤화 (User-Agent, viewport, WebGL, plugins) | High | Pending |
| FR-08 | 사람 행동 모방 (랜덤 딜레이, 마우스 움직임, 스크롤 패턴) | Medium | Pending |
| FR-09 | CAPTCHA/차단 감지 시 세션 중단 → 다른 프록시로 재시도 (최대 3회) | High | Pending |
| FR-10 | 스크린샷 캡처 (1280x800, 각 리스팅 상세 페이지) | Medium | Pending |
| FR-11 | 캠페인 활성/비활성 상태 반영 (paused 캠페인은 스킵) | High | Pending |
| FR-12 | 수집 결과 로그 (성공/실패 건수, 차단 횟수) → Web API 리포트 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| 성능 | 캠페인당 1~5페이지 수집 완료 < 5분 | 실행 시간 로그 |
| 안정성 | CAPTCHA 차단 시 자동 복구 (3회 재시도) | 에러 로그 |
| 확장성 | 동시 캠페인 5개 병렬 처리 | BullMQ concurrency |
| 보안 | API 키/프록시 크레덴셜 환경변수 관리 | .env 검증 |
| 비용 | 프록시 비용 최적화 (불필요 요청 최소화, 캐싱) | 월별 비용 모니터링 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `pnpm --filter crawler build` 성공
- [ ] US 마켓플레이스에서 키워드 검색 → 리스팅 목록 수집 동작
- [ ] 리스팅 상세 정보(제목, 가격, 이미지, 셀러) 수집 동작
- [ ] Sentinel Web API (`POST /api/listings`) 전송 성공
- [ ] BullMQ 스케줄러로 주기적 실행 동작
- [ ] 프록시 로테이션 동작 (최소 1개 프록시 서비스 연동)
- [ ] TypeScript typecheck 통과
- [ ] CLAUDE.md 코딩 컨벤션 준수

### 4.2 Quality Criteria

- [ ] Zero lint errors
- [ ] Build succeeds
- [ ] 최소 1개 캠페인으로 E2E 수집 테스트 성공

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 아마존 Anti-bot 탐지로 IP 차단/CAPTCHA | High | High | 주거지 프록시, Fingerprint 랜덤화, 요청 간격 2~5초, 사람 행동 모방 |
| 아마존 HTML 구조 변경 | High | Medium | 셀렉터 모듈화, 변경 감지 시 알림, 빠른 패치 |
| 프록시 비용 초과 | Medium | Medium | 수집 빈도/페이지 수 제한, 캐싱, 비용 모니터링 |
| Playwright 메모리 누수 | Medium | Medium | 브라우저 인스턴스 재사용 제한, 주기적 재시작 |
| Sentinel Web API 인증 실패 | High | Low | 서비스 계정 토큰 자동 갱신, 헬스체크 |
| Upstash Redis 무료 티어 초과 | Medium | Low | 큐 크기 모니터링, 필요시 유료 전환 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | |
| **Dynamic** | Feature-based modules, BaaS | Web apps with backend | **V** |
| **Enterprise** | Strict layer separation, DI | High-traffic systems | |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Runtime | Node.js | Node.js 22 | Playwright 네이티브 지원, CLAUDE.md 스택 |
| 브라우저 자동화 | Puppeteer / Playwright | **Playwright** | Multi-browser, 안정적 API, 프로젝트 컨텍스트 결정(D06) |
| 작업 큐 | BullMQ / Agenda / node-cron | **BullMQ** | Redis 기반 분산 큐, 재시도/지연/우선순위, 프로젝트 컨텍스트 결정 |
| Redis | Upstash / Railway / ElastiCache | **Upstash** | 서버리스, 무료 티어, 관리 불필요(DD-02) |
| DB 접근 | 직접 Supabase / Web API 경유 | **Web API 경유** | 보안 통일, RBAC 일관성(DD-01) |
| 프록시 | Bright Data / Oxylabs | **Bright Data** (1차) | 주거지 프록시, 대시보드 제공, 무료 체험 |
| 배포 | AWS EC2 / Railway / Render | **Railway** | 간편 배포, Docker 지원, Upstash co-location |
| 패키지 관리 | pnpm workspace | **pnpm workspace** | Web과 타입 공유(DD-04) |

### 6.3 Folder Structure

```
crawler/
  package.json              # 별도 패키지 (pnpm workspace)
  tsconfig.json
  .env.example
  src/
    index.ts                # 메인 엔트리
    config.ts               # 환경 변수 로드 + 검증
    scraper/
      search-page.ts        # 검색 결과 페이지 파싱 (ASIN 목록)
      detail-page.ts        # 리스팅 상세 페이지 파싱
      selectors.ts          # CSS 셀렉터 모듈 (변경 감지 용이)
      screenshot.ts         # 페이지 스크린샷 캡처
    anti-bot/
      proxy.ts              # 프록시 매니저 (로테이션, 헬스체크)
      fingerprint.ts        # 브라우저 Fingerprint 랜덤화
      human-behavior.ts     # 사람 행동 모방 (딜레이, 마우스, 스크롤)
      stealth.ts            # Playwright stealth 설정
    scheduler/
      queue.ts              # BullMQ 큐 정의 + 프로세서
      jobs.ts               # 캠페인 크롤링 잡 정의
      scheduler.ts          # 캠페인 스케줄 등록/해제
    api/
      sentinel-client.ts    # Sentinel Web API 클라이언트
      auth.ts               # API 인증 (서비스 토큰)
    types/
      index.ts              # 크롤러 내부 타입 (Web src/types 참조)
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] TypeScript configuration (`tsconfig.json`)
- [x] ESLint configuration
- [x] pnpm workspace 구조

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | CLAUDE.md 정의됨 | Crawler 전용 추가 규칙 없음 | - |
| **Folder structure** | CLAUDE.md 정의됨 | `crawler/src/` 구조 확정 | High |
| **Import order** | CLAUDE.md 정의됨 | 동일 적용 | - |
| **Error handling** | 미정 | 크롤링 에러 분류 + 재시도 정책 | High |
| **Logging** | 미정 | 구조화 로그 (JSON, level별) | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `SENTINEL_API_URL` | Sentinel Web API 엔드포인트 | Server | V |
| `SENTINEL_SERVICE_TOKEN` | Crawler→Web API 인증 토큰 | Server | V |
| `UPSTASH_REDIS_URL` | BullMQ Redis 연결 | Server | V |
| `UPSTASH_REDIS_TOKEN` | Upstash 인증 토큰 | Server | V |
| `BRIGHTDATA_PROXY_HOST` | Bright Data 프록시 호스트 | Server | V |
| `BRIGHTDATA_PROXY_PORT` | Bright Data 프록시 포트 | Server | V |
| `BRIGHTDATA_PROXY_USER` | Bright Data 인증 사용자 | Server | V |
| `BRIGHTDATA_PROXY_PASS` | Bright Data 인증 비밀번호 | Server | V |
| `CRAWLER_CONCURRENCY` | 동시 크롤링 수 (기본: 3) | Server | V |
| `CRAWLER_PAGE_DELAY_MS` | 페이지 간 딜레이 (기본: 2000~5000) | Server | V |

---

## 8. Implementation Phases

### Phase 1: 프로젝트 셋업 + 기본 스크래핑

1. pnpm workspace에 `crawler/` 패키지 추가
2. Playwright + TypeScript + BullMQ 의존성 설치
3. 환경 변수 로드 + 검증 (`config.ts`)
4. 아마존 검색 결과 페이지 파싱 (`search-page.ts`)
5. 아마존 리스팅 상세 페이지 파싱 (`detail-page.ts`)
6. CSS 셀렉터 모듈화 (`selectors.ts`)

### Phase 2: Anti-bot 회피

7. Playwright stealth 설정 (`stealth.ts`)
8. 프록시 매니저 (`proxy.ts`) — 로테이션, 헬스체크
9. Fingerprint 랜덤화 (`fingerprint.ts`)
10. 사람 행동 모방 (`human-behavior.ts`)

### Phase 3: Sentinel API 연동

11. Sentinel Web API 클라이언트 (`sentinel-client.ts`)
12. API 인증 (서비스 토큰, `auth.ts`)
13. 수집 데이터 → `POST /api/listings` 전송
14. 스크린샷 캡처 + Supabase Storage 업로드 (Web API 경유)

### Phase 4: BullMQ 스케줄러

15. BullMQ 큐 정의 + 프로세서 (`queue.ts`)
16. 캠페인 크롤링 잡 (`jobs.ts`)
17. 캠페인 스케줄 등록/해제 (`scheduler.ts`)
18. 메인 엔트리 (`index.ts`) — 스케줄러 시작 + 그레이스풀 셧다운

### Phase 5: 통합 + 검증

19. E2E 수집 테스트 (US 마켓플레이스, 실제 키워드)
20. 에러 핸들링 + 재시도 로직 검증
21. 타입체크 + 빌드 검증

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`/pdca design crawler`)
2. [ ] 프록시 서비스 가입 (Bright Data 무료 체험)
3. [ ] Upstash Redis 인스턴스 생성
4. [ ] 구현 시작 (`/pdca do crawler`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-01 | Initial draft — MS1 Crawler plan | Claude (AI) |
