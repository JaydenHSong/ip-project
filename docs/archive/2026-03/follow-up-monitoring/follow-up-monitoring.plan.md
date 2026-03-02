# Follow-up Monitoring Planning Document

> **Summary**: 신고 제출 후 리스팅 자동 재방문 + AI 변화 감지 + 해결/미해결 판단 + 인앱 알림
>
> **Project**: Sentinel
> **Author**: Claude (PDCA)
> **Date**: 2026-03-02
> **Status**: Draft
> **Version**: 0.1

---

## 1. Overview

### 1.1 Purpose

아마존은 신고 결과를 통보하지 않는다. 현재 Sentinel은 SC에 신고 제출(submitted) 후 수동으로 리스팅을 재방문하여 결과를 확인해야 한다. 이 피처는 크롤러가 주기적으로 리스팅을 재방문하고, AI(Haiku)가 스크린샷을 비교하여 변화를 감지하며, 해결/미해결을 자동 판단하여 인앱 알림으로 통보하는 능동적 모니터링 시스템을 구축한다.

### 1.2 Background

- 아마존 셀러 위반 신고 후 결과 확인이 100% 수동 (OMS 시스템 한계)
- 팀 리더가 매일 수십 건의 신고 결과를 일일이 확인하는 반복 업무
- 장기 미해결 건에 대한 추적 누락 → 재신고 시점 놓침
- MS2 완료로 신고 파이프라인(수집→분석→승인→SC제출)은 동작 중
- MS3의 첫 번째 핵심 피처 — 파이프라인의 마지막 루프를 완성

### 1.3 Related Documents

- `Sentinel_Project_Context.md` — "신고 후 팔로업 모니터링" 섹션, "Pending 모니터링 상세" 섹션
- Feature IDs: **F19** (자동 재방문+변화감지), **F20b** (Monitoring→Resolved/Unresolved), **F21** (미해결 알림), **F35** (스크린샷+AI 리마크), **F36** (모니터링 주기 설정)
- 관련 결정: D20, D52, D53, D54, D56

---

## 2. Scope

### 2.1 In Scope

- [x] 크롤러 팔로업 모듈 — 주기적 리스팅 재방문 + 스크린샷 캡처
- [x] BullMQ 모니터링 큐 — submitted→monitoring 전환 시 자동 등록
- [x] AI 변화 감지 — Haiku가 초기/현재 스크린샷 비교 + 리마크 작성
- [x] report_snapshots 저장 — 재방문 결과 DB + Storage 저장
- [x] 해결/미해결 판정 — AI 판단 + 사람 확인
- [x] 인앱 알림 — 변화 감지 시 Supabase Realtime 알림
- [x] 모니터링 API 엔드포인트 (start-monitoring, snapshots, resolve)
- [x] 모니터링 UI — 스냅샷 뷰어, before/after 비교, 리마크 표시
- [x] 모니터링 주기 설정 — Settings 페이지 (기본 7일)

### 2.2 Out of Scope

