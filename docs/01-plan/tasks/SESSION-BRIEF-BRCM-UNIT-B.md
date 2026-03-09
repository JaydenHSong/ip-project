# SESSION-BRIEF: BRCM Unit B — BR Monitor Worker (Crawler)

## Status: DONE
## Assigned Session: 2026-03-08
## Completed At: 2026-03-08

---

## 개요

BR Case Dashboard를 주기적으로 스크래핑하여 케이스 상태 변경 + 아마존 답장을 자동 수집하는 Crawler 워커.
모든 케이스 관리 기능의 데이터 소스. R11 기능 구현.

## 예상 시간: 11시간

## 의존성: Unit A (DB 스키마 + 타입) 완료 필요

---

## 작업 목록

### 1. Web API 엔드포인트

#### `GET /api/crawler/br-monitor-pending`
- 인증: Service Token
- 조건: `br_case_id IS NOT NULL AND status = 'monitoring'`
- 반환:
```json
[{
  "report_id": "uuid",
  "br_case_id": "19614499631",
  "br_case_status": "answered",
  "last_scraped_at": "2026-03-08T..."
}]
```

#### `POST /api/crawler/br-monitor-result`
- 인증: Service Token
- Body:
```json
{
  "report_id": "uuid",
  "br_case_id": "19614499631",
  "br_case_status": "needs_attention",
  "new_messages": [{
    "direction": "inbound",
    "sender": "Amazon",
    "body": "We need more information...",
    "sent_at": "2026-03-08T04:35:00Z"
  }],
  "last_amazon_reply_at": "2026-03-08T04:35:00Z"
}
```
- 처리:
  - `br_case_messages` INSERT (새 메시지)
  - `br_case_events` INSERT (상태 변경, 새 답장)
  - `reports` UPDATE (br_case_status, br_last_amazon_reply_at)

### 2. Crawler 모듈

#### 파일 구조
```
crawler/src/br-monitor/
  ├── types.ts        — BrMonitorJobData, BrMonitorResult, ScrapedMessage
  ├── worker.ts       — 메인 워커 (Playwright 스크래핑)
  ├── queue.ts        — BullMQ 큐 (30분 cron, 동시성 1)
  └── scheduler.ts    — 폴링 스케줄러
```

#### worker.ts 핵심 함수
- `ensureMonitorBrowser()` — Browser 3 초기화/재사용
- `ensureLoggedIn(page)` — 로그인 상태 확인
- `scrapeCaseDetail(page, caseId)` — 케이스 상세 스크래핑
  - Case Summary 파싱 (ID, Status, Created)
  - 대화 메시지 추출 (발신자, 날짜, 내용)
- `extractMessages(page)` — 메시지 목록 파싱
- `detectNewMessages(scraped, lastScrapedAt)` — 새 메시지 필터
- `processBrMonitorJob(job)` — 잡 처리 메인

#### DOM 셀렉터
`docs/02-design/features/br-case-management/R11-monitor-worker.md` Section 5 참조.
⚠️ 클래스명 기반 + 텍스트 기반 fallback 모두 구현할 것.

#### `crawler/src/api/sentinel-client.ts` 추가 메서드
- `getPendingBrMonitors()` — GET /api/crawler/br-monitor-pending
- `reportBrMonitorResult(data)` — POST /api/crawler/br-monitor-result

#### `crawler/src/index.ts` 통합
- BR Monitor 큐/워커/스케줄러 등록
- shutdown 시 정리

### 3. 브라우저 관리

- user-data-dir: `/tmp/br-monitor-data/` (Browser 3, 독립)
- 로그인 1회 후 하루종일 재사용
- 세션 만료 감지: URL에 `signin` 포함 시 스킵 + 오퍼레이터 알림

---

## 완료 기준

- [ ] Monitor Worker가 BR Case Dashboard를 스크래핑할 수 있음
- [ ] 새 메시지를 감지하고 br_case_messages에 저장
- [ ] 상태 변경을 감지하고 reports.br_case_status 업데이트
- [ ] 30분 cron 정상 동작
- [ ] 에러 시 graceful skip (다른 케이스는 계속 처리)

## 변경 파일 목록 (완료 후 기록)

### 신규 파일
- `crawler/src/br-monitor/types.ts` — BrMonitorJobData, BrMonitorTarget, ScrapedMessage, BrMonitorResult, CaseDetailScraped 타입
- `crawler/src/br-monitor/worker.ts` — 메인 워커 (Playwright 스크래핑, Browser 3 관리, 메시지 추출)
- `crawler/src/br-monitor/queue.ts` — BullMQ 큐 (동시성 1, 2회 재시도)
- `crawler/src/br-monitor/scheduler.ts` — 30분 폴링 스케줄러
- `src/app/api/crawler/br-monitor-pending/route.ts` — GET: 모니터링 대상 리포트 목록
- `src/app/api/crawler/br-monitor-result/route.ts` — POST: 스크래핑 결과 콜백 (메시지 저장, 이벤트 기록, 상태 업데이트)

### 수정 파일
- `crawler/src/api/sentinel-client.ts` — getPendingBrMonitors(), reportBrMonitorResult() 메서드 추가
- `crawler/src/index.ts` — BR Monitor 큐/워커/스케줄러 등록 + shutdown 정리
- `src/types/reports.ts` — br_last_scraped_at 필드 추가
- `supabase/migrations/025_br_case_management.sql` — br_last_scraped_at 컬럼 추가
