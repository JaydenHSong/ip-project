# AutoPilot AI Engine Plan

> **Feature**: autopilot-ai-engine
> **Created**: 2026-04-06
> **Phase**: Plan
> **Depends On**: AD Optimizer Phase 1 (archived), Phase 2 amazon-ads-integration (archived)
> **Prior Art**: Perpetua, Quartile, Teikametrics Flywheel, Pacvue, Skai, Intentwise

---

## Executive Summary

| Perspective | Description |
|---|---|
| **Problem** | AutoPilot 캠페인 mode='autopilot'으로 생성 가능하지만, 실제로 AI가 아무것도 하지 않음. Rule Engine은 IF/THEN 규칙 실행기일 뿐 자율 판단 불가 |
| **Solution** | 하이브리드 AI 엔진 — 수식 기반 실시간 bid/budget 조정 + Claude API 주간 전략 리뷰/인사이트. 이중 안전장치(Soft+Hard Guard)로 돈 보호 |
| **Function UX Effect** | 사용자는 Target ACoS + Budget + Goal Mode(4종) 설정만. AI가 bid 조정, budget 배분, 키워드 수확/제거, dayparting 전부 자율 실행. 활동 로그에서 "왜 이 결정을 했는지" 자연어로 확인 가능 |
| **Core Value** | Manual 대비 운영 시간 95% 절감. 보수적 시작→증명 후 확대로 광고비 낭비 0 목표. Target ACoS는 천장 — 항상 그 아래에서 운영 |

---

## Context Anchor

| Anchor | Content |
|---|---|
| **WHY** | AutoPilot이란 이름에 걸맞는 자율 운영. 사용자가 목표만 주면 AI가 전술을 결정. 현재는 라벨만 존재 |
| **WHO** | AD 팀 매니저 3명 (US), Director 1명 (성과 모니터링), CEO (대시보드 KPI) |
| **RISK** | 광고비 과다 지출 (신뢰 붕괴), AI 판단 오류로 성과 악화, Claude API 비용, Learning 기간 불안정 |
| **SUCCESS** | 1) Target ACoS 항상 미달성(천장) 2) 첫 주 예산 50% 미만 사용 3) 4주 후 Manual 대비 ACoS 동등 이상 4) AI 판단 근거 100% 로그 |
| **SCOPE** | US 마켓 AutoPilot 캠페인만. Manual 캠페인 영향 없음. 기존 Phase 1 UI + Phase 2 API 위에 엔진 레이어 추가 |

---

## 1. Design Philosophy — 3대 원칙

### 원칙 1: Target = 천장 (Ceiling, Not Goal)

```
Target ACoS 25% → AI 운영 목표는 18~22%
25%에 도달하면 이미 위험 → 즉시 방어 모드 전환
```

사용자가 "25%"라고 했으면, 그보다 **항상 좋아야** 한다. 비슷해도 안 됨.
AI 내부 목표는 Target의 70~85% 수준으로 설정.

### 원칙 2: 보수적 시작, 증명 후 확대

```
Week 1: 예산 30~50% 사용 (데이터 수집 + 검증)
Week 2: 검증되면 50~70% 확대
Week 3: 안정적이면 70~90% 확대
Week 4+: 풀 예산 사용 (성과 증명 완료)
```

**못 쓴 돈은 돌아오지만, 잘못 쓴 돈은 안 돌아온다.**
한 번 신뢰를 잃으면 AutoPilot을 다시 쓰지 않는다.

### 원칙 3: 이중 안전장치 (Double Guardrail)

```
┌─────────────────────────────────────────────┐
│  Layer 1: AI Soft Guard (예측 기반 선제 차단)  │
│  "이 bid 올리면 ACoS 27% 예상 → 중단"        │
│  "오늘 예산 40% 이미 소진 → 속도 줄임"        │
│  "이 키워드 3일째 전환 0 → pause 예정"        │
├─────────────────────────────────────────────┤
│  Layer 2: System Hard Guard (절대 규칙)       │
│  HG-01: ACoS > Target → 모든 bid 동결/하락   │
│  HG-02: 일일 예산 80% 도달 → 신규 액션 중단   │
│  HG-03: 주간 예산 100% 도달 → 전체 pause      │
│  HG-04: G01~G10 기존 guardrail 항상 적용      │
│  HG-05: Learning 기간 스킬 제약 (아래 §3 참조) │
└─────────────────────────────────────────────┘
```

