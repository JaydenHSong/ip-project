# AI 분석 엔진 완성 Planning Document

> **Summary**: 93% 구현된 AI 분석 파이프라인의 나머지 갭 완성 — 모니터링 Haiku Vision, BullMQ 비동기화, 스크린샷 URL 연동, 템플릿 매칭
>
> **Project**: Sentinel
> **Author**: Claude (PDCA)
> **Date**: 2026-03-02
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

Sentinel의 AI 분석 파이프라인(Claude API)은 이미 **93% 구현** 상태이다. Teacher-Student 아키텍처(Opus 학습 + Sonnet 드래프트 + Haiku 모니터링), 7단계 파이프라인, Skill 시스템, 6/7 API 라우트가 완성되어 있다. **나머지 7%를 완성하여 실 운영 가능한 상태로 만드는 것**이 이 Plan의 목적이다.

### 1.2 Background — 이미 구현된 것

| 영역 | 구현 파일 | 상태 |
|------|----------|------|
| Claude API 클라이언트 (retry, 캐싱, 멀티모달) | `src/lib/ai/client.ts` | 완료 |
| 의심 리스팅 사전 필터 (AI 비용 최적화) | `src/lib/ai/suspect-filter.ts` | 완료 |
| 위반 분석 (Sonnet Worker) | `src/lib/ai/analyze.ts` | 완료 |
| 신고서 드래프트 생성 (Sonnet Worker) | `src/lib/ai/draft.ts` | 완료 |
| Re-write (에디터 피드백 반영) | `src/lib/ai/rewrite.ts` | 완료 |
| Opus 학습 (Teacher → Skill 업데이트) | `src/lib/ai/learn.ts` | 완료 |
| 특허 유사도 (Sonnet Vision) | `src/lib/ai/patent-similarity.ts` | 완료 |
| 스크린샷 검증 (Haiku Vision) | `src/lib/ai/verify-screenshot.ts` | 완료 |
| 7단계 오케스트레이터 | `src/lib/ai/job-processor.ts` | 완료 |
| Skill 관리 (V01~V19 CRUD) | `src/lib/ai/skills/manager.ts` | 완료 |
| Skill 로더 (카테고리 추론) | `src/lib/ai/skills/loader.ts` | 완료 |
| 프롬프트 시스템 (system/analyze/draft/learn/verify) | `src/lib/ai/prompts/*.ts` | 완료 |
| Google Chat 알림 | `src/lib/notifications/google-chat.ts` | 완료 |
| API: POST /api/ai/analyze | 분석 트리거 | 완료 |
| API: POST /api/ai/learn | Opus 학습 | 완료 |
| API: POST /api/ai/rewrite | 피드백 재작성 | 완료 |
| API: POST /api/ai/verify | 스크린샷 검증 | 완료 |
| API: GET/PUT /api/ai/skills | Skill 관리 | 완료 |
| 타입 정의 | `src/types/ai.ts`, `src/types/api.ts` | 완료 |

### 1.3 Related Documents

- `Sentinel_Project_Context.md` — AI 분석 엔진 섹션 (391~668행)
- `supabase/migrations/001_initial_schema.sql` — reports 테이블 AI 필드
- `docs/01-plan/features/crawler-engine.plan.md` — 크롤러 (데이터 공급원)

---

## 2. Scope

### 2.1 In Scope — 나머지 갭 완성

- [ ] **Gap 1**: `/api/ai/monitor` Haiku Vision 실제 구현 (현재 diff 스텁)
- [ ] **Gap 2**: `job-processor.ts` 스크린샷 URL 연동 (현재 `null` 하드코딩)
- [ ] **Gap 3**: BullMQ 비동기 잡 큐 연동 (현재 API 라우트에서 동기 호출)
- [ ] **Gap 4**: 위반유형별 템플릿 매칭 (현재 첫 번째 템플릿만 로드)
- [ ] **Gap 5**: AI 분석 결과 UI 표시 (Report 상세 패널에 AI Analysis 탭)
- [ ] **Gap 6**: 환경변수 검증 + .env.local.example 업데이트

### 2.2 Out of Scope

