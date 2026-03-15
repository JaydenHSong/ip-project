# Settings v2 Improvement — Plan

> **Feature**: settings-v2-improvement
> **Created**: 2026-03-14
> **Phase**: Plan
> **Priority**: Medium
> **Parent**: v2-workflow-pivot (W9, W11, W12)

---

## 1. Background

Settings 페이지 레거시 감사 결과, SLA와 PD Automation을 제거 완료했고 3개 탭의 v2 적합성 개선이 필요하다.

### 이미 완료된 작업 (2026-03-14)
- SLA 설정 완전 제거 (코드 + DB)
- PD Automation 설정 완전 제거 (코드 + API)

### 남은 개선 대상
1. Monitoring → v2 BR-only 구조에 맞게 리디자인
2. Auto-Approve → Auto Draft로 용도 전환
3. AI Prompts → v2 AI 역할(제안자)에 맞게 구조 변경

---

## 2. Goals

| # | Goal | Description |
|---|------|-------------|
| G1 | Monitoring 리디자인 | interval_days → br_checks_per_day, clone_threshold_days 추가 |
| G2 | Auto Draft 전환 | Auto-Approve → Auto Draft (AI 톤 제안 자동 생성) |
| G3 | AI Prompts 구조 변경 | analyze 제거, draft → tone-suggest 리네임 |
| G4 | 포맷 보존 규칙 | 템플릿 줄바꿈/띄어쓰기/브래킷 변수 유지 |

---

## 3. Scope

### 3.1 In Scope

| # | Work Item | Detail | 규모 | v2 연관 |
|---|-----------|--------|------|---------|
| S1 | Monitoring 리디자인 | `br_checks_per_day`(하루 체크 횟수), `br_max_monitoring_days`(최대 모니터링 일수), `clone_threshold_days`(클론 제안 기준일) | Medium | W11, W12 |
| S2 | AI Prompts 구조 변경 | `analyze` 타입 제거, `draft` → `tone-suggest` 리네임, 크롤러 프롬프트 유지 | Medium | W9 |
| S3 | Auto Draft 전환 | Auto-Approve UI/API를 Auto Draft로 리네임 + 용도 변경. tone-suggest 프롬프트 자동 호출 | Medium | W9 |
| S4 | tone-suggest 프롬프트 작성 | 기존 draft 프롬프트를 톤/매너 제안용으로 재설계. **원본 포맷 보존 규칙** 포함 | Small | W9 |

### 3.2 Out of Scope
- DB 컬럼 마이그레이션 (violation_type → br_form_type) — v2 Phase 1에서 별도
- Extension PD 토글 — v2 Phase 3
- 클론 기능 구현 (W13) — 별도 feature로

### 3.3 의존 관계

```
S2 (AI Prompts 구조 변경)
  ↓ tone-suggest 프롬프트 타입이 존재해야
S4 (tone-suggest 프롬프트 작성)
  ↓ 프롬프트가 있어야
S3 (Auto Draft 전환)
  ↓ Auto Draft가 tone-suggest를 호출

S1 (Monitoring 리디자인) — 독립, 병렬 가능
```

---

## 4. Detailed Design Direction

### 4.1 Monitoring 리디자인 (S1)

**현재 (v1)**
| 설정 | 기본값 | 용도 |
|------|-------|------|
| `monitoring_interval_days` | 7 | 리스팅 재방문 주기 |
| `monitoring_max_days` | 90 | 자동 마감 기준 |

**변경 (v2)**
| 설정 | 기본값 | 범위 | 용도 |
|------|-------|------|------|
| `br_checks_per_day` | 2 | 1~4 | BR 케이스 하루 체크 횟수 |
| `br_max_monitoring_days` | 90 | 7~365 | 미해결 시 자동 마감 기준 |
| `clone_threshold_days` | 14 | 7~60 | N일 미해결 시 클론 제안 표시 |

**변경 파일**: MonitoringSettings.tsx, /api/settings/monitoring, /api/monitoring/pending

### 4.2 AI Prompts 구조 변경 (S2)

**현재 프롬프트 타입**
| Type | 용도 | 판정 |
|------|------|------|
| `system` | 공통 시스템 프롬프트 | **유지** |
| `analyze` | AI 위반 분석/판단 | **제거** (v2: AI는 판단 안 함) |
| `draft` | 전체 드래프트 작성 | **→ tone-suggest로 리네임** |
| `crawler-violation-scan` | 크롤러 위반 스캔 | **유지** |
| `crawler-thumbnail-scan` | 크롤러 썸네일 체크 | **유지** |

**변경 파일**: AiPromptsTab.tsx (PROMPT_TYPES), prompt-manager.ts, ai_prompts DB 레코드

