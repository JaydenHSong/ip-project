# BR Case Management System — Master Plan

> **Summary**: Brand Registry 케이스 모니터링 + 양방향 커뮤니케이션 + CS 플랫폼 수준 케이스 관리 시스템
>
> **Project**: Sentinel (센티널)
> **Version**: 0.1
> **Author**: Claude (AI)
> **Date**: 2026-03-08
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

BR(Brand Registry)로 제출한 신고 케이스의 전체 라이프사이클을 Sentinel 플랫폼 안에서 관리한다.
아마존 답장 자동 수집, 답장 발송, 케이스 상태 추적, SLA 모니터링, AI 분석까지
커스토머 서비스 플랫폼 수준의 케이스 관리 경험을 제공한다.

### 1.2 Background

- **현재**: BR 신고 제출까지 자동화 완료 (SC Track + BR Track)
- **문제**: 제출 후 아마존 응답 확인은 수동 — BR Case Dashboard 직접 방문 필요
- **목표**: Sentinel 안에서 케이스 이력 확인, 답장, 에스컬레이션까지 One-Stop 처리

### 1.3 참고 CS 플랫폼 분석

| 플랫폼 | 핵심 차용 포인트 |
|--------|----------------|
| Zendesk | On-Hold(외부 대기) 상태 분리, SLA 카운트다운 뱃지, 내부 메모 인라인 |
| Freshdesk | 실시간 대시보드 (미해결/지연/미할당), AI 자동 분류 |
| HubSpot Service Hub | 파이프라인 스테이지, 이메일 수신 시 상태 자동 전환 |
| Salesforce Service Cloud | SLA 마일스톤 (경고→위반 단계별 액션), 케이스 계층 구조 |
| Front | 공유 인박스, 내부 코멘트 @멘션, 실시간 충돌 감지 |
| Help Scout | 키보드 단축키 기반 빠른 트리아지, 고객 사이드바 |

### 1.4 Related Documents

- BR Auto-Reporter: `docs/01-plan/tasks/SESSION-BRIEF-BR-AUTO-REPORTER.md`
- BR 완료 리포트: `docs/04-report/features/br-auto-reporter.report.md`
- 기획: `Sentinel_Project_Context.md`

---

