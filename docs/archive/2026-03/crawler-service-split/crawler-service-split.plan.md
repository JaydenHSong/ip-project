# Crawler Service Split — Plan

> **Feature**: Crawler 서비스 분리 + 헬스 모니터 + 관리자 채팅 봇
> **Created**: 2026-03-13
> **Phase**: Plan
> **Priority**: High
> **Estimated Scope**: Major (infra + new service)

---

## 1. Background

### 현재 상태
- Railway 단일 서비스(`sentinel-crawler`)에 5개 BullMQ 워커가 한 프로세스에서 실행
- Crawl(캠페인), BR Submit, BR Monitor, BR Reply, PD Followup 전부 하나에 묶여있음
- 하나가 죽으면 전부 죽음 — BR 제출 성공 직후라 안정성 최우선

### 문제점
- **장애 전파**: Crawl 메모리 폭증 → BR 워커도 같이 다운
- **배포 커플링**: Crawl 코드 수정 시 BR도 재배포 → 리스크
- **휴가 대응 불가**: 장애 시 수동 개입 필요, 자동 복구 한계

### 결정 사항 (논의 완료)
- **2개 서비스 분리**: Crawl / BR
- **PD Followup 제거**: 사용 안 함
- **헬스 모니터 + Google Chat 봇**: 자동 재시작 + 관리자 수동 명령

---

## 2. Goals

| # | Goal | 측정 기준 |
|---|------|----------|
| G1 | Crawl ↔ BR 장애 격리 | 한쪽 다운 시 다른 쪽 정상 동작 |
| G2 | 독립 배포 | 각 서비스 별도 배포 가능 |
| G3 | 자동 복구 | 비정상 감지 → 자동 재시작 → 알림 |
| G4 | 관리자 원격 제어 | Google Chat에서 재시작 명령 가능 |
| G5 | PD Followup 코드 정리 | 미사용 코드 제거 |

---

## 3. Scope

### In Scope

#### Phase A: 서비스 분리
- `SENTINEL_SERVICE=crawl|br|all` 환경변수 기반 워커 선택
- `entry-crawl.ts` — Crawl 워커만 초기화
- `entry-br.ts` — BR Submit + Monitor + Reply 초기화
- `index.ts` — 라우터 (환경변수 읽고 위임)
- `config.ts` — `BRIGHTDATA_BROWSER_WS` 조건부 필수
- Railway에 `sentinel-br` 서비스 추가 (같은 repo, 같은 Dockerfile)
- 기존 `sentinel-crawler`는 `SENTINEL_SERVICE=crawl`로 변경

#### Phase B: PD Followup 제거
- `crawler/src/pd-followup/` 디렉토리 전체 삭제
- `index.ts`에서 PD Followup 초기화 코드 제거
- `sentinel-client.ts`에서 PD 관련 API 메서드 제거
- Web API 라우트 제거: `/api/crawler/pd-followup-*`
- 하트비트 모니터에서 PD 워커 제거

#### Phase C: 헬스 모니터 서비스
- 독립 서비스 또는 Vercel Cron으로 구현
- 주기적으로 각 서비스 `/health` 체크 (1분 간격)
- 비정상 3회 연속 → Railway API로 자동 재시작
- Google Chat에 재시작 알림 전송
- 재시작 이력 로깅

#### Phase D: Google Chat 관리자 봇
- Google Chat → Webhook/Bot → Railway API 연동
- 지원 명령:
  - `상태` / `status` — 서비스 상태 조회
  - `재시작 crawl` / `restart crawl` — Crawl 서비스 재시작
  - `재시작 br` / `restart br` — BR 서비스 재시작
  - `로그 crawl` / `logs crawl` — 최근 로그 조회
- **코드 수정 절대 불가** — 재시작/조회만

### Out of Scope
- Kubernetes, Docker Compose 등 오케스트레이션 도구
- 서비스 메시, 로드밸런서
- BR Submit과 BR Monitor/Reply 추가 분리
- 자동 스케일링

---

## 4. Technical Approach

### 4.1 서비스 분리 전략

```
Before (1 service):
┌─────────────────────────────────────┐
│ sentinel-crawler                     │
│  ├─ Crawl Worker (Bright Data)      │
│  ├─ BR Submit Worker (Chromium)     │
│  ├─ BR Monitor Worker (Chromium)    │
│  ├─ BR Reply Worker (shared w/ Mon) │
│  └─ PD Followup Worker             │
└─────────────────────────────────────┘

After (2 services):
┌─────────────────────────┐  ┌─────────────────────────┐
│ sentinel-crawl           │  │ sentinel-br              │
│  └─ Crawl Worker        │  │  ├─ BR Submit Worker     │
│     (Bright Data)       │  │  ├─ BR Monitor Worker    │
│     /trigger, /fetch    │  │  └─ BR Reply Worker      │
└─────────────────────────┘  └─────────────────────────┘
         │                            │
         └──── Redis-GamH (shared) ───┘
```

### 4.2 Entry Point 구조

```typescript
// index.ts (라우터)
const service = process.env['SENTINEL_SERVICE'] ?? 'all'

if (service === 'crawl') await import('./entry-crawl.js')
else if (service === 'br') await import('./entry-br.js')
else await startAll() // 기존 모노리스 (로컬 개발용)
```

