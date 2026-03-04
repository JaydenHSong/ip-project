# AI Learning Pipeline Plan

> **Feature**: AI 분석 자동화 + Opus 학습 루프 + Auto-approve
>
> **Project**: Spigen Sentinel
> **Author**: Claude (AI)
> **Date**: 2026-03-04
> **Status**: Draft
> **Priority**: P1
> **Estimated Effort**: Medium (기존 코드 연결 위주, 신규 구현 최소)

---

## 1. Background

### 1.1 현재 상황

AI 분석 엔진 코드가 **19개 파일**로 완전 구현되어 있습니다 (PDCA 96%, archived):

**구현 완료:**
- `src/lib/ai/` — client, analyze, draft, rewrite, learn, monitor-compare, verify-screenshot, patent-similarity, suspect-filter, job-processor, queue, prompts/*, skills/*, templates/*
- `src/app/api/ai/` — 7개 API 라우트 (analyze, rewrite, learn, monitor, verify, skills, jobs)
- `src/types/ai.ts` — 모든 타입 정의
- `skills/V01~V19.md` — 19개 Skill 문서 (기본 시드)
- Teacher-Student-Monitor 3모델 아키텍처 (Opus/Sonnet/Haiku)

**빠진 것 (이 Plan의 범위):**
- Crawler → AI 분석 자동 트리거 (현재 수동으로 `/api/ai/analyze` 호출 필요)
- Opus 학습 루프 프로덕션 활성화 (learn.ts 코드 있지만 실제 학습 데이터 없음)
- Auto-approve 설정 UI (로직은 정의됨, Admin 토글 UI 미구현)
- ANTHROPIC_API_KEY 프로덕션 환경변수 설정
- 비용 모니터링 대시보드

### 1.2 목표

AI 파이프라인의 **프로덕션 연동**을 완성하여, Crawler가 수집한 의심 리스팅이 자동으로 AI 분석 → 드래프트 생성 → 학습까지 이어지는 end-to-end 흐름을 만든다.

---

## 2. Requirements

### FR (Functional Requirements)

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| FR-01 | Crawler 의심 리스팅 → AI 분석 자동 트리거 | P0 |
| FR-02 | Extension 제보 → AI 분석 자동 트리거 | P0 |
| FR-03 | AI 분석 결과 → Report 자동 생성 (status: draft) | P0 |
| FR-04 | Report 승인 시 → Opus 학습 자동 호출 (fire-and-forget) | P0 |
| FR-05 | Auto-approve 설정 UI (Admin Settings) | P1 |
| FR-06 | Auto-approve 로직 적용 (confidence >= threshold → 자동 승인) | P1 |
| FR-07 | AI 분석 비용 모니터링 (Dashboard 카드) | P2 |
| FR-08 | ANTHROPIC_API_KEY 환경변수 설정 (Vercel) | P0 |

### NFR (Non-Functional Requirements)

| ID | 요구사항 | 기준 |
|----|----------|------|
| NFR-01 | AI 분석 응답 시간 | < 30초 (Sonnet 분석 + 드래프트) |
| NFR-02 | 비용 제한 | < $300/월 (3,000건 기준) |
| NFR-03 | 에러 시 수동 폴백 | AI 실패해도 Report 수동 작성 가능 |
| NFR-04 | API Rate Limit 대응 | BullMQ 큐 + 지수 백오프 |

---

## 3. Architecture

### 3.1 현재 흐름 (수동)

```
Crawler/Extension → listings 저장 → [수동] POST /api/ai/analyze → Report 생성
                                                                   ↓
                                             [수동] Editor 승인 → [수동] POST /api/ai/learn
```

### 3.2 목표 흐름 (자동)

```
Crawler (is_suspect=true)
  └─→ POST /api/crawler/listings/batch
       └─→ 자동: POST /api/ai/analyze (fire-and-forget, async=true)
            └─→ Sonnet 분석 → Report(draft) 자동 생성
                 └─→ Auto-approve 체크
                      ├─ ON + confidence >= threshold → Submitted (자동)
                      └─ OFF → Review Queue (Editor 대기)
                           └─→ Editor 승인/수정
                                └─→ 자동: POST /api/ai/learn (fire-and-forget)
                                     └─→ Opus → Skill 문서 업데이트

Extension 제보 (user_violation_type 지정)
  └─→ POST /api/ext/submit-report
       └─→ 자동: POST /api/ai/analyze (fire-and-forget)
            └─→ (위와 동일한 흐름)
```

### 3.3 Auto-approve 흐름

```
Report 생성 (draft)
  ↓
Auto-approve 설정 확인
  ├─ 해당 violation_type에 auto-approve ON?
  │    ├─ YES: ai_confidence >= threshold (default 90)?
  │    │    ├─ YES → status 'approved' → 바로 SC 제출 대기
  │    │    └─ NO  → status 'pending_review' (Editor 검토)
  │    └─ NO → status 'pending_review'
  └─ 글로벌 auto-approve OFF → status 'pending_review'
```

---

## 4. Implementation Plan

### Phase 1: 자동 트리거 연결 (P0)

| # | Task | Detail |
|---|------|--------|
| 1.1 | Crawler listings/batch API에 AI 분석 자동 트리거 추가 | `is_suspect=true` 리스팅에 대해 `POST /api/ai/analyze` fire-and-forget 호출 |
| 1.2 | Extension submit-report API에 AI 분석 자동 트리거 추가 | Report 생성 후 `POST /api/ai/analyze` fire-and-forget 호출 |
| 1.3 | job-processor에서 Report 자동 생성 확인 | analyze → draft → insert report 흐름이 정상 동작하는지 검증 |
| 1.4 | ANTHROPIC_API_KEY Vercel 환경변수 설정 | 프로덕션 API 키 추가 |

### Phase 2: 학습 루프 활성화 (P0)

| # | Task | Detail |
|---|------|--------|
| 2.1 | Report 승인 API에 Opus 학습 자동 호출 확인 | `/api/reports/:id/approve`에서 `POST /api/ai/learn` fire-and-forget |
| 2.2 | 원본 드래프트 보존 검증 | `original_draft_body` 컬럼에 AI 초기 드래프트 저장 확인 |
| 2.3 | Skill 문서 업데이트 검증 | Opus 학습 후 `skills/V01~V19.md` 파일 변경 확인 |
| 2.4 | Re-write 피드백 학습 연동 확인 | Re-write 패턴도 Opus 학습 입력에 포함되는지 검증 |

### Phase 3: Auto-approve 설정 UI (P1)

| # | Task | Detail |
|---|------|--------|
| 3.1 | Settings 페이지에 Auto-approve 섹션 추가 | `system_configs` 테이블에 auto_approve 설정 저장 |
| 3.2 | Violation 타입별 ON/OFF 토글 | V01~V19 각각 auto-approve 활성화 가능 |
| 3.3 | 글로벌 confidence threshold 슬라이더 | 기본값 90%, 50~100 범위 |
| 3.4 | Auto-approve 로직 적용 | Report 생성 시 auto-approve 조건 체크 → 자동 승인 |

### Phase 4: 모니터링 + 비용 (P2)

| # | Task | Detail |
|---|------|--------|
| 4.1 | Dashboard에 AI 비용 카드 추가 | 일/주/월 API 호출 수 + 예상 비용 표시 |
| 4.2 | AI 정확도 추적 | approve/reject/rewrite 비율 per violation type |
| 4.3 | Skill 성숙도 지표 | 각 V01~V19의 rewrite rate 추이 |

---

## 5. 수정 대상 파일

### 5.1 API Routes (수정)

| 파일 | 변경 내용 |
|------|----------|
| `src/app/api/crawler/listings/batch/route.ts` | `is_suspect=true` 리스팅에 AI 분석 자동 트리거 추가 |
| `src/app/api/ext/submit-report/route.ts` | Report 생성 후 AI 분석 자동 트리거 추가 |
| `src/app/api/reports/[id]/approve/route.ts` | Opus 학습 자동 호출 확인/추가 |

### 5.2 Settings UI (신규/수정)

| 파일 | 변경 내용 |
|------|----------|
| `src/app/settings/page.tsx` | Auto-approve 설정 섹션 추가 |
| `src/components/features/AutoApproveSettings.tsx` | 신규: V01~V19 토글 + threshold 슬라이더 |
| `src/app/api/settings/auto-approve/route.ts` | 신규: auto-approve 설정 CRUD API |

### 5.3 i18n (수정)

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/i18n/locales/en.ts` | settings.autoApprove 번역 추가 |
| `src/lib/i18n/locales/ko.ts` | settings.autoApprove 번역 추가 |

### 5.4 Dashboard (수정, P2)

| 파일 | 변경 내용 |
|------|----------|
| `src/app/dashboard/page.tsx` | AI 비용/정확도 카드 추가 |

---

## 6. Environment Variables

### Vercel (추가 필요)

| 변수 | 필수 | 설명 |
|------|:----:|------|
| `ANTHROPIC_API_KEY` | O | Claude API 키 (Anthropic Console에서 발급) |

### 이미 설정됨

| 변수 | 위치 | 용도 |
|------|------|------|
| `REDIS_URL` | Railway | BullMQ async 큐 (선택, 없으면 sync 폴백) |

---

## 7. Auto-approve 설정 스키마

### system_configs 테이블 활용

```json
{
  "key": "auto_approve",
  "value": {
    "enabled": false,
    "threshold": 90,
    "violation_types": {
      "V01": false,
      "V02": false,
      "V03": false,
      "V04": false,
      "V05": true,
      "V06": true,
      "V07": false,
      "V08": true,
      "V09": false,
      "V10": true,
      "V11": false,
      "V12": false,
      "V13": false,
      "V14": false,
      "V15": false,
      "V16": false,
      "V17": false,
      "V18": false,
      "V19": false
    }
  }
}
```

**안전 설계**: 초기에는 모든 violation type OFF. IP 관련(V01~V04)은 항상 수동 검토 권장.

---

## 8. Risk & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|:------:|:----------:|------------|
| API 비용 폭증 | 예산 초과 | Medium | 일일 호출 한도 설정, suspect-filter로 불필요 호출 차단 |
| AI 오판으로 잘못된 신고 | 법적 리스크 | Low | Auto-approve는 낮은 위험(V05~V10)만 허용, IP류(V01~V04) 수동 필수 |
| Anthropic API 장애 | 분석 중단 | Low | sync 폴백 + Editor 수동 드래프트 작성 가능 |
| Opus 학습 품질 저하 | Skill 퇴화 | Low | Admin이 Skill 문서 직접 편집 가능 (PUT /api/ai/skills/[type]) |
| Rate Limit 초과 | 분석 지연 | Medium | BullMQ 큐 + 지수 백오프 (기 구현) |

---

## 9. Success Criteria

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-01 | Crawler → AI 분석 자동 실행 | 의심 리스팅 저장 후 Report(draft) 자동 생성 확인 |
| SC-02 | Extension → AI 분석 자동 실행 | Extension 제보 후 AI 분석 결과 Report에 반영 확인 |
| SC-03 | Report 승인 → Opus 학습 호출 | 승인 후 Skill 문서 변경 로그 확인 |
| SC-04 | Auto-approve 동작 | threshold 이상 confidence 시 자동 승인 확인 |
| SC-05 | Auto-approve 설정 UI | Settings에서 토글/threshold 변경 가능 확인 |
| SC-06 | ANTHROPIC_API_KEY 작동 | 실제 Claude API 호출 성공 확인 |

---

## 10. Out of Scope

- Crawler 코드 수정 (이미 완료, 배포됨)
- AI 분석 로직 변경 (analyze.ts, draft.ts 등 기존 코드 유지)
- Prompt 내용 변경 (기존 prompts/*.ts 유지)
- Follow-up 모니터링 자동화 (별도 feature)
- Skill 문서 초기 학습 데이터 생성 (실제 승인 데이터 쌓이면 자동)

---

## 11. Dependencies

| 항목 | 상태 | 필요 Action |
|------|:----:|-------------|
| AI 엔진 코드 (`src/lib/ai/`) | 완료 | 없음 |
| AI API 라우트 (`src/app/api/ai/`) | 완료 | 없음 |
| Skill 문서 (`skills/V01~V19.md`) | 시드 완료 | Opus 학습으로 자동 성장 |
| Report Templates (67개) | 완료 | 없음 |
| Crawler 배포 (Railway) | 완료 | 없음 |
| Extension SC 자동화 | 완료 | 없음 |
| ANTHROPIC_API_KEY | **미설정** | Vercel 환경변수 추가 필요 |

---

## 12. Timeline

| Phase | 작업 | 복잡도 |
|:-----:|------|:------:|
| Phase 1 | 자동 트리거 연결 + API 키 설정 | Low |
| Phase 2 | 학습 루프 검증/활성화 | Low |
| Phase 3 | Auto-approve 설정 UI | Medium |
| Phase 4 | 비용 모니터링 (P2) | Low |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-04 | Initial plan | Claude (AI) |