- AI 강화 재신고서 자동 생성 (F30 — 별도 피처)
- 에스컬레이션 워크플로우 (Re-submitted → Escalated 단계)
- 자동 리포트 생성 (F17 — 별도 피처)
- Auto-approve 설정 (F34 — 별도 피처)
- 다국가 확장 (F04b — 별도 피처)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Feature |
|----|-------------|----------|---------|
| FR-01 | 신고 submitted→monitoring 전환 시 모니터링 큐에 자동 등록 | High | F19 |
| FR-02 | 설정된 주기(기본 7일)마다 크롤러가 리스팅 재방문 | High | F19/F36 |
| FR-03 | 재방문 시 페이지 스크린샷 캡처 + Supabase Storage 저장 | High | F35 |
| FR-04 | AI(Haiku)가 초기 vs 현재 스크린샷 비교하여 변화 유형 판단 | High | F35 |
| FR-05 | AI 리마크(변화 분석 텍스트) 생성 및 report_snapshots 저장 | High | F35 |
| FR-06 | 변화 감지 시 인앱 알림 발송 (Supabase Realtime) | High | F21 |
| FR-07 | AI가 해결 판단 시 → resolved 상태 제안 (사람 확인) | High | F20b |
| FR-08 | 최대 모니터링 기간(90일) 초과 시 → unresolved 확정 | Medium | F20b |
| FR-09 | 모니터링 주기 Admin 설정 (Settings 페이지) | Medium | F36 |
| FR-10 | 스냅샷 뷰어 UI — before/after 비교 + AI 마킹 오버레이 | High | F35 |
| FR-11 | 모니터링 탭 — submitted/monitoring 상태 리포트 목록 | Medium | F19 |
| FR-12 | 변화 없음 + N일 경과 시 AI 주간 리마크 + 계속 모니터링 | Low | F35 |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Performance | 재방문 큐 처리: 100건/시간 | BullMQ 메트릭 |
| Cost | Haiku 모니터링 비용: 건당 ~$0.005 | Claude API 사용량 |
| Reliability | 재방문 실패 시 3회 자동 재시도 | BullMQ retry |
| Storage | 스크린샷 평균 200KB × 건당 최대 12회(90일/7일) | Supabase Storage |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] submitted 상태 신고가 모니터링 큐에 자동 등록됨
- [x] 크롤러가 주기적으로 재방문하여 스크린샷 저장
- [x] AI가 변화를 감지하고 리마크 작성
- [x] 인앱 알림으로 변화 감지 통보
- [x] UI에서 before/after 스냅샷 비교 가능
- [x] pnpm typecheck + pnpm build 성공

### 4.2 Quality Criteria

- [x] 타입 에러 없음
- [x] 빌드 성공
- [x] Gap Analysis Match Rate >= 90%

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 크롤러 서버 미배포 (현재 로컬만) | High | High | Web API 모킹 + Demo mode로 UI/API 우선 구현, 크롤러는 인터페이스만 정의 |
| Supabase Storage 미설정 | Medium | Medium | 스크린샷 URL을 DB에 직접 저장 (base64 또는 외부 URL) |
| Haiku API 비용 초과 | Low | Low | Batch API 활용, 이미지 리사이즈로 토큰 절감 |
| 아마존 페이지 구조 변경 | Medium | Medium | 셀렉터 모듈화, 변경 감지 알림 |
| BullMQ/Redis 미설치 (Vercel 환경) | High | High | Vercel Cron + Supabase Edge Function으로 대체, 또는 별도 서버 필요 |

### 5.1 Key Architecture Decision: Vercel vs Dedicated Server

현재 Web은 Vercel 배포 중이고, BullMQ는 Redis가 필요하므로 Vercel에서 직접 실행 불가.

**선택지:**
1. **Vercel Cron + Supabase**: Cron이 주기적으로 API 호출 → Supabase에서 pending 목록 조회 → Edge Function에서 크롤링 트리거
2. **별도 서버 (Railway/AWS)**: 크롤러 서버에 모니터링 워커 추가 배치
3. **하이브리드**: Web API는 Vercel, 모니터링 워커만 별도 서버

> **권장**: Option 3 (하이브리드) — 기존 크롤러 서버에 모니터링 워커 추가. Web에서는 API만 제공.

---

## 6. Architecture Considerations

### 6.1 Project Level

| Level | Selected |
|-------|:--------:|
| **Dynamic** | ✅ |

### 6.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 모니터링 트리거 | BullMQ Repeatable Job | 크롤러 서버에서 실행, 기존 패턴 재사용 |
| 스크린샷 저장 | Supabase Storage | 기존 인프라 활용, CDN 제공 |
| AI 모니터링 모델 | Claude Haiku | 비용 최저 ($0.005/건), 스크린샷 비교에 충분 |
| 알림 | Supabase Realtime | 인앱 알림만 (이메일 없음) |
| 스냅샷 비교 UI | CSS Overlay + Side-by-side | 원본 보존 + AI 마킹 좌표 오버레이 |

### 6.3 Component Architecture