Layer 1이 실수해도 Layer 2가 잡는다. **둘 다 뚫리는 건 구조적으로 불가능.**

---

## 2. Requirements

### 2.1 Functional Requirements

#### FR-01: AutoPilot Orchestrator (핵심)
- AutoPilot 캠페인을 주기적으로 평가하는 오케스트레이터 cron
- 실행 주기: 매 시간 (bid 조정), 매일 (키워드/budget 리밸런싱)
- 플로우: 메트릭 수집 → Goal Mode 전략 적용 → 엔진 호출 → Guardrail 체크 → WriteBack 실행 → 로그 기록

#### FR-02: Goal Mode (4가지 전략)
- **Launch**: 신제품 인지도 구축. 노출(Impressions) 극대화, ACoS 제한 완화 (Target × 1.5까지 허용). 공격적 키워드 수확. 기간: 2~4주
- **Growth**: 매출 확장. 매출(Sales) 극대화, ACoS는 Target 이내. 전환 키워드에 bid 집중. 새 키워드 적극 테스트
- **Profit**: 효율 최적화. ACoS 최소화 (Target의 70~85% 목표). 고효율 키워드만 유지. 낭비 키워드 공격적 제거
- **Defend**: 브랜드 방어. 브랜드 키워드 + 경쟁사 ASIN 타겟팅 유지. ACoS보다 노출 점유율(SOV) 우선. 방어적 bid 유지

#### FR-03: Bid Optimization (실시간)
- 기존 `bid-calculator.ts` 수식 활용: `suggested_bid = target_acos × AOV × CVR`
- Goal Mode별 bid 전략 가중치 적용:
  - Launch: rawBid × 1.3 (공격적)
  - Growth: rawBid × 1.1
  - Profit: rawBid × 0.85 (보수적)
  - Defend: 현재 bid 유지 (방어)
- Dayparting multiplier 적용: `finalBid = adjustedBid × daypartMultiplier`
- **Soft Guard**: 예상 ACoS 계산 후 Target 초과 시 bid 인상 차단

#### FR-04: Budget Allocation (일일)
- 기존 `budget-pacer.ts` 활용하여 시간대별 예산 분배
- Goal Mode별 배분 전략:
  - Launch: 균등 배분 (노출 극대화)
  - Growth: 고전환 시간대에 집중 (dayparting 가중치)
  - Profit: 고효율 시간대에만 집중 (나머지 축소)
  - Defend: 경쟁사 활동 시간대에 집중
- 캠페인 간 budget 리밸런싱: 고성과 캠페인에 미사용 예산 이동

#### FR-05: Keyword Pipeline (자동 수확 + 제거)
- **수확 (Auto → Exact)**: 전환 키워드 자동 승격
  - 조건: orders ≥ 2 AND ACoS < Target AND clicks ≥ 10
  - Auto campaign → Broad → Exact 순서로 승격
  - 승격 시 원본에 negative exact 추가 (중복 방지)
- **제거 (Auto Negate)**: 낭비 키워드 자동 negate
  - 조건: orders = 0 AND clicks ≥ 15 AND spend > $5
  - G09(negate safety) guardrail 항상 적용 — 전환 있으면 차단
- **트렌드 감지**: keyword_rankings 데이터로 declining 키워드 사전 감지

#### FR-06: Learning Period Management
- 신규 AutoPilot 캠페인 생성 후 7~14일 Learning 기간
- Learning 기간 스킬 제약:
  - Week 1: 예산 50% 미만 사용, bid 변경 ±10% 이내, 키워드 negate 금지
  - Week 2: 예산 70% 미만 사용, bid 변경 ±20% 이내, negate 허용 (clicks > 30)
  - Week 3+: 풀 권한, 단 첫 4주까지는 모든 액션에 confidence 로그