### 4.3 Auto Draft 전환 (S3)

**현재 (Auto-Approve)**
- 글로벌 토글 + per-form-type 토글 + confidence threshold(50~100%)
- AI 분석 후 confidence >= threshold → status: draft → approved

**변경 (Auto Draft)**
- 글로벌 토글 + per-form-type 토글 (유지)
- confidence threshold 제거 → 데이터 완전성 체크 (ASIN + violation type + screenshot)
- 리포트 생성 시 조건 충족 → tone-suggest 프롬프트 자동 호출
- 결과를 `report.ai_tone_suggestion`에 저장
- Admin이 템플릿 편집 시 제안 표시

**변경 파일**: AutoApproveSettings → AutoDraftSettings, /api/settings/auto-approve → auto-draft, /api/ai/analyze (소비자 코드), reports 타입

### 4.4 tone-suggest 프롬프트 (S4)

**핵심 규칙 — 포맷 보존**
```
## Format Rules (CRITICAL)
1. Preserve ALL line breaks from the original template exactly
2. Preserve ALL spacing and indentation
3. Preserve ALL paragraph structure
4. Do NOT touch bracket variables: [ASIN], [SELLER], [BRAND], etc.
5. Only modify: word choice, tone, grammar, phrasing clarity
6. Output must have the SAME number of lines as input
```

**역할**: 템플릿 변수 치환 후 → 어색한 표현 다듬기, 톤 전문적으로 조정, 문법 교정. 원본 구조는 절대 변경 금지.

---

## 5. Implementation Phases

### Phase A: AI Prompts + tone-suggest (S2 + S4) — 먼저
1. AiPromptsTab PROMPT_TYPES에서 `analyze` 제거
2. `draft` → `tone-suggest` 리네임 (코드 + DB)
3. tone-suggest 프롬프트 내용 재설계 (포맷 보존 규칙 포함)
4. prompt-manager, buildDraftPrompt 등 소비자 코드 업데이트

### Phase B: Auto Draft (S3) — Phase A 이후
1. AutoApproveSettings → AutoDraftSettings 리네임
2. system_configs key: auto_approve → auto_draft
3. confidence threshold 제거, 데이터 완전성 체크로 대체
4. /api/ai/analyze의 auto-approve 로직 → auto-draft 로직으로 변경
5. reports에 ai_tone_suggestion 컬럼 추가
6. 디테일 페이지에서 톤 제안 표시 UI

### Phase C: Monitoring (S1) — 독립, 병렬 가능
1. MonitoringSettings UI 변경 (3개 필드)
2. /api/settings/monitoring 업데이트
3. /api/monitoring/pending 소비자 코드 업데이트
4. system_configs DB 키 마이그레이션

---

## 6. DB Changes

| 대상 | 변경 | 시기 |
|------|------|------|
| `ai_prompts` | `type='analyze'` 행 비활성화, `type='draft'` → `type='tone-suggest'` | Phase A |
| `system_configs` | `key='auto_approve'` → `key='auto_draft'` | Phase B |
| `reports` | `ai_tone_suggestion JSONB` 컬럼 추가 | Phase B |
| `system_configs` | `monitoring_interval_days` → `br_checks_per_day` 등 키 변경 | Phase C |

---

## 7. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| tone-suggest 프롬프트가 포맷을 깨뜨림 | 템플릿 줄바꿈/띄어쓰기 손실 | 프롬프트에 포맷 보존 규칙 명시 + 출력 검증 |
| auto_approve → auto_draft 전환 중 기존 설정 유실 | Admin 재설정 필요 | DB 키 rename으로 값 보존 |
| monitoring pending API 변경 시 크롤러 호환성 | 크롤러가 기존 API 형식 기대 | API 응답 형식 유지, 내부 로직만 변경 |

---

## 8. Success Criteria

- [ ] `pnpm typecheck && pnpm lint && pnpm build` 성공
- [ ] AI Prompts: `analyze` 타입이 UI에서 안 보임
- [ ] AI Prompts: `tone-suggest` 타입으로 프롬프트 관리 가능
- [ ] Auto Draft: per-form-type 토글로 자동 톤 제안 ON/OFF
- [ ] Auto Draft: 리포트 생성 시 조건 충족하면 자동으로 톤 제안 생성
- [ ] tone-suggest 출력이 원본 템플릿 포맷(줄바꿈/띄어쓰기) 유지
- [ ] Monitoring: br_checks_per_day, br_max_monitoring_days, clone_threshold_days 설정 가능
- [ ] Monitoring: pending API가 새 설정값 기반으로 동작

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-03-14 | Initial plan — Settings v2 감사 기반 개선 플랜 |