```
[크롤러 서버]
  ├── follow-up/revisit-worker.ts    ← BullMQ 워커 (재방문 실행)
  ├── follow-up/snapshot-capture.ts  ← 스크린샷 캡처 + Storage 업로드
  └── follow-up/scheduler.ts        ← 모니터링 큐 스케줄링

[Web API (Vercel)]
  ├── /api/reports/[id]/start-monitoring   ← submitted→monitoring 전환
  ├── /api/reports/[id]/snapshots          ← 스냅샷 목록/상세 조회
  ├── /api/reports/[id]/resolve            ← 해결/미해결 확정
  ├── /api/monitoring/pending              ← 크롤러용: 재방문 대상 목록
  ├── /api/monitoring/callback             ← 크롤러용: 재방문 결과 콜백
  └── /api/settings/monitoring             ← 모니터링 주기 설정

[Web UI]
  ├── /reports (monitoring 탭)     ← 모니터링 중 리포트 목록
  ├── /reports/[id] (snapshots)    ← 스냅샷 뷰어 + before/after
  └── /settings (monitoring)       ← 모니터링 주기 설정

[AI (Haiku)]
  └── /api/ai/monitor              ← 스크린샷 비교 + 리마크 생성
```

### 6.4 Data Flow

```
submitted 확인 (confirm-submitted)
  → monitoring_started_at 기록 + 모니터링 큐 등록
  → 매 N일: 크롤러 재방문 → 스크린샷 캡처
  → Haiku가 초기 vs 현재 비교 → 변화 유형 + 리마크
  → report_snapshots INSERT
  → 변화 감지 시 → 인앱 알림 (notifications INSERT)
  → 해결 판단 시 → resolved 제안 → 사람 확인
  → 90일 초과 → unresolved 확정
```

---

## 7. Existing Infrastructure (Already Implemented)

### 7.1 DB 스키마 (이미 존재)

- `reports` 테이블: `monitoring_started_at`, `resolved_at`, `resolution_type`, `parent_report_id`, `escalation_level`
- `report_snapshots` 테이블: `snapshot_type`, `listing_data`, `diff_from_initial`, `change_detected`, `change_type`, `crawled_at`
- `notifications` 테이블: `followup_change_detected`, `followup_no_change` 타입

### 7.2 타입 정의 (이미 존재)

- `ReportStatus`: `monitoring`, `resolved`, `unresolved` 포함
- `ResolutionType`: `listing_removed`, `content_modified`, `seller_removed`, `no_change`
- `NotificationType`: `followup_change_detected`, `followup_no_change`

### 7.3 크롤러 큐 (이미 존재)

- `crawler/src/scheduler/`: BullMQ 큐 + 워커 + 스케줄러
- `crawler/src/scraper/screenshot.ts`: 스크린샷 캡처 기능

---

## 8. Implementation Estimate

| 영역 | 예상 LoC | 복잡도 |
|------|:--------:|:------:|
| Web API (6 endpoints) | ~300 | Medium |
| AI 모니터링 프롬프트 | ~100 | Low |
| 크롤러 팔로업 모듈 (인터페이스) | ~200 | Medium |
| Web UI (스냅샷 뷰어 + 모니터링 탭) | ~400 | High |
| Settings 모니터링 설정 | ~150 | Low |
| 인앱 알림 시스템 | ~200 | Medium |
| **합계** | **~1,350** | **Medium-High** |

---

## 9. Implementation Strategy

MS3 환경 특성상 크롤러 서버는 아직 배포되지 않았으므로:

1. **Phase A: Web API + Demo Mode** — API 엔드포인트 구현 + Demo 데이터로 동작 확인
2. **Phase B: UI** — 모니터링 탭, 스냅샷 뷰어, Settings 모니터링 설정
3. **Phase C: AI 모니터링** — Haiku 프롬프트 + 스크린샷 비교 로직
4. **Phase D: 크롤러 인터페이스** — 팔로업 모듈 인터페이스 정의 (실 구동은 서버 배포 후)
5. **Phase E: 알림** — 인앱 알림 트리거 + Realtime 연동

---

## 10. Next Steps

1. [ ] `/pdca design follow-up-monitoring` — 상세 설계 문서 작성
2. [ ] 설계 검토 후 구현 시작
3. [ ] Gap Analysis >= 90% 달성

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial draft | Claude (PDCA) |