- 상태 전이: learning → active (confidence_score ≥ 60 AND days ≥ 7)
- learning 기간 중 G05(Learning Protect) guardrail 강화 적용

#### FR-07: Retail Signal Response (SP-API 연동)
- **재고 연동**: SP-API Orders/Catalog로 재고 수준 파악
  - 재고 < 7일분 → bid 50% 감소 + alert
  - 재고 = 0 → 캠페인 자동 pause + alert
  - 재고 복구 → 자동 resume
- **Buy Box 연동**: Buy Box 소유 여부 확인
  - Buy Box 미보유 → bid 70% 감소 (광고비 낭비 방지)
  - Buy Box 복구 → bid 정상화
- **가격 변동**: 가격 급변 시 ACoS 재계산

#### FR-08: Claude AI Weekly Review
- 매주 1회 Claude API 호출로 캠페인 포트폴리오 전략 리뷰
- Input: 7일 메트릭, 키워드 성과, 트렌드, Goal Mode
- Output: 전략 조정 추천 (JSON structured output)
  - Goal Mode 전환 제안 ("Growth → Profit 전환 시점")
  - 키워드 전략 인사이트 ("'iphone case' 경쟁 과열, long-tail로 전환")
  - Budget 재배분 제안
- 추천은 `automation_log`에 기록, source='ai_review'
- 자동 실행하지 않음 — 추천만. 실행은 다음 사이클 오케스트레이터가 참조

#### FR-09: Activity Logging & Explainability
- 모든 AI 액션에 reason 필수 기록 (자연어)
- source 구분: `'autopilot_formula'` | `'autopilot_ai'` | `'rule_engine'` | `'manual'`
- AutoPilot Detail 페이지(S09)에서 "왜 이 결정을 했는지" 타임라인 표시
- 주간 AI 리뷰 결과도 Activity Log에 표시

#### FR-10: Rollback with Amazon Reflection
- 기존 rollbackActions()는 DB만 업데이트 → Amazon에도 원래 값 복원
- Rollback 시 WriteBackService를 통해 원래 bid/state를 Amazon에 반영
- G10(Rollback Window) 2시간 제한 유지

### 2.2 Non-Functional Requirements

| NFR | Target | Rationale |
|-----|--------|-----------|
| Bid 조정 주기 | 매 시간 | 경쟁사 수준 (Perpetua: hourly, Quartile: few hours) |
| Budget 리밸런싱 | 매일 1회 | 과도한 변경 방지 |
| Claude API 호출 | 주 1회/프로필 | 비용 최적화 (~$0.50/주/프로필) |
| Target ACoS 미달성 | 100% (절대 천장) | 신뢰 유지 |
| Learning 기간 예산 사용 | Week1 < 50% | 보수적 시작 |
| 액션 로그 coverage | 100% | 모든 자동 액션에 reason 기록 |

---

## 3. Architecture

### 3.1 System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   AutoPilot Orchestrator (Cron)              │
│                   매 시간 실행                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 메트릭 수집                                              │
│     report_snapshots → 캠페인별 7d/14d/30d 집계              │
│     keyword_rankings → 트렌드 신호                           │
│     SP-API → 재고/Buy Box 상태                               │
│                                                             │
│  2. Goal Mode 전략 로드                                      │
│     campaigns.goal_mode → Launch/Growth/Profit/Defend        │
│     → 전략 파라미터 (bid_multiplier, budget_pct, thresholds) │
│                                                             │
│  3. 엔진 실행                                                │
│     ├── bid-calculator.ts → 키워드별 suggested_bid           │
│     ├── keyword-scorer.ts → 수확/제거 판정                   │
│     ├── budget-pacer.ts → 시간대별 예산 배분                  │
│     ├── dayparting-engine.ts → bid multiplier                │
│     └── retail-signal.ts → 재고/BuyBox 반응 (NEW)            │
│                                                             │
│  4. Double Guardrail                                        │
│     ├── Layer 1 (Soft): AI 예측 기반 선제 차단               │
│     │   "예상 ACoS 28% > Target 25% → bid 인상 차단"         │
│     └── Layer 2 (Hard): 절대 규칙 (HG-01~05 + G01~G10)      │
│         "실제 ACoS > Target → 모든 bid 동결"                 │
│                                                             │
│  5. WriteBack 실행                                          │
│     → writeBackService.executeBatch(actions)                 │
│     → automation_log에 reason 포함 기록                      │
│                                                             │
│  6. Learning 스킬 제약 체크                                  │
│     → learning_day 기준 허용 범위 필터                       │
│     → 범위 밖 액션 자동 제거 + 로그                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Claude AI Weekly Review (별도 Cron)             │
│              매주 월요일 실행                                  │
├─────────────────────────────────────────────────────────────┤
│  Input: 7d 메트릭 + 키워드 TOP/BOTTOM + 트렌드               │
│  Output: 전략 조정 JSON (goal_mode 전환, 키워드 인사이트)      │
│  저장: automation_log (source='ai_review', 실행 안 함)        │
│  참조: 다음 hourly cycle에서 오케스트레이터가 읽고 적용        │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Goal Mode Strategy Parameters

