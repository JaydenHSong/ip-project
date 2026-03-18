# BR Session Keepalive Planning Document

> **Summary**: Amazon BR 크롤러의 세션 만료/CAPTCHA 문제를 최소화하기 위한 방어적 세션 관리 전략
>
> **Project**: Sentinel
> **Version**: 0.9.0-beta
> **Author**: CTO Lead
> **Date**: 2026-03-18
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Amazon BR 세션이 12~24시간 후 강제 만료되며, 재로그인 시 슬라이드 퍼즐 CAPTCHA가 랜덤 표시되어 크롤러가 작동 불능 상태에 빠진다 |
| **Solution** | 세션 킵얼라이브 + 지수 백오프 재시도 + 봇 감지 회피 강화 + 세션 상태 모니터링의 4-Layer 방어 전략 |
| **Function/UX Effect** | BR Submit/Monitor/Reply 작업의 가용성이 현재 ~70%에서 95%+ 로 향상되며, CAPTCHA 발생 시 자동 쿨다운으로 운영자 개입 최소화 |
| **Core Value** | BR 케이스 자동화 파이프라인의 안정성 확보 — 브랜드 보호 대응 시간 단축 및 운영 부담 감소 |

---

## 1. Overview

### 1.1 Purpose

Amazon Brand Registry 크롤러(Railway)에서 발생하는 세션 만료 및 CAPTCHA 차단 문제를 체계적으로 해결하여 BR Submit, BR Monitor, BR Reply, Case ID Recovery 작업의 연속적 가용성을 확보한다.

### 1.2 Background

**현재 상황**:
- 크롤러는 Playwright persistent browser context를 사용하여 Amazon BR에 로그인 세션을 유지
- Amazon 서버 측에서 12~24시간 후 세션을 강제 만료시킴
- 세션 만료 후 자동 로그인 시도 시 Amazon이 랜덤으로 슬라이드 퍼즐 CAPTCHA를 표시
- 슬라이드 퍼즐 CAPTCHA는 AI/자동화로 해결 불가 (2Captcha 등 외부 서비스도 제한적)
- CAPTCHA에 막히면 br-submit, br-monitor, br-reply, case-id-recovery 전부 실패

**영향받는 워커**:
| 워커 | 브라우저 | 데이터 디렉토리 | 역할 |
|------|---------|----------------|------|
| BR Submit | Browser 2 | `/tmp/br-worker-data` | BR 폼 제출 |
| BR Monitor | Browser 3 | `/tmp/br-monitor-data` | 케이스 대시보드 모니터링 |
| BR Reply | Browser 3 (공유) | `/tmp/br-monitor-data` | 케이스 답장 발송 |
| Case ID Recovery | Browser 3 (공유) | `/tmp/br-monitor-data` | 누락 케이스 ID 복구 |

**에러 로그 패턴**:
```
[WARN] Session expired -- attempting auto-login
[WARN] kat-expander not found after 10s
[ERRO] Parent menu not found -- Available: ["Forgot your password?", "Other issues with Sign-In"]
```

마지막 로그가 핵심: 로그인 시도 후 CAPTCHA 또는 보안 챌린지 페이지로 리다이렉트되어 BR 메뉴가 아닌 로그인 관련 링크만 보이는 상태.

### 1.3 Related Documents

- Architecture: `docs/CLAUDE-reference.md`
- BR Dashboard 구조: `.claude/projects/-Users-jaydensong-Projects-ip-project/memory/reference_br_dashboard.md`

---

## 2. Scope

### 2.1 In Scope

- [ ] **Layer 1: Session Keepalive** — 주기적 BR 대시보드 방문으로 세션 활성 유지
- [ ] **Layer 2: Smart Retry with Cooldown** — CAPTCHA/세션 만료 감지 시 지수 백오프 재시도
- [ ] **Layer 3: Anti-Detection Hardening** — 요청 간격 랜덤화, UserAgent 로테이션, 쿠키 관리 강화
- [ ] **Layer 4: Session Health Monitoring** — 세션 상태 health check 포함, 만료 시 즉시 Google Chat 알림
- [ ] **Shared Login Module** — br-submit과 br-monitor의 중복 로그인 로직 통합

