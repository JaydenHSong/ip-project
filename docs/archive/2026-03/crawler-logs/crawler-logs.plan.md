# Crawler Logs Planning Document

> **Summary**: 크롤러 실행 로그를 Supabase에 저장하고, Settings Crawler 탭에 대시보드 형태로 표시
>
> **Project**: Sentinel
> **Author**: Claude
> **Date**: 2026-03-04
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

크롤러가 캠페인을 크롤링할 때 발생하는 이벤트(성공, 에러, 프록시 밴, 캡차 등)를 Supabase에 저장하고, Settings Crawler 탭에서 대시보드 형태로 조회할 수 있게 한다.

### 1.2 Background

- 크롤러가 Railway에서 가동 중이며, 6개 US 캠페인이 등록됨
- 현재 크롤러 로그는 Railway stdout/stderr에만 기록되어, 에러/밴 히스토리를 웹에서 확인할 수 없음
- 관리자가 크롤러 운영 상태를 한눈에 파악해야 함 (성공률, 밴 빈도, 수집량 추이 등)

### 1.3 Current Crawler Data Flow

```
크롤러 잡 실행 (jobs.ts)
  → log() → stdout/stderr (Railway 로그)
  → sentinelClient.submitBatch() → /api/crawler/listings/batch
  → chatNotifier → Google Chat (성공/실패 알림)
```

크롤러 잡이 완료되면 이미 `CrawlResult` 객체가 있음:
```typescript
{ campaignId, totalFound, totalSent, duplicates, errors, duration }
```

이 데이터 + 추가 이벤트 정보를 Web API로 전송하면 됨.

---

## 2. Scope

### 2.1 In Scope

- [x] Supabase `crawler_logs` 테이블 생성
- [x] `POST /api/crawler/logs` — 크롤러가 로그 전송하는 API
- [x] `GET /api/crawler/logs` — 로그 조회 API (필터, 페이징)
- [x] 크롤러 잡 완료/에러 시 로그 전송 코드 추가 (sentinel-client.ts)
- [x] Settings Crawler 탭에 Logs 대시보드 UI 추가
- [x] i18n 지원 (EN/KO)

### 2.2 Out of Scope

- 실시간 WebSocket 스트리밍 (향후 확장)
- 로그 기반 알림/경보 (기존 Google Chat 알림으로 충분)
- 로그 자동 삭제/보관 정책 (초기에는 수동 관리)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | 크롤러 잡 완료 시 결과 요약 로그 전송 | High |
| FR-02 | 에러/밴/캡차 발생 시 즉시 이벤트 로그 전송 | High |
| FR-03 | Crawler 탭에 오늘 요약 통계 표시 (크롤 수, 성공/실패, 신규 리스팅, 밴 수) | High |
| FR-04 | 로그 목록 테이블 (시간, 키워드, 타입, 신규, 에러, 소요시간) | High |
| FR-05 | 로그 필터: 이벤트 타입, 키워드, 기간 | Medium |
| FR-06 | 로그 상세 보기 (에러 메시지, ASIN, 프록시 정보) | Medium |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| Performance | 로그 조회 50ms 이내 (인덱스 활용) |
| Storage | 로그 1건 ~500B, 일 100건 기준 월 ~1.5MB |
| Auth | Crawler→API: Service Token, UI→API: Admin only |

---

## 4. Data Model

### 4.1 crawler_logs 테이블

```sql
CREATE TABLE crawler_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,           -- crawl_complete, crawl_error, proxy_ban, captcha, rate_limit, api_error
  campaign_id UUID REFERENCES campaigns(id),
  keyword TEXT,
  marketplace TEXT,

  -- 잡 완료 시 결과
  pages_crawled INT,
  listings_found INT,
  listings_sent INT,
  new_listings INT,
  duplicates INT,
  screenshots INT,
  errors INT,
  captchas INT,
  proxy_rotations INT,
  retries INT,
  duration_ms INT,

  -- 에러/밴 이벤트 시 상세
  message TEXT,
  asin TEXT,
  proxy_ip TEXT,
  error_code TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_crawler_logs_type ON crawler_logs(type);
CREATE INDEX idx_crawler_logs_created ON crawler_logs(created_at DESC);
CREATE INDEX idx_crawler_logs_campaign ON crawler_logs(campaign_id);
```

### 4.2 로그 타입 정의