```typescript
type GoalStrategy = {
  bid_multiplier: number       // rawBid에 적용할 계수
  budget_utilization_target: number  // 예산 사용 목표 %
  acos_ceiling_ratio: number   // Target 대비 실제 운영 ACoS 비율
  keyword_harvest_aggressive: boolean
  keyword_negate_aggressive: boolean
  sov_priority: boolean        // Share of Voice 우선
}

const GOAL_STRATEGIES: Record<GoalMode, GoalStrategy> = {
  launch: {
    bid_multiplier: 1.3,
    budget_utilization_target: 90,
    acos_ceiling_ratio: 1.5,   // Target의 150%까지 허용
    keyword_harvest_aggressive: true,
    keyword_negate_aggressive: false,
    sov_priority: true,
  },
  growth: {
    bid_multiplier: 1.1,
    budget_utilization_target: 85,
    acos_ceiling_ratio: 1.0,   // Target 이내
    keyword_harvest_aggressive: true,
    keyword_negate_aggressive: false,
    sov_priority: false,
  },
  profit: {
    bid_multiplier: 0.85,
    budget_utilization_target: 75,
    acos_ceiling_ratio: 0.85,  // Target의 85% 목표
    keyword_harvest_aggressive: false,
    keyword_negate_aggressive: true,
    sov_priority: false,
  },
  defend: {
    bid_multiplier: 1.0,
    budget_utilization_target: 80,
    acos_ceiling_ratio: 1.2,   // 방어라 약간 허용
    keyword_harvest_aggressive: false,
    keyword_negate_aggressive: false,
    sov_priority: true,
  },
}
```

### 3.3 Learning Skill Constraints

```typescript
type LearningConstraints = {
  max_budget_utilization: number   // 예산 사용 상한 %
  max_bid_change_pct: number       // bid 변경 상한 %
  allow_negate: boolean            // 키워드 제거 허용
  negate_min_clicks: number        // negate 최소 클릭 수
  allow_harvest: boolean           // 키워드 수확 허용
}

const LEARNING_PHASES: Record<string, LearningConstraints> = {
  'week1': {                       // day 0~6
    max_budget_utilization: 50,
    max_bid_change_pct: 10,
    allow_negate: false,
    negate_min_clicks: Infinity,
    allow_harvest: false,
  },
  'week2': {                       // day 7~13
    max_budget_utilization: 70,
    max_bid_change_pct: 20,
    allow_negate: true,
    negate_min_clicks: 30,
    allow_harvest: true,
  },
  'graduated': {                   // day 14+, confidence ≥ 60
    max_budget_utilization: 100,
    max_bid_change_pct: 30,        // G02 기존 guardrail 한도
    allow_negate: true,
    negate_min_clicks: 15,
    allow_harvest: true,
  },
}
```

---

## 4. Implementation Modules

### Module 1: Goal Strategy + Learning Constraints
**전략 파라미터 + 스킬 제약 정의**

