# BR Phase 2 — 4-Track Master Plan

## Status: PENDING
## Assigned Session: (orchestrator)
## Completed At:

---

## Overview

BR 제출 자동화 완료 후, 케이스 관리 + Worker 안정화 + PD 팔로업 통합.
16개 항목을 4개 트랙으로 분류, 의존성 기반 병렬/순차 실행.

### 기존 계획 참조
- `docs/archive/2026-03/br-case-management/br-case-management.plan.md` (6 플랫폼 벤치마크)
- `docs/archive/2026-03/br-case-management/design/R01~R11` (개별 설계)

---

## Track A: Crawler + Worker (인프라 안정화)

서버 사이드, Web UI 무관. 즉시 시작 가능.

| # | 항목 | 설명 | 우선순위 | 예상 |
|---|------|------|:--------:|:----:|
| A1 | Worker Down Alert | Google Chat webhook — Worker 비정상 시 즉시 알림 | P0 | 2h |
| A2 | Daily Report (GChat) | 일일 처리 건수/실패/큐 잔량 요약 → Google Chat | P1 | 2h |
| A3 | Extension BR 코드 롤백 | MAIN world 시도 코드 제거, background.ts 정리 | P2 | 1h |
| A4 | Railway 배포 | worker.ts + form-config.ts + types.ts 변경분 push | P0 | 0.5h |

### A1: Worker Down Alert (Google Chat Webhook)

**필요 환경변수**: `GCHAT_WEBHOOK_URL`

```
워커 시작 → heartbeat 등록 (30초 간격)
heartbeat 실패 3회 연속 → Google Chat POST
워커 재시작 → 복구 알림
```

**구현 위치**: `crawler/src/br-submit/health.ts` (신규)

```typescript
// POST https://chat.googleapis.com/v1/spaces/.../messages?key=...&token=...
// { text: "🚨 BR Worker DOWN — last heartbeat: 2026-03-09 14:30:00 KST" }
```

### A2: Daily Report

**스케줄**: cron `0 9 * * *` (KST 09:00)
**내용**: 어제 처리 건수, 성공/실패 비율, 현재 큐 대기, 에러 Top 3

### A3: Extension BR 코드 롤백

Extension `background.ts`에서 BR MAIN world 시도 코드 제거.
Extension은 PD reporting만 담당하는 것으로 확정.

### A4: Railway 배포

이번 세션에서 변경한 파일들 push:
- `src/br-submit/worker.ts` (물리 클릭, form-config 기반)
- `src/br-submit/form-config.ts` (신규)
- `src/br-submit/types.ts` (subject 제거, asins/orderId 추가)
- `src/br-submit/queue.ts` (rate 2/min)
- `src/br-submit/scheduler.ts` (subject 제거)

---

## Track B: Web — BR Integration (AI 드래프트 + 제출 데이터)

Web 코드 변경. Track A4 배포 후 진행 권장.

| # | 항목 | 설명 | 우선순위 | 예상 |
|---|------|------|:--------:|:----:|
| B1 | AI 드래프트 수정 | form-config 필드 구조에 맞게 AI 프롬프트/결과 수정 | P0 | 3h |
| B2 | br_submit_data 빌드 수정 | subject 제거, asins/orderId 추가 (API → BullMQ) | P0 | 2h |
| B3 | BR Excel 템플릿 임포트 | 10년치 신고 템플릿 업로드 → AI 참조용 저장 | P1 | 4h |
| B4 | BR 재신고 버튼 | 완료 케이스에서 새 케이스 오픈 (DB 연결, Amazon은 신규) | P1 | 3h |

### B1: AI 드래프트 수정

현재 AI가 생성하는 draft 구조:
```
{ description, subject, productUrls, ... }
```
→ 변경:
```
{ description, productUrls, sellerStorefrontUrl?, policyUrl?, asins?, orderId? }
```

`form-config.ts`의 필드 정의를 AI 프롬프트에 주입하여 폼 타입별 정확한 필드 생성.

### B2: br_submit_data 빌드 수정

Web → API → Crawler Queue로 전달되는 데이터 구조 맞춤.
`src/app/api/reports/[id]/br-submit/route.ts` 수정.

### B3: BR Excel 템플릿 임포트

Spigen이 10년간 사용한 BR 신고 템플릿 (Excel).
이를 파싱하여 AI가 드래프트 작성 시 참조하도록 DB 저장.

**흐름**: Excel 업로드 → 파싱 → `br_templates` 테이블 → AI 프롬프트에 few-shot 주입