### 2.2 Out of Scope

- CAPTCHA 자동 해결 (슬라이드 퍼즐은 기술적으로 불가)
- Anti-CAPTCHA 서비스 연동 (슬라이드 퍼즐 지원 제한적, 비용 대비 효과 낮음)
- Amazon 로그인 방식 변경 (현재 Email+Password+OTP 유지)
- 멀티 계정 로테이션 (현재 단일 BR 계정 사용)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 세션 킵얼라이브 — 작업이 없어도 4시간마다 BR 대시보드를 방문하여 세션 갱신 | High | Pending |
| FR-02 | CAPTCHA 감지 — 로그인 시도 후 CAPTCHA 페이지 도달 시 정확히 식별 | High | Pending |
| FR-03 | 지수 백오프 재시도 — CAPTCHA 발생 시 5분 -> 10분 -> 20분 -> 40분 간격으로 재시도 (최대 4회) | High | Pending |
| FR-04 | 세션 상태 리포팅 — health endpoint에 BR 세션 상태(valid/expired/captcha_blocked) 포함 | High | Pending |
| FR-05 | Google Chat 알림 — 세션 만료 + CAPTCHA 발생 시 즉시 운영팀 알림 | Medium | Pending |
| FR-06 | Shared Login Module — 중복되는 ensureLoggedIn 로직을 단일 모듈로 통합 | Medium | Pending |
| FR-07 | 요청 간격 랜덤화 — BR 페이지 간 이동 시 3~8초 랜덤 딜레이 적용 | Medium | Pending |
| FR-08 | UserAgent 로테이션 — 브라우저 재시작 시 최신 Chrome UA 중 랜덤 선택 | Low | Pending |
| FR-09 | 세션 만료 예측 — 마지막 성공적 페이지 로드 시간 기록, 10시간 경과 시 선제적 세션 갱신 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Availability | BR 작업 성공률 95%+ (현재 ~70%) | 일간 성공/실패 비율 모니터링 |
| Resilience | CAPTCHA 발생 시 최대 80분 내 자동 복구 | 복구 시간 로그 분석 |
| Observability | 세션 상태가 항상 health check에 반영 | /health 엔드포인트 응답 확인 |
| Anti-Detection | 1주 기준 CAPTCHA 발생 빈도 50% 감소 | CAPTCHA 발생 로그 카운트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] Session Keepalive가 4시간 간격으로 자동 실행
- [ ] CAPTCHA 감지 시 지수 백오프 재시도 로직 동작 확인
- [ ] /health 엔드포인트에 brSessionStatus 필드 포함
- [ ] Google Chat 알림이 세션 만료/CAPTCHA 발생 시 즉시 전송
- [ ] 중복 로그인 로직이 shared module로 통합
- [ ] 기존 br-submit, br-monitor, br-reply 동작에 영향 없음 (regression 없음)

### 4.2 Quality Criteria