| Item | File | Description |
|------|------|-------------|
| GoalMode type + strategies | `engine/goal-strategy.ts` | 4가지 Goal Mode 전략 파라미터 |
| LearningConstraints | `engine/learning-constraints.ts` | 학습 단계별 제약 규칙 |
| Campaign DB 컬럼 | SQL migration | `goal_mode` 컬럼 추가 (campaigns 테이블) |
| Campaign Create 연동 | `campaign-create-modal.tsx` | Goal Mode 선택 UI 추가 (M01b step) |

### Module 2: AutoPilot Orchestrator
**핵심 — 매 시간 실행되는 자율 운영 엔진**

| Item | File | Description |
|------|------|-------------|
| Orchestrator | `engine/autopilot-orchestrator.ts` | 메트릭 수집 → 전략 적용 → 엔진 호출 → Guardrail → WriteBack |
| Orchestrator Cron | `cron/autopilot-run.ts` | 매 시간 실행, active AutoPilot 캠페인 순회 |
| Soft Guard | `engine/soft-guard.ts` | 예측 기반 선제 차단 (예상 ACoS 계산) |
| Hard Guard 확장 | `engine/guardrails.ts` 수정 | HG-01~05 추가 (Target 천장, 예산 80%, 주간 한도) |
| Action Builder | `engine/action-builder.ts` | 엔진 결과 → WriteBackAction[] 변환 |

### Module 3: Keyword Pipeline
**자동 수확 + 제거**

| Item | File | Description |
|------|------|-------------|
| Keyword Harvester | `engine/keyword-harvester.ts` | 전환 키워드 Auto→Exact 승격 + negative 추가 |
| Keyword Negator | `engine/keyword-negator.ts` | 낭비 키워드 자동 negate |
| Harvest/Negate Cron | `cron/keyword-pipeline.ts` | 매일 실행 |

### Module 4: Retail Signal
**SP-API 재고/BuyBox 반응**

| Item | File | Description |
|------|------|-------------|
| Retail Signal Checker | `engine/retail-signal.ts` | 재고/BuyBox 상태 → bid 조정/pause 판정 |
| Cron 연동 | `cron/autopilot-run.ts` 수정 | Orchestrator에 retail signal 체크 추가 |

### Module 5: Claude AI Weekly Review
**주간 전략 리뷰**

| Item | File | Description |
|------|------|-------------|
| AI Reviewer | `engine/ai-reviewer.ts` | Claude API 호출, 메트릭 → 전략 인사이트 JSON |
| AI Review Cron | `cron/ai-weekly-review.ts` | 매주 월요일 실행 |
| Prompt Template | `engine/prompts/weekly-review.ts` | Claude에게 보낼 structured prompt |

### Module 6: Rollback + UI 연동
**Rollback Amazon 반영 + Activity Log 강화**

| Item | File | Description |
|------|------|-------------|
| Rollback Service | `api/services/rollback-service.ts` | DB + Amazon 원복 |
| Activity Log 강화 | `features/autopilot/queries.ts` 수정 | source 구분, reason 표시 강화 |
| Goal Mode UI | `features/autopilot/` 수정 | Goal Mode 선택/변경 UI |

---

## 5. DB Schema Changes (Design에서 구체화)

- `ads.campaigns` 테이블에 `goal_mode` 컬럼 추가 필요 (launch/growth/profit/defend)
- AI Review 결과 저장용 테이블 신규 필요 (`ads.ai_reviews`)
- 구체적 SQL, 타입 정의, 인덱스는 Design 단계에서 확정

---

## 6. Success Criteria

| # | Criteria | Measurement |
|---|----------|-------------|
| SC-01 | Target ACoS = 천장 (절대 초과 불가) | 4주간 모든 AutoPilot 캠페인 ACoS < Target |
| SC-02 | Learning Week 1 예산 50% 미만 | 신규 캠페인 첫 주 실제 사용 비율 측정 |
| SC-03 | 4주 후 Manual 대비 ACoS 동등 이상 | 동일 제품군 Manual vs AutoPilot A/B 비교 |
| SC-04 | 모든 AI 액션 reason 로그 100% | automation_log.reason IS NOT NULL 비율 |
| SC-05 | 키워드 수확 자동화 | 월간 Auto→Exact 승격 키워드 수 > 0 |
| SC-06 | 키워드 제거 자동화 | 월간 자동 negate 키워드 수 > 0 (전환 키워드 오탈 0) |
| SC-07 | Claude AI 주간 리뷰 생성 | 매주 ai_reviews 테이블에 1건 이상 |
| SC-08 | Rollback이 Amazon에 실제 반영 | rollback 후 Amazon API 호출 + api_success=true |
| SC-09 | 이중 안전장치 무결성 | Hard Guard 뚫리는 케이스 0건 |
| SC-10 | 재고/BuyBox 반응 | 재고 0 → 자동 pause 실행 시간 < 1시간 |