## 2. 전체 아키텍처 (Big Picture)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Sentinel Web (Next.js)                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Case Inbox   │  │ Case Detail  │  │ Case Dashboard         │ │
│  │              │  │              │  │                        │ │
│  │ Smart Queue  │  │ Thread View  │  │ SLA Overview           │ │
│  │ Filters      │  │ Internal     │  │ Resolution Metrics     │ │
│  │ SLA Badges   │  │   Notes      │  │ Violation Type Stats   │ │
│  │ Bulk Actions │  │ Reply Form   │  │ Response Time Trends   │ │
│  │              │  │ File Attach  │  │                        │ │
│  │              │  │ AI Analysis  │  │                        │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────────────────┘ │
│         │                 │                                      │
│  ┌──────┴─────────────────┴──────────────────────────────────┐  │
│  │                    API Layer                               │  │
│  │  /api/cases/*           — CRUD, 검색, 필터                 │  │
│  │  /api/cases/[id]/reply  — 답장 발송 요청                   │  │
│  │  /api/cases/messages    — 메시지 이력 조회                 │  │
│  │  /api/cases/sla         — SLA 상태 조회                    │  │
│  │  /api/crawler/br-monitor-pending — 모니터링 대상 조회      │  │
│  │  /api/crawler/br-monitor-result  — 스크래핑 결과 콜백      │  │
│  │  /api/crawler/br-reply-pending   — 답장 발송 대상 조회     │  │
│  │  /api/crawler/br-reply-result    — 답장 발송 결과 콜백     │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │                    Database (Supabase)                      │ │
│  │                                                             │ │
│  │  reports (기존)        — br_case_id, status 연동            │ │
│  │  br_case_messages (신규) — 대화 이력 저장                   │ │
│  │  br_case_notes (신규)   — 내부 메모                         │ │
│  │  br_case_events (신규)  — 활동 로그                         │ │
│  │  br_sla_configs (신규)  — SLA 규칙 설정                     │ │
│  │  notification_rules (신규) — 알림 규칙                      │ │
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
         │
         │  Service Token Auth
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Crawler (Railway)                              │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │ BR Monitor      │  │ BR Reply        │  │ Browser Pool     │ │
│  │ Worker          │  │ Worker          │  │                  │ │
│  │                 │  │                 │  │ Browser 1: SC    │ │
│  │ • Case list     │  │ • Open case     │  │ Browser 2: BR    │ │
│  │   스크래핑       │  │ • Fill reply    │  │ Browser 3: Mon   │ │
│  │ • Case detail   │  │ • Attach files  │  │                  │ │
│  │   대화 추출      │  │ • Send          │  │ 로그인 1회,      │ │
│  │ • Status 변경   │  │ • Close case    │  │ 하루종일 재사용   │ │
│  │   감지           │  │                 │  │                  │ │
│  └────────┬────────┘  └────────┬────────┘  └──────────────────┘ │
│           │                    │                                  │
│  ┌────────┴────────────────────┴─────────────────────────────┐  │
│  │  BullMQ Queues                                             │  │
│  │  • br-monitor  (30분마다 폴링, 동시성 1)                    │  │
│  │  • br-reply    (요청 시 실행, 동시성 1)                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
         │
         │  Playwright Persistent Context
         ▼
┌──────────────────────────────────────────────────────────────────┐
│              Amazon Brand Registry                                │
│                                                                   │
│  Case Dashboard (lobby.html)                                      │
│  ├── 테이블: ID, Status, Subject, Created, Last Reply, Action    │
│  ├── 검색: kat-input[type="search"] (Case ID or Subject)         │
│  └── 페이지네이션: 10건/페이지                                    │
│                                                                   │
│  Case Detail (view-case?caseID=xxx)                               │
│  ├── Case Summary: ID, Status, Support type, Email, Created      │
│  ├── 대화 스레드: 발신자(Amazon/You) + 날짜 + 내용               │
│  ├── Reply: kat-textarea + 파일 첨부 (6파일, 10MB)               │
│  ├── Send: kat-button[label="Send"]                              │
│  └── Close: kat-button[label="Close this case"] 추정             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. 데이터 모델

### 3.1 신규 테이블

```sql
-- 1) BR 케이스 메시지 (대화 이력)
CREATE TABLE br_case_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  br_case_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  -- inbound: 아마존 → 우리, outbound: 우리 → 아마존
  sender TEXT NOT NULL,          -- 'Amazon', 'you@spigen.com' 등
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]', -- [{name, url, size}]
  sent_at TIMESTAMPTZ NOT NULL,   -- BR 페이지에 표시된 시간
  scraped_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_br_messages_report ON br_case_messages(report_id);
CREATE INDEX idx_br_messages_case ON br_case_messages(br_case_id);

-- 2) 내부 메모 (팀 전용)
CREATE TABLE br_case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_br_notes_report ON br_case_notes(report_id);

-- 3) 케이스 활동 로그
CREATE TABLE br_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  -- br_submitted, br_amazon_replied, br_reply_sent, br_info_requested,
  -- br_status_changed, br_case_closed, br_case_reopened, br_escalated,
  -- br_sla_warning, br_sla_breached, br_note_added
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  actor_id UUID,                -- NULL이면 시스템 자동
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_br_events_report ON br_case_events(report_id);

-- 4) SLA 설정
CREATE TABLE br_sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_category TEXT NOT NULL, -- 'intellectual_property', 'listing_content' 등
  expected_response_hours INT NOT NULL DEFAULT 120, -- 5 영업일
  warning_threshold_hours INT NOT NULL DEFAULT 96,  -- 4 영업일에 경고
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 기존 reports 테이블 확장

```sql
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_case_status TEXT;
-- 'open', 'answered', 'needs_attention', 'work_in_progress', 'closed'
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_last_amazon_reply_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_last_our_reply_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_sla_deadline_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_reply_pending_text TEXT;
-- Sentinel에서 작성한 답장 텍스트 (Crawler가 발송 전까지 보관)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_reply_pending_attachments JSONB;
-- [{name, storage_path, size}]
```

---

## 4. 기능 목록 요약

| # | 기능명 | 중요도 | 난이도 | Phase |
|---|--------|:------:|:------:|:-----:|
| R1 | Awaiting Amazon / Action Required 상태 분리 | ★★★★★ | ★★☆☆☆ | 1 |
| R2 | SLA 카운트다운 뱃지 | ★★★★☆ | ★★★☆☆ | 2 |
| R3 | 대화 스레드 뷰 (양방향 + 내부 메모) | ★★★★★ | ★★★★☆ | 2 |
| R4 | Needs Attention 스마트 큐 | ★★★★★ | ★★☆☆☆ | 1 |
| R5 | 케이스 활동 로그 (Audit Trail) | ★★★★☆ | ★★☆☆☆ | 2 |
| R6 | 알림/에스컬레이션 규칙 | ★★★★☆ | ★★★☆☆ | 3 |
| R7 | 케이스 연결 (Parent-Child) | ★★★☆☆ | ★★☆☆☆ | 1 |
| R8 | AI 응답 분석 + 다음 행동 제안 | ★★★☆☆ | ★★★★☆ | 3 |
| R9 | BR 케이스 대시보드/통계 | ★★★☆☆ | ★★★☆☆ | 3 |
| R10 | 양방향 답장 (Reply + 파일 첨부) | ★★★★★ | ★★★★☆ | 2 |
| R11 | BR 케이스 자동 스크래핑 (모니터링 워커) | ★★★★★ | ★★★☆☆ | 1 |

---

## 5. 구현 Phase 로드맵

### Phase 1: 기반 구축 — "케이스를 볼 수 있다"
> R1 + R4 + R7 + R11

- DB 스키마 생성 (br_case_messages, br_case_events 등)
- Crawler BR Monitor Worker (케이스 리스트 + 상세 스크래핑)
- reports 테이블 br_case_status 연동
- Awaiting Amazon / Action Required 상태 자동 분류
- Needs Attention 스마트 큐 (리스트 필터)
- 케이스 연결 UI (parent_report_id 시각화)

### Phase 2: 핵심 기능 — "케이스를 관리할 수 있다"
> R2 + R3 + R5 + R10

- 대화 스레드 뷰 (타임라인 UI)
- 내부 메모 (인라인, 팀 전용)
- SLA 카운트다운 뱃지 (초록→노랑→빨강)
- 양방향 답장 (Sentinel에서 작성 → Crawler가 BR에 전송)
- 파일 첨부 (Supabase Storage → Crawler 다운로드 → BR 업로드)
- 케이스 활동 로그 (이벤트 타임라인)

### Phase 3: 고도화 — "케이스가 알아서 관리된다"
> R6 + R8 + R9

- 알림 규칙 (아마존 답장 시 알림, SLA 임박 시 경고)
- AI 응답 분석 (감정 분석, 추가 정보 요청 감지, 다음 행동 제안)
- BR 케이스 대시보드 (해결률, 평균 응답시간, 위반유형별 통계)

---

## 6. 두 트랙 모니터링 체계

### 6.0 기존 모니터링 vs BR 케이스 모니터링

Sentinel은 **두 가지 모니터링 트랙**을 병행 운영한다:

| | Track 1: 리스팅 모니터링 (기존) | Track 2: BR 케이스 모니터링 (신규) |
|---|---|---|
| **대상** | 아마존 상품 페이지 (product detail) | BR Case Dashboard |
| **방식** | 크롤러가 ASIN 재방문 → 스냅샷 diff | 케이스 페이지 스크래핑 → 상태/답장 추출 |
| **목적** | 리스팅 삭제/수정 여부 ("결과" 추적) | 아마존 응답/판단 ("과정" 추적) |
| **주기** | 7일마다 | 30분마다 |
| **행동** | 변화 없음 → SC로 재신고 | 거부 → Reply or 새 케이스 |
| **종료** | 리스팅 변화 감지 → resolved | 케이스 해결 → resolved |
| **코드** | `/api/monitoring/*`, `crawler/src/follow-up/` | `/api/crawler/br-monitor-*` (신규) |

**연동 규칙:**
- 리스팅 삭제 감지 (Track 1) → BR 케이스도 자동 resolved
- BR 케이스 해결 (Track 2) → 리스팅 모니터링도 종료
- 둘 다 미해결 → 에스컬레이션 전략 분기

### 6.0.1 아마존 거부 시 대응 전략

아마존이 "문제 없다"고 케이스를 닫는 경우:

```
BR 케이스 "거부/닫힘" 감지
  │
  ├─ AI 자동 분류 (R08)
  │   → 아마존 판단 유형: 증거 부족 / 정책 미해당 / 자동 응답
  │
  ├─ 전략 1: Reply & Reopen (답장으로 파고들기)
  │   → Reply 버튼으로 추가 증거 + 반박 제출
  │   → 케이스가 다시 열림
  │
  ├─ 전략 2: New Case (닫고 새 케이스)
  │   → 기존 케이스 Close
  │   → 더 강한 증거로 새 BR 신고 제출
  │   → parent_report_id로 연결, escalation_level +1
  │
  ├─ 전략 3: Accept (수용)
  │   → 아마존 판단 수용 → resolved
  │
  └─ 전략 4: 다른 채널 시도
      → SC Report a Violation으로 재시도
      → AI가 더 강한 증거로 신고서 재작성
```

Report Detail UI에 전략 선택 카드 표시:
- `[📝 Reply & Reopen]` — 추가 증거로 반박
- `[🔄 New Case]` — 새 케이스로 에스컬레이션
- `[✅ Accept]` — 아마존 판단 수용

### 6.1 BR 케이스 모니터링 플로우 (자동)

```
30분마다 Crawler 실행
  → BR Case Dashboard 접속
  → 우리 보고서에 연결된 br_case_id 목록 조회
  → 각 케이스 상세 페이지 방문
  → 새 메시지 감지 (마지막 scraped_at 이후)
  → 새 메시지 있으면:
      - br_case_messages에 저장
      - br_case_events에 'br_amazon_replied' 기록
      - reports.br_case_status 업데이트
      - reports.br_last_amazon_reply_at 갱신
      - SLA 카운트다운 리셋 (아마존이 응답했으므로)
  → 상태 변경 감지:
      - Answered → Needs your attention: Action Required로 전환
      - Work in progress → Answered: Awaiting Amazon으로 전환
  → Sentinel Web API로 결과 콜백
```

### 6.2 답장 발송 플로우 (수동 트리거)

```
Sentinel Web에서 답장 작성
  → reports.br_reply_pending_text에 저장
  → 파일 첨부 시 Supabase Storage에 업로드, br_reply_pending_attachments에 경로 저장
  → Crawler가 br-reply-pending API 폴링
  → 대상 발견 시:
      - BR Case Detail 페이지 접속
      - Reply 버튼 클릭
      - kat-textarea에 텍스트 입력
      - 파일 첨부 (Storage에서 다운로드 → BR에 업로드)
      - Send 버튼 클릭
      - 성공 시: br_case_messages에 outbound 메시지 저장, pending 필드 클리어
      - 실패 시: 에러 기록, 재시도 가능
```

### 6.3 케이스 닫기 플로우

```
Sentinel Web에서 "케이스 닫기" 클릭
  → Crawler가 BR Case Detail에서 "Close this case" 클릭
  → reports.br_case_status = 'closed'
  → br_case_events에 'br_case_closed' 기록
  → reports.status를 'resolved'로 전환
```

---

## 7. 브라우저 풀 아키텍처

```
Crawler 시작 시 (오퍼레이터 로그인 1회)
  │
  ├── Browser 1: /tmp/sc-submit-data/
  │   └── PD Reporting 전용 (Extension 담당, Crawler 미사용)
  │
  ├── Browser 2: /tmp/br-submit-data/
  │   └── BR 제출 전용 (기존)
  │
  └── Browser 3: /tmp/br-monitor-data/
      └── BR 모니터링 + 답장 전용 (신규)
          ├── Case Dashboard 스크래핑
          ├── Case Detail 대화 추출
          ├── Reply 발송
          └── Case Close
```

- 각 브라우저는 독립 user-data-dir로 세션 격리
- 로그인 1회 후 하루종일 최소화 상태로 재사용
- BullMQ 큐로 동시성 1 제어 (한 번에 하나만 작업)

---

## 8. 기능별 상세 명세 (별도 문서)

각 기능의 상세 명세는 아래 개별 문서에서 관리한다:

| 문서 | 기능 |
|------|------|
| `R01-status-separation.md` | Awaiting Amazon / Action Required 상태 분리 |
| `R02-sla-countdown.md` | SLA 카운트다운 뱃지 |
| `R03-thread-view.md` | 대화 스레드 뷰 + 내부 메모 |
| `R04-smart-queue.md` | Needs Attention 스마트 큐 |
| `R05-activity-log.md` | 케이스 활동 로그 |
| `R06-notification.md` | 알림/에스컬레이션 규칙 |
| `R07-case-linking.md` | 케이스 연결 (Parent-Child) |
| `R08-ai-analysis.md` | AI 응답 분석 |
| `R09-dashboard.md` | BR 케이스 대시보드 |
| `R10-reply-system.md` | 양방향 답장 시스템 |
| `R11-monitor-worker.md` | BR 케이스 자동 스크래핑 워커 |

---

## 9. 의존 관계

```
R11 (모니터링 워커) ──┐
                      ├── R1 (상태 분리) ──── R4 (스마트 큐)
                      │                  └── R2 (SLA 뱃지)
                      │
                      ├── R3 (스레드 뷰) ── R5 (활동 로그)
                      │
                      └── R10 (답장 시스템)
                              │
R7 (케이스 연결) ─── 독립      R6 (알림) ─── R2 의존
                              R8 (AI 분석) ── R3 의존
                              R9 (대시보드) ── R5, R11 의존
```

R11(모니터링 워커)이 모든 것의 기반. R1(상태)과 R3(스레드 뷰)이 핵심 축.