### 4.3 헬스 모니터 아키텍처

```
┌─────────────────┐
│ Health Monitor   │ (Vercel Cron 또는 Railway 서비스)
│  - 1분마다 체크   │
│  - 자동 재시작    │
│  - Chat 알림     │
└────────┬────────┘
         │ GET /health
    ┌────┴────┐
    ▼         ▼
sentinel-  sentinel-
  crawl       br
```

### 4.4 Google Chat 봇 아키텍처

```
관리자 ──→ Google Chat ──→ Webhook URL ──→ Vercel API Route
                                              │
                                         Railway API
                                         (restart/status)
                                              │
                                         Google Chat 응답
```

---

## 5. Migration Strategy (Zero Downtime)

| Step | Action | 위험도 |
|------|--------|:------:|
| 1 | entry-crawl.ts, entry-br.ts 작성 + index.ts 라우터 추가 | Low |
| 2 | config.ts 조건부 BRIGHTDATA 체크 | Low |
| 3 | `SENTINEL_SERVICE=all`로 기존 서비스 배포 (행동 변화 없음) | Low |
| 4 | Railway에 `sentinel-br` 서비스 생성 + 환경변수 설정 | Low |
| 5 | `sentinel-br`에 `SENTINEL_SERVICE=br` 배포 → BR 워커 시작 | Medium |
| 6 | BR 정상 확인 후, 기존 서비스를 `SENTINEL_SERVICE=crawl`로 전환 | Medium |
| 7 | PD Followup 코드 제거 | Low |
| 8 | 헬스 모니터 배포 | Low |
| 9 | Google Chat 봇 배포 | Low |

**롤백**: `SENTINEL_SERVICE=all`로 되돌리면 즉시 모노리스 복귀

---

## 6. Risk Assessment

| Risk | 가능성 | 영향 | 대응 |
|------|:------:|:----:|------|
| BR 작업이 두 서비스에서 동시 처리 (전환 중) | Medium | Low | BullMQ jobId 중복 방지 이미 있음 |
| Redis 연결 수 증가 (15→30) | Low | Low | Railway Redis 충분히 여유 |
| 아마존 BR 동시 로그인 세션 충돌 | N/A | N/A | 서비스 1개만 BR 접속 |
| 헬스 모니터 자체가 다운 | Low | Medium | Vercel Cron 안정성 활용 |
| Railway API 토큰 유출 | Low | High | 환경변수만 사용, 코드에 하드코딩 금지 |

---

## 7. Implementation Order

```
Phase A: 서비스 분리 ─────────────────── (핵심, 먼저)
  A1. entry-crawl.ts, entry-br.ts 작성
  A2. index.ts 라우터
  A3. config.ts 수정
  A4. 로컬 테스트 (crawl/br/all 각각)
  A5. Railway sentinel-br 서비스 생성 + 배포
  A6. 기존 서비스 crawl 전환
  A7. 양쪽 정상 확인

Phase B: PD Followup 제거 ────────────── (A 완료 후)
  B1. pd-followup 디렉토리 삭제
  B2. index.ts, sentinel-client.ts 정리
  B3. Web API 라우트 제거

Phase C: 헬스 모니터 ─────────────────── (A 완료 후)
  C1. Railway API 토큰 발급
  C2. Vercel API Route 또는 Railway 서비스 구현
  C3. 자동 재시작 로직
  C4. Google Chat 알림 연동

Phase D: Google Chat 봇 ─────────────── (C 완료 후)
  D1. Google Chat Bot 또는 Incoming Webhook 설정
  D2. 명령 파서 (재시작, 상태, 로그)
  D3. Railway API 연동
  D4. 관리자 테스트
```

---

## 8. Key Files

### 수정 대상
- `crawler/src/index.ts` — 라우터 추가
- `crawler/src/config.ts` — 조건부 BRIGHTDATA 체크

### 신규 생성
- `crawler/src/entry-crawl.ts` — Crawl 전용 엔트리
- `crawler/src/entry-br.ts` — BR 전용 엔트리
- `src/app/api/ops/health-monitor/route.ts` — 헬스 모니터 (Vercel Cron)
- `src/app/api/ops/chat-bot/route.ts` — Google Chat 봇 엔드포인트

### 삭제 대상
- `crawler/src/pd-followup/` — 전체 디렉토리
- `src/app/api/crawler/pd-followup-pending/route.ts`
- `src/app/api/crawler/pd-followup-result/route.ts`

---

## 9. Dependencies

- Railway API Token (서비스 재시작용)
- Google Chat Bot 설정 (Workspace 관리자 권한)
- Railway CLI (`railway add`, `railway variable`)

---

## 10. Success Criteria

- [ ] Crawl 서비스 독립 동작 (캠페인 검색 정상)
- [ ] BR 서비스 독립 동작 (Submit + Monitor + Reply 정상)
- [ ] 한쪽 재시작해도 다른 쪽 영향 없음
- [ ] 헬스 모니터가 비정상 감지 → 자동 재시작 → 알림
- [ ] Google Chat에서 `재시작 br` 명령 동작
- [ ] PD Followup 코드 완전 제거
- [ ] `SENTINEL_SERVICE=all`로 롤백 가능