- [ ] 타입 에러 없음 (`pnpm typecheck` 통과)
- [ ] 기존 테스트 통과
- [ ] Railway 배포 후 24시간 안정 운영 확인

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Keepalive가 오히려 봇 감지를 유발 | High | Medium | 킵얼라이브 간격을 4~6시간으로 넉넉하게, 페이지 방문 시 사람처럼 스크롤/체류 |
| Amazon이 봇 감지 정책을 더 강화 | High | High | 요청 패턴을 지속적으로 분석하고 anti-bot 로직을 업데이트 |
| 지수 백오프 중 긴급 BR 제출 건 지연 | Medium | Low | CAPTCHA 상태에서도 큐에 쌓아두고, 세션 복구 후 자동 처리 |
| 두 브라우저(Submit/Monitor) 세션이 동시 만료 | Medium | Medium | 킵얼라이브 타이밍을 오프셋(2시간 차이)으로 분산 |
| Persistent context 데이터 손상 | Low | Low | 브라우저 재시작 시 context 데이터 무결성 체크 |
| Railway 컨테이너 재시작으로 세션 데이터 소실 | Medium | Medium | Railway Volume 사용 또는 쿠키를 외부 스토리지에 백업 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend | X |
| **Enterprise** | Strict layer separation, microservices | High-traffic systems | |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Keepalive 방식 | (A) setInterval 기반 / (B) cron-job 기반 / (C) 스케줄러 통합 | (C) 스케줄러 통합 | 기존 br-monitor 스케줄러(30분)에 킵얼라이브 로직 통합 — 새 타이머 불필요 |
| Login Module | (A) 각 워커 개별 유지 / (B) Shared module 분리 | (B) Shared module | br-submit과 br-monitor에 거의 동일한 ensureLoggedIn이 중복 |
| CAPTCHA 대응 | (A) 즉시 실패 / (B) 고정 대기 / (C) 지수 백오프 | (C) 지수 백오프 | Amazon CAPTCHA는 시간이 지나면 해제되는 경우가 많음 |
| 세션 상태 저장 | (A) 메모리 변수 / (B) Redis / (C) 파일 | (A) 메모리 변수 | 단일 프로세스, 재시작 시 초기화되어도 무방 |
| 알림 채널 | (A) Google Chat만 / (B) + Slack / (C) + PagerDuty | (A) Google Chat만 | 현재 운영 채널이 Google Chat |

### 6.3 구현 아키텍처

```
crawler/src/
├── br-auth/                    ← NEW: Shared Login Module
│   ├── session-manager.ts      ← 세션 상태 관리 + 킵얼라이브
│   ├── login.ts                ← 통합 로그인 로직 (ensureLoggedIn)
│   └── captcha-detector.ts     ← CAPTCHA 감지 + 지수 백오프
│
├── br-submit/
│   └── worker.ts               ← ensureLoggedIn → br-auth/login.ts 사용
│
├── br-monitor/
│   ├── worker.ts               ← ensureLoggedIn → br-auth/login.ts 사용
│   └── scheduler.ts            ← 킵얼라이브 타이밍 통합
│
├── br-reply/
│   └── worker.ts               ← 변경 없음 (br-monitor 브라우저 공유)
│
├── health.ts                   ← brSessionStatus 필드 추가
└── entry-br.ts                 ← 킵얼라이브 스케줄러 초기화
```

### 6.4 Session Keepalive 플로우

```
┌─────────────────────────────────────────────────────┐
│                  Entry BR (entry-br.ts)              │
│                                                     │
│  ┌──────────────────┐  ┌──────────────────────┐    │
│  │ BR Submit Worker │  │ BR Monitor Worker    │    │
│  │ (Browser 2)      │  │ (Browser 3)          │    │
│  └───────┬──────────┘  └───────┬──────────────┘    │
│          │                     │                    │
│          └──────────┬──────────┘                    │
│                     ▼                               │
│         ┌──────────────────────┐                    │
│         │   Session Manager    │                    │
│         │                      │                    │
│         │  - lastActiveAt      │                    │
│         │  - sessionState      │                    │
│         │  - retryCount        │                    │
│         │  - cooldownUntil     │                    │
│         └──────────┬───────────┘                    │
│                    │                                │
│         ┌──────────▼───────────┐                    │
│         │   Keepalive Loop     │                    │
│         │   (4h interval)      │                    │
│         │                      │                    │
│         │  1. Visit dashboard  │                    │
│         │  2. Scroll + dwell   │                    │
│         │  3. Update state     │                    │
│         └──────────┬───────────┘                    │
│                    │                                │
│         ┌──────────▼───────────┐                    │
│         │   CAPTCHA Handler    │                    │
│         │                      │                    │
│         │  Detect → Cooldown   │                    │
│         │  5m → 10m → 20m →    │                    │
│         │  40m → Alert ops     │                    │
│         └──────────────────────┘                    │
└─────────────────────────────────────────────────────┘
```