### B4: BR 재신고 버튼

- UI: 완료된 BR 케이스 상세 → "재신고" 버튼
- 동작: 기존 report_id 기반으로 새 br_case 생성 (parent_case_id 연결)
- Amazon 관점: 완전히 새 케이스
- Sentinel 관점: 케이스 체이닝 (이력 추적 가능)

---

## Track C: Web — Case Management UI (벤치마크 기능)

기존 BRCM 설계(R01~R11) 중 핵심 기능 선별 구현.
Track B 완료 후 또는 병렬 진행 가능.

| # | 항목 | 설명 | 참조 | 우선순위 | 예상 |
|---|------|------|------|:--------:|:----:|
| C1 | Smart Queue | 자동 분류: 미처리/SLA임박/답변도착 | R04 | P1 | 6h |
| C2 | SLA 뱃지 | Green→Yellow→Red 카운트다운 | R02 | P1 | 3h |
| C3 | 케이스 체이닝 | 재신고 이력 연결 (B4 의존) | R07 | P1 | 2h |
| C4 | AI 답변 분류 | 승인/거부/정보요청/진행중 자동 태깅 | R08 | P2 | 4h |
| C5 | Bulk Actions | 일괄 재신고, 일괄 아카이브 | — | P2 | 3h |

### 벤치마크 출처

| 기능 | 원본 플랫폼 |
|------|------------|
| Smart Queue | Freshdesk (실시간 대시보드), Zendesk (Views) |
| SLA 뱃지 | Zendesk (SLA countdown), Salesforce (SLA milestones) |
| 케이스 체이닝 | Salesforce (Case hierarchy), HubSpot (Pipeline stages) |
| AI 답변 분류 | Freshdesk (AI auto-classify), Zendesk (AI triage) |
| Bulk Actions | Zendesk (Bulk update), Freshdesk (Scenario automations) |

---

## Track D: PD Follow-up (리스팅 재방문)

Crawler 스케줄러 + Web UI. Track A와 병렬 가능.

| # | 항목 | 설명 | 우선순위 | 예상 |
|---|------|------|:--------:|:----:|
| D1 | PD 자동 팔로업 스케줄러 | cron 기반 리스팅 재방문, 변경 감지 | P1 | 5h |
| D2 | 개별 팔로업 오버라이드 UI | 리포트별 팔로업 주기 수동 설정 | P2 | 2h |
| D3 | PD 리포트 상세 화면 수정 | 팔로업 이력, 변경 diff 표시 | P2 | 3h |

### D1: PD 자동 팔로업 스케줄러

```
cron (매일 1회)
  → submitted 상태 리포트 조회
  → 제출일 기준 D+3, D+7, D+14, D+30 재방문
  → ASIN 페이지 크롤링
  → 변경 감지 (가격, 이미지, 타이틀, 판매자, 리스팅 삭제)
  → 상태 업데이트 (resolved / still_active / modified)
```

---

## 의존성 & 실행 순서

```
Phase 1 (즉시 시작 — 병렬)
├── Track A: A1, A2, A3, A4 (Crawler/Worker)
├── Track D: D1 (PD 스케줄러)
└── Track C: C1, C2 (Smart Queue, SLA — UI만, API 미연동 가능)

Phase 2 (Track A4 배포 후)
├── Track B: B1, B2 (AI 드래프트, submit data)
└── Track C: C4 (AI 답변 분류)

Phase 3 (Track B 완료 후)
├── Track B: B3, B4 (템플릿, 재신고)
├── Track C: C3 (체이닝 — B4 의존)
├── Track C: C5 (Bulk Actions)
└── Track D: D2, D3 (팔로업 UI)
```

## 핵심 환경변수 (추가 필요)

| 변수 | 용도 | 위치 |
|------|------|------|
| `GCHAT_WEBHOOK_URL` | Google Chat 알림 | Railway, .env.local |

## Queue 설정

- **BR Submit Worker**: concurrency=1, rate 2건/분, 3회 재시도 (5→10→20분 백오프)
- **PD Follow-up Worker**: concurrency=2, rate 10건/분 (읽기 전용이라 넉넉하게)
- **24/7 상시 운영** — 출퇴근 개념 없음

---

## 작업 시작 기준

1. **A4 (Railway 배포)** 먼저 → Worker 코드 반영
2. **A1 (GChat Alert)** → Worker 모니터링 확보
3. **B1 + B2** → Web에서 새 필드 구조로 제출 가능
4. 이후 C, D 트랙 병렬 진행