---

## 7. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| AI 판단 오류로 ACoS 폭등 | Critical | Medium | 이중 안전장치 (Soft+Hard Guard). Hard Guard는 코드로 우회 불가 |
| Learning 기간 광고비 낭비 | High | Medium | Week 1 예산 50% 상한. 보수적 bid (±10% 제한) |
| Claude API 비용 증가 | Medium | Low | 주 1회/프로필 제한. ~$2/월/프로필 예상 |
| 키워드 자동 negate 오판 | High | Low | G09(전환 있으면 차단) + Learning 기간 negate 금지 |
| 재고 데이터 지연 | Medium | Medium | SP-API 1일 1회 → 재고 7일분 기준 (버퍼) |
| Goal Mode 전환 시 급격한 변동 | Medium | Medium | 전환 후 3일간 transitional period (점진 변환) |

---

## 8. Environment Variables (신규)

```env
# Claude AI Review
ANTHROPIC_API_KEY=sk-ant-xxxxx          # Claude API key
AUTOPILOT_AI_REVIEW_ENABLED=true        # AI Review 활성화
AUTOPILOT_AI_REVIEW_MODEL=claude-sonnet-4-6  # 비용 최적화
```

---

## 9. Competitive Positioning

| Feature | Perpetua | Quartile | Teikametrics | Pacvue | **A.R.C.** |
|---------|:--------:|:--------:|:------------:|:------:|:----------:|
| Goal-based abstraction | ✅ | ✅ | ✅ (3 modes) | ❌ | ✅ (4 modes) |
| ML bid optimization | ✅ | ✅ | ✅ | ❌ Rule | ✅ Formula+AI |
| Keyword auto pipeline | ✅ | ✅ | ✅ | ✅ Rule | ✅ |
| Retail signal (inventory) | ❌ | ❌ | ✅ | ❌ | ✅ SP-API |
| LLM strategy insights | ❌ | ❌ | ❌ | ❌ | ✅ Claude |
| Transparent reasoning | ❌ | ❌ | ❌ | ❌ | ✅ 자연어 로그 |
| Double guardrail | ❌ | ❌ | ❌ | ❌ | ✅ Soft+Hard |
| Spigen 도메인 특화 | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 10. File Impact Summary

| Category | New Files | Modified Files | Estimated LOC |
|----------|-----------|---------------|--------------|
| Module 1: Goal + Learning | 2 | 2 | ~200 |
| Module 2: Orchestrator | 4 | 1 | ~500 |
| Module 3: Keyword Pipeline | 3 | 0 | ~300 |
| Module 4: Retail Signal | 1 | 1 | ~150 |
| Module 5: AI Review | 3 | 0 | ~250 |
| Module 6: Rollback + UI | 2 | 2 | ~200 |
| **Total** | **~15** | **~6** | **~1,600** |

---

## 11. Phased Rollout

### Phase 3a: Core Engine (Module 1+2)
- Goal Strategy + Learning Constraints
- AutoPilot Orchestrator + Cron
- Double Guardrail (Soft + Hard)
- 예상: 2 세션

### Phase 3b: Keyword + Retail (Module 3+4)
- Keyword Harvester + Negator
- Retail Signal (재고/BuyBox)
- 예상: 1~2 세션

### Phase 3c: AI + Polish (Module 5+6)
- Claude Weekly Review
- Rollback Amazon 반영
- Activity Log / UI 강화
- 예상: 1~2 세션

---

*Plan created: 2026-04-06*
*Next: `/pdca design autopilot-ai-engine`*