### 6.5 CAPTCHA 감지 및 대응 시퀀스

```
로그인 시도
    │
    ▼
┌─ 로그인 성공? ──── Yes ──── sessionState = 'valid'
│                              retryCount = 0
No                             cooldownUntil = null
│
▼
┌─ CAPTCHA 감지? ── No ──── 일반 에러 처리
│
Yes
│
▼
sessionState = 'captcha_blocked'
retryCount++
│
├─ retryCount <= 4?
│   │
│   Yes → cooldown = 5min * 2^(retryCount-1)
│   │     (5m → 10m → 20m → 40m)
│   │     Google Chat 알림 (첫 발생 시만)
│   │     대기 후 재시도
│   │
│   No → sessionState = 'manual_required'
│         Google Chat 긴급 알림
│         "수동 로그인 필요"
│         작업 큐 일시 중지
│
▼
재시도 성공? ── Yes ── sessionState = 'valid'
                       Google Chat 복구 알림
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration
- [x] TypeScript configuration (`tsconfig.json`)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | exists | br-auth 모듈 네이밍 규칙 | High |
| **Error handling** | exists | CAPTCHA 에러 코드 상수 정의 | High |
| **Logging** | exists | 세션 상태 변경 로그 레벨 통일 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `BR_EMAIL` | BR 로그인 이메일 | Server | (기존) |
| `BR_PASSWORD` | BR 로그인 비밀번호 | Server | (기존) |
| `BR_OTP_SECRET` | TOTP 시크릿 | Server | (기존) |
| `BR_KEEPALIVE_INTERVAL_MS` | 킵얼라이브 간격 (기본 4시간) | Server | X |
| `BR_MAX_CAPTCHA_RETRIES` | CAPTCHA 최대 재시도 (기본 4) | Server | X |
| `BR_COOLDOWN_BASE_MS` | 쿨다운 기본값 (기본 5분) | Server | X |

---

## 8. Implementation Plan

### Phase 1: Shared Login Module (Day 1)

1. `crawler/src/br-auth/login.ts` — 통합 `ensureLoggedIn` 함수
2. `crawler/src/br-auth/captcha-detector.ts` — CAPTCHA 페이지 감지
3. `crawler/src/br-auth/session-manager.ts` — 세션 상태 관리
4. br-submit/worker.ts, br-monitor/worker.ts에서 기존 로그인 로직을 shared module 호출로 교체

### Phase 2: Session Keepalive (Day 1-2)

1. `session-manager.ts`에 keepalive 메서드 추가
2. `entry-br.ts`에 킵얼라이브 스케줄러 등록
3. 킵얼라이브 시 사람처럼 대시보드 스크롤 + 체류

### Phase 3: CAPTCHA Handling + Retry (Day 2)

1. CAPTCHA 감지 로직 구현 (URL 패턴, 페이지 요소 분석)
2. 지수 백오프 재시도 로직
3. 쿨다운 중 작업 큐 지연 처리

### Phase 4: Monitoring + Alerting (Day 2-3)

1. `/health` 엔드포인트에 `brSessionStatus` 추가
2. Google Chat 알림 강화 (CAPTCHA 발생/복구/수동 개입 필요)
3. 세션 상태 변경 이력 로깅

### Phase 5: Anti-Detection Hardening (Day 3)

1. BR 페이지 간 이동 딜레이 랜덤화 (3~8초)
2. UserAgent 풀 정의 + 랜덤 선택
3. 킵얼라이브 간격 자체도 +-30분 랜덤 지터 적용

---

## 9. Next Steps

1. [ ] 이 Plan 문서 리뷰 및 승인
2. [ ] Design 문서 작성 (`br-session-keepalive.design.md`)
3. [ ] 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial draft | CTO Lead |