| Type | 발생 시점 | 포함 데이터 |
|------|-----------|-------------|
| `crawl_complete` | 잡 성공 완료 | 전체 결과 요약 |
| `crawl_error` | 잡 실패 (MAX_RETRIES 등) | message, error_code |
| `proxy_ban` | 403/IP 차단 감지 | proxy_ip, asin, message |
| `captcha` | 캡차 감지 | asin, proxy_ip |
| `rate_limit` | 속도 제한 감지 | message |
| `api_error` | Web API 전송 실패 | message, error_code |

---

## 5. Technical Approach

### 5.1 파일 구조

```
crawler/src/
  api/sentinel-client.ts     ← 수정 (submitLog 메서드 추가)

src/app/api/crawler/
  logs/route.ts              ← 새로 생성 (POST + GET)

src/app/(protected)/settings/
  CrawlerSettings.tsx        ← 수정 (Logs 섹션 추가)
  CrawlerLogsDashboard.tsx   ← 새로 생성 (대시보드 컴포넌트)

src/lib/i18n/locales/
  en.ts                      ← 수정
  ko.ts                      ← 수정
```

### 5.2 API 설계

**POST `/api/crawler/logs`** (크롤러 → Web)
- Auth: Service Token (`Authorization: Bearer <token>`)
- Body: 단건 또는 배열
- 응답: `{ ok: true }`

**GET `/api/crawler/logs`** (Web UI → API)
- Auth: Admin only (`withAuth(['admin'])`)
- Query: `?type=&keyword=&days=7&page=1&limit=50`
- 응답: `{ logs: [...], summary: { total, success, failed, bans, ... }, pagination }`

### 5.3 크롤러 수정 범위

`sentinel-client.ts`에 `submitLog` 메서드 추가:
```typescript
submitLog: async (logData: CrawlerLogRequest): Promise<void>
```

`jobs.ts`에서 잡 완료/에러 시 호출:
- 잡 성공 → `submitLog({ type: 'crawl_complete', ...result })`
- CAPTCHA → `submitLog({ type: 'captcha', asin, proxy_ip })`
- MAX_RETRIES → `submitLog({ type: 'crawl_error', message })`

### 5.4 UI 레이아웃

```
┌─────────────────────────────────────────────────┐
│ Crawler Status (기존)                            │
│ ● Connected   Uptime: 2h 34m                   │
├─────────────────────────────────────────────────┤
│ Crawler Logs                        [Refresh]    │
│                                                  │
│  Today ─ Crawls: 6  Success: 5  Failed: 1       │
│  Listings: 576 found  42 new  Bans: 0            │
│                                                  │
│ [All ▼]  [All Keywords ▼]      [Last 7 days ▼]  │
├──────┬───────────────────┬─────┬─────┬────┬─────┤
│ Time │ Keyword           │ Type│ New │ Err│ Dur │
├──────┼───────────────────┼─────┼─────┼────┼─────┤
│ 9:12 │ iphone 17 case    │ ✅  │  42 │  0 │ 12m │
│ 9:25 │ iphone 17 pro ca..│ ✅  │  38 │  1 │ 14m │
│ 9:40 │ iphone 17 pro ma..│ ❌  │   - │  - │  2m │
│      │  └ 403 Proxy ban  │     │     │    │     │
│ 9:55 │ iphone 17e case   │ ✅  │  35 │  0 │ 11m │
│10:08 │ galaxy s26 case   │ ✅  │  29 │  2 │ 13m │
│10:22 │ galaxy s26 ultra  │ ✅  │  31 │  0 │ 10m │
└──────┴───────────────────┴─────┴─────┴────┴─────┘
```

---

## 6. Success Criteria

### 6.1 Definition of Done

- [ ] `crawler_logs` 테이블 생성됨
- [ ] 크롤러가 잡 완료/에러 시 로그를 Web API로 전송함
- [ ] Settings Crawler 탭에 로그 대시보드가 표시됨
- [ ] 타입/키워드/기간 필터가 동작함
- [ ] EN/KO 번역 완료
- [ ] 빌드 성공 (typecheck + lint)

---

## 7. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| 로그 전송 실패 시 크롤링 중단 | Medium | fire-and-forget 방식 (로그 전송 실패해도 크롤링은 계속) |
| 로그 테이블 무한 증가 | Low | 초기에는 수동, 향후 30일 자동 삭제 정책 추가 |
| 프록시 IP 노출 | Low | Admin 전용 + 부분 마스킹 (45.xxx.xxx.123) |

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`/pdca design crawler-logs`)
2. [ ] Supabase에 테이블 생성
3. [ ] 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-04 | Initial draft | Claude |