- Opus/Sonnet/Haiku 프롬프트 자체 (이미 완성)
- Skill CRUD (이미 완성)
- 드래프트/Re-write/학습 로직 (이미 완성)
- Monday.com 특허 동기화 (별도 feature)
- Auto-approve 설정 UI (별도 feature)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status | Gap # |
|----|-------------|----------|--------|-------|
| FR-01 | `/api/ai/monitor` — Haiku Vision으로 스크린샷 비교 (현재 diff 스텁 → Vision 교체) | High | Pending | Gap 1 |
| FR-02 | 모니터링 스크린샷 비교 시 이전 스크린샷 vs 현재 스크린샷 Vision 분석 | High | Pending | Gap 1 |
| FR-03 | `job-processor.ts`에서 리스팅의 `screenshot_url` (Supabase Storage) 전달 | Medium | Pending | Gap 2 |
| FR-04 | BullMQ 워커: 리스팅 도착 → AI 분석 잡 큐잉 (동기→비동기 전환) | Medium | Pending | Gap 3 |
| FR-05 | BullMQ 잡 실패 시 3회 재시도 (exponential backoff) | Medium | Pending | Gap 3 |
| FR-06 | `report_templates`에서 위반유형 매칭 템플릿 로드 (현재: 첫 번째만) | Medium | Pending | Gap 4 |
| FR-07 | Report 상세 SlidePanel에 AI Analysis 탭 추가 (분석 결과, 근거, 증거) | Medium | Pending | Gap 5 |
| FR-08 | `.env.local.example`에 `ANTHROPIC_API_KEY`, `REDIS_URL` 추가 | Low | Pending | Gap 6 |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| Performance | AI 분석 잡 타임아웃 60초 (BullMQ) |
| Cost | 의심 리스팅에만 AI 호출 (suspect-filter 유지) |
| Reliability | Haiku Vision 실패 시 기존 diff 로직 fallback |
| Security | ANTHROPIC_API_KEY 서버사이드만 사용, 클라이언트 노출 금지 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `/api/ai/monitor` — Haiku Vision 호출로 실제 스크린샷 비교
- [ ] `processAiAnalysis()` — 스크린샷 URL 정상 전달
- [ ] BullMQ로 AI 분석 비동기 처리 (잡 큐잉 + 워커)
- [ ] 위반유형별 맞춤 템플릿 로드
- [ ] Report 상세에서 AI 분석 결과 확인 가능
- [ ] ANTHROPIC_API_KEY 없이 실행 시 명확한 에러

### 4.2 Quality Criteria

- [ ] 기존 AI 코드 수정 최소화 (갭만 채우기)
- [ ] 새 코드도 기존 패턴 준수 (parseResponse, JSON 스키마 검증)
- [ ] BullMQ 잡 실패 시 report.status에 'ai_failed' 기록 안 함 → 수동 전환

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Haiku Vision 비용 증가 | Medium | Medium | 모니터링 대상만 호출, Batch API 활용 |
| BullMQ Redis 미설치 | Medium | High | Redis 없으면 동기 fallback 모드 |
| 스크린샷 URL 만료 | Low | Low | Supabase Storage Signed URL (1시간) |

---

## 6. Architecture Considerations

### 6.1 수정 대상 파일

```
src/
  app/api/ai/
    monitor/route.ts          ← Gap 1: Haiku Vision 교체
    analyze/route.ts          ← Gap 2+3: 스크린샷 URL + BullMQ
  lib/ai/
    job-processor.ts          ← Gap 2: screenshotUrl 전달
    queue.ts                  ← Gap 3: NEW — BullMQ 잡 정의 + 워커
  lib/ai/templates/
    matcher.ts                ← Gap 4: NEW — 위반유형별 템플릿 매칭
  app/(protected)/reports/
    [id]/AiAnalysisTab.tsx    ← Gap 5: NEW — AI 분석 결과 UI
```

### 6.2 환경변수

```env
# AI (필수)
ANTHROPIC_API_KEY=sk-ant-xxx

# Job Queue (선택 — 없으면 동기 모드)
REDIS_URL=redis://localhost:6379
```

---

## 7. Implementation Estimate

| 항목 | 복잡도 |
|------|--------|
| Gap 1: /api/ai/monitor Haiku Vision | Medium |
| Gap 2: 스크린샷 URL 연동 | Low |
| Gap 3: BullMQ 비동기화 | Medium |
| Gap 4: 위반유형별 템플릿 매칭 | Low |
| Gap 5: AI Analysis UI 탭 | Medium |
| Gap 6: 환경변수 정리 | Low |
| **전체** | **Medium** |

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`/pdca design ai-analysis`)
2. [ ] Gap 1~6 순서대로 구현
3. [ ] 기존 AI 코드와 통합 테스트
4. [ ] Gap 분석

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial draft — 93% 완성 기준, 나머지 7% 갭 정리 | Claude (PDCA) |
