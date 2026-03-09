# R11: BR 케이스 자동 스크래핑 워커

> **중요도**: ★★★★★ (최우선 — 모든 기능의 기반)
> **난이도**: ★★★☆☆ (중간)
> **Phase**: 1
> **의존성**: 없음 (첫 번째로 구현해야 함)
> **병렬 가능**: ✅ Crawler 독립 작업

---

## 1. 문제

BR에 제출한 케이스의 상태와 아마존 답장을 자동으로 가져오는 인프라가 없음.
이 워커가 모든 케이스 관리 기능(R1~R10)의 데이터 소스.

## 2. 솔루션

### 2.1 스크래핑 대상

**BR Case Dashboard**: `https://brandregistry.amazon.com/gp/case-dashboard/lobby.html`

테이블 구조 (탐색 완료):
| 컬럼 | CSS 셀렉터 | 추출 값 |
|------|-----------|---------|
| ID | `td:nth-child(1) a` | 케이스 번호 (11자리) + 링크 |
| Status | `td:nth-child(2)` | Answered / Needs your attention / Work in progress |
| Subject | `td:nth-child(3)` | 위반 유형 텍스트 |
| Creation Date | `td:nth-child(4)` | 날짜 |
| Last Amazon Reply | `td:nth-child(5)` | 날짜 or "No reply" |

**BR Case Detail**: `https://brandregistry.amazon.com/cu/case-dashboard/view-case?caseID={id}`

대화 스레드 구조 (탐색 완료):
| 요소 | CSS 클래스 | 추출 값 |
|------|-----------|---------|
| 발신자 | `div.m8v2kxruDtg3OA3mwzEj` | "Amazon" / "You" |
| 이메일 | `div.q8_q8rkh9qNTsGWfOAbD` | 이메일 주소 |
| 날짜 | `div` in `div.nzO_8eJLQRkq5RdzrqNn` | "Mar 06, 2026" |
| 시간 | (날짜 하위) | "4:35 PM PST" |
| 내용 | 메시지 본문 컨테이너 | 텍스트 전체 |

Case Summary:
| 필드 | 추출 패턴 |
|------|----------|
| ID | `text.match(/ID:\s*(\d+)/)` |
| Status | `text.match(/Status:\s*(.+?)(?:\n)/)` |
| Created | `text.match(/Created:\s*(.+?)(?:\n)/)` |

### 2.2 모니터링 플로우

```
30분마다 Crawler 실행 (BullMQ cron)
  │
  ├─ 1. Sentinel API에서 모니터링 대상 조회
  │    GET /api/crawler/br-monitor-pending
  │    → br_case_id가 있고 status=monitoring인 리포트 목록
  │
  ├─ 2. 각 케이스 상세 페이지 방문
  │    → 새 메시지 확인 (마지막 scraped_at 이후)
  │    → 현재 상태 확인
  │
  ├─ 3. 변경사항 감지
  │    ├─ 새 메시지 있음 → 메시지 데이터 추출
  │    ├─ 상태 변경 있음 → 새 상태 기록
  │    └─ 변경 없음 → skip
  │
  └─ 4. 결과 콜백
       POST /api/crawler/br-monitor-result
       {
         report_id, br_case_id,
         br_case_status,         // 현재 상태
         new_messages: [{        // 새 메시지들
           direction, sender, body, sent_at
         }],
         last_amazon_reply_at    // 아마존 마지막 응답 시간
       }
```

### 2.3 브라우저 관리

```
Browser 3: /tmp/br-monitor-data/
  - 로그인 1회, 하루종일 재사용
  - 세션 만료 감지 → 재로그인 알림
  - BullMQ 동시성 1 (한 번에 하나만)
  - Rate limit: 30분마다 + 케이스당 5초 간격 (anti-bot)
```

### 2.4 에러 처리

| 상황 | 처리 |
|------|------|
| 세션 만료 | 로그인 페이지 감지 → 스킵, 오퍼레이터에게 알림 |
| 페이지 로딩 실패 | 3회 재시도, 실패 시 스킵 |
| 케이스 없음 (404) | br_case_status → 'closed' |
| Rate limit | 케이스 간 5~10초 랜덤 딜레이 |

## 3. 구현 범위

### 3.1 Web API
- `GET /api/crawler/br-monitor-pending` — 모니터링 대상 리포트 목록
  - 조건: `br_case_id IS NOT NULL AND status = 'monitoring'`
  - 반환: `[{ report_id, br_case_id, br_case_status, last_scraped_at }]`
- `POST /api/crawler/br-monitor-result` — 스크래핑 결과 콜백
  - 처리:
    - br_case_messages INSERT (새 메시지)
    - br_case_events INSERT (상태 변경, 새 답장 등)
    - reports UPDATE (br_case_status, br_last_amazon_reply_at 등)
    - R1 상태 자동 전환 트리거
    - R2 SLA 재계산 (선택, R2 구현 후)

### 3.2 Crawler
- `crawler/src/br-monitor/types.ts` — 타입 정의
- `crawler/src/br-monitor/worker.ts` — 메인 워커
  - `scrapeCaseList(caseIds)` — 케이스 리스트에서 상태 일괄 확인
  - `scrapeCaseDetail(caseId)` — 상세 페이지 대화 추출
  - `extractMessages(page)` — 메시지 파싱
  - `detectChanges(current, previous)` — 변경사항 감지
- `crawler/src/br-monitor/queue.ts` — BullMQ 큐 (30분 cron)
- `crawler/src/br-monitor/scheduler.ts` — 스케줄러
- `crawler/src/api/sentinel-client.ts` — 새 메서드 추가

### 3.3 DB
- `br_case_messages` 테이블 (Master Plan)
- `br_case_events` 테이블 (Master Plan)
- `reports` 확장 컬럼 (Master Plan)

## 4. 작업량 추정

| 항목 | 예상 |
|------|------|
| DB 마이그레이션 | 20분 |
| Web API (2개) | 2시간 |
| Crawler Worker (스크래핑 로직) | 4시간 |
| 메시지 파싱 로직 | 2시간 |
| 변경 감지 로직 | 1시간 |
| Queue + Scheduler | 30분 |
| Sentinel Client 메서드 | 30분 |
| 에러 처리 | 1시간 |
| **합계** | **~11시간** |

## 5. DOM 셀렉터 참고

탐색 시점(2026-03-08) 기준. Amazon이 클래스명을 변경할 수 있으므로
텍스트 기반 fallback 셀렉터도 함께 구현할 것.

```javascript
// 케이스 리스트
const CASE_LIST_SELECTORS = {
  table: 'table',
  rows: 'table tbody tr',
  caseId: 'td:nth-child(1) a',
  status: 'td:nth-child(2)',
  subject: 'td:nth-child(3)',
  created: 'td:nth-child(4)',
  lastReply: 'td:nth-child(5)',
}

// 케이스 상세 — 대화
const CASE_DETAIL_SELECTORS = {
  sender: 'div.m8v2kxruDtg3OA3mwzEj',       // "Amazon" / "You"
  email: 'div.q8_q8rkh9qNTsGWfOAbD',         // 이메일
  dateContainer: 'div.nzO_8eJLQRkq5RdzrqNn',  // 날짜 컨테이너
  messageContainer: 'div.IJgI1Q0k2QtdW4J3onhO', // 메시지 블록
  senderContainer: 'div.P7wGTaW4ghGkEYr8Absw',  // 발신자 컨테이너
}

// 케이스 상세 — 요약
const CASE_SUMMARY_PATTERNS = {
  id: /ID:\s*(\d+)/,
  status: /Status:\s*(.+?)(?:\n|Support)/,
  created: /Created:\s*(.+?)(?:\n|$)/,
}
```
