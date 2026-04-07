# AutoPilot AI Engine Design

> **Feature**: autopilot-ai-engine
> **Created**: 2026-04-06
> **Phase**: Design
> **Architecture**: Option B — Clean Architecture (책임 분리)
> **Plan Ref**: `docs/01-plan/features/autopilot-ai-engine.plan.md`

---

## Context Anchor

| Anchor | Content |
|---|---|
| **WHY** | AutoPilot이란 이름에 걸맞는 자율 운영. 사용자가 목표만 주면 AI가 전술을 결정. 현재는 라벨만 존재 |
| **WHO** | AD 팀 매니저 3명 (US), Director 1명, CEO (대시보드 KPI) |
| **RISK** | 광고비 과다 지출 (신뢰 붕괴), AI 판단 오류, Claude API 비용, Learning 불안정 |
| **SUCCESS** | 1) Target ACoS 항상 미달성(천장) 2) 첫 주 예산 50% 미만 3) AI 판단 근거 100% 로그 |
| **SCOPE** | US AutoPilot 캠페인만. 기존 Phase 1 UI + Phase 2 API 위에 엔진 레이어 추가 |

---

## 1. Overview

### 1.1 Architecture — Option B (Clean, 책임 분리)

```
src/modules/ads/engine/
├── bid-calculator.ts          (existing — 수식 기반 bid 계산)
├── budget-pacer.ts            (existing — 시간대별 예산 배분)
├── keyword-scorer.ts          (existing — 키워드 점수화)
├── dayparting-engine.ts       (existing — bid multiplier)
├── rule-engine.ts             (existing — IF/THEN, Manual 캠페인용)
├── guardrails.ts              (existing + HG-01~05 추가)
├── types.ts                   (existing + GoalMode, AutoPilot 타입 추가)
│
└── autopilot/                 ★ NEW SUB-MODULE
    ├── orchestrator.ts        — 실행 순서 제어 (매 시간)
    ├── goal-strategy.ts       — 4종 Goal Mode 전략 파라미터
    ├── learning-guard.ts      — 학습 단계별 스킬 제약
    ├── soft-guard.ts          — 예측 기반 선제 차단 (Layer 1)
    ├── action-builder.ts      — 엔진 결과 → WriteBackAction[] 변환
    ├── keyword-pipeline.ts    — 자동 수확 + 제거 파이프라인
    ├── retail-signal.ts       — SP-API 재고/BuyBox 반응
    ├── ai-reviewer.ts         — Claude 주간 전략 리뷰
    └── prompts/
        └── weekly-review.ts   — Claude prompt 템플릿

src/modules/ads/cron/
├── autopilot-run.ts           ★ NEW — 매 시간 오케스트레이터 실행
├── keyword-pipeline-run.ts    ★ NEW — 매일 키워드 수확/제거
└── ai-weekly-review.ts        ★ NEW — 매주 월요일 Claude 리뷰
```

### 1.2 Dependency Graph

```
                    orchestrator.ts
                   /    |    |    \
                  /     |    |     \
    goal-strategy  soft-guard  learning-guard  action-builder
         |              |                          |
    bid-calculator  guardrails.ts (HG)    writeBackService.executeBatch()
    budget-pacer        |
    keyword-scorer  (Hard Guard: G01~G10 + HG-01~05)
    dayparting-engine

    keyword-pipeline.ts  ←→  keyword-scorer.ts
    retail-signal.ts     ←→  createSpApiPort()
    ai-reviewer.ts       ←→  Claude API (Anthropic SDK)
```

---

## 2. DB Schema

### 2.1 campaigns 테이블 변경

```sql
-- Goal Mode 컬럼 추가
ALTER TABLE ads.campaigns
  ADD COLUMN IF NOT EXISTS goal_mode text NOT NULL DEFAULT 'growth'
  CHECK (goal_mode IN ('launch', 'growth', 'profit', 'defend'));

-- Learning 시작일 (AutoPilot 전용)
ALTER TABLE ads.campaigns
  ADD COLUMN IF NOT EXISTS autopilot_started_at timestamptz;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_campaigns_mode_goal
  ON ads.campaigns (mode, goal_mode)
  WHERE mode = 'autopilot';
```

### 2.2 ai_reviews 테이블 (신규)

```sql
CREATE TABLE IF NOT EXISTS ads.ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_profile_id uuid NOT NULL REFERENCES ads.marketplace_profiles(id),
  review_type text NOT NULL DEFAULT 'weekly',
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  input_summary jsonb NOT NULL,        -- 7d 메트릭 요약
  recommendations jsonb NOT NULL,      -- Claude output (structured)
  applied boolean NOT NULL DEFAULT false,
  applied_at timestamptz,
  model_used text NOT NULL,            -- e.g. 'claude-sonnet-4-6'
  tokens_used integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_reviews_profile_date
  ON ads.ai_reviews (marketplace_profile_id, created_at DESC);
```

### 2.3 TypeScript 타입 확장 (types.ts)

```typescript
// engine/types.ts 에 추가
type GoalMode = 'launch' | 'growth' | 'profit' | 'defend'

type AutoPilotContext = {
  campaign_id: string
  profile_id: string
  goal_mode: GoalMode
  target_acos: number
  weekly_budget: number
  max_bid_cap: number | null       // AI가 계산, 없으면 자동 산출
  learning_day: number             // 0~14+
  confidence_score: number         // 0~100
  autopilot_started_at: string
}

type AutoPilotResult = {
  actions: AutoPilotAction[]
  skipped: AutoPilotSkipped[]      // 가드에 의해 차단된 액션들
  metrics_snapshot: MetricsSnapshot
}

type AutoPilotAction = {
  type: WriteBackAction['type']
  campaign_id: string
  keyword_id?: string
  current_value: number
  proposed_value: number
  reason: string                   // 자연어 근거
  source: 'autopilot_formula'
  confidence: number
}

type AutoPilotSkipped = {
  action: AutoPilotAction
  blocked_by: 'soft_guard' | 'hard_guard' | 'learning_guard'
  guard_reason: string
}

type MetricsSnapshot = {
  acos_7d: number | null
  acos_14d: number | null
  spend_7d: number
  sales_7d: number
  impressions_7d: number
  clicks_7d: number
  orders_7d: number
  top_keywords: { keyword_id: string; keyword_text: string; acos: number; orders: number }[]
  bottom_keywords: { keyword_id: string; keyword_text: string; acos: number; spend: number }[]
}
```

### 2.4 shared/types.ts 확장

```typescript
// GoalMode 추가
type GoalMode = 'launch' | 'growth' | 'profit' | 'defend'

// ActionSource 확장
type ActionSource = 'rule_engine' | 'algorithm' | 'ml' | 'manual'
  | 'autopilot_formula' | 'autopilot_ai'

// Campaign 타입에 goal_mode, autopilot_started_at 추가
```

---

## 3. Engine Detail Design

### 3.1 goal-strategy.ts

```typescript
type GoalStrategy = {
  bid_multiplier: number
  budget_utilization_target: number   // % of weekly budget
  acos_internal_target_ratio: number  // Target ACoS × 이 비율 = AI 내부 목표
  keyword_harvest_min_orders: number
  keyword_negate_min_clicks: number
  sov_priority: boolean
}

const STRATEGIES: Record<GoalMode, GoalStrategy> = {
  launch: {
    bid_multiplier: 1.3,
    budget_utilization_target: 90,
    acos_internal_target_ratio: 0.80,   // Target 25% → 내부 목표 20%
    keyword_harvest_min_orders: 1,       // 공격적 수확
    keyword_negate_min_clicks: 25,       // negate 느슨
    sov_priority: true,
  },
  growth: {
    bid_multiplier: 1.1,
    budget_utilization_target: 85,
    acos_internal_target_ratio: 0.85,
    keyword_harvest_min_orders: 2,
    keyword_negate_min_clicks: 15,
    sov_priority: false,
  },
  profit: {
    bid_multiplier: 0.85,
    budget_utilization_target: 75,
    acos_internal_target_ratio: 0.70,   // Target 25% → 내부 목표 17.5%
    keyword_harvest_min_orders: 3,       // 보수적 수확
    keyword_negate_min_clicks: 10,       // negate 공격적
    sov_priority: false,
  },
  defend: {
    bid_multiplier: 1.0,
    budget_utilization_target: 80,
    acos_internal_target_ratio: 0.90,
    keyword_harvest_min_orders: 2,
    keyword_negate_min_clicks: 20,
    sov_priority: true,
  },
}

export function getStrategy(mode: GoalMode): GoalStrategy
export function getInternalAcosTarget(targetAcos: number, mode: GoalMode): number
```

### 3.2 learning-guard.ts

```typescript
type LearningPhase = 'week1' | 'week2' | 'graduated'

type LearningConstraints = {
  max_budget_utilization: number
  max_bid_change_pct: number
  allow_negate: boolean
  negate_min_clicks: number
  allow_harvest: boolean
  max_actions_per_cycle: number      // 한 사이클당 최대 액션 수
}

const PHASES: Record<LearningPhase, LearningConstraints> = {
  week1: {
    max_budget_utilization: 50,
    max_bid_change_pct: 10,
    allow_negate: false,
    negate_min_clicks: Infinity,
    allow_harvest: false,
    max_actions_per_cycle: 5,
  },
  week2: {
    max_budget_utilization: 70,
    max_bid_change_pct: 20,
    allow_negate: true,
    negate_min_clicks: 30,
    allow_harvest: true,
    max_actions_per_cycle: 15,
  },
  graduated: {
    max_budget_utilization: 100,
    max_bid_change_pct: 30,
    allow_negate: true,
    negate_min_clicks: 15,
    allow_harvest: true,
    max_actions_per_cycle: 50,
  },
}

export function getLearningPhase(learningDay: number, confidenceScore: number): LearningPhase
export function getConstraints(phase: LearningPhase): LearningConstraints
export function filterByConstraints(actions: AutoPilotAction[], constraints: LearningConstraints): {
  allowed: AutoPilotAction[]
  blocked: AutoPilotSkipped[]
}
```

### 3.3 soft-guard.ts (Layer 1 — 예측 선제 차단)

```typescript
type SoftGuardInput = {
  action: AutoPilotAction
  current_metrics: MetricsSnapshot
  target_acos: number
  internal_acos_target: number      // getInternalAcosTarget() 결과
}

type SoftGuardResult = {
  allowed: boolean
  reason: string | null
  predicted_acos_after: number | null
}

/**
 * 예측 ACoS 계산:
 * - bid 인상 → CPC 상승 → ACoS 상승 예측
 * - bid 인하 → 노출 감소 → ACoS 변동 예측
 * - 현재 ACoS가 이미 internal target 초과 → bid 인상 차단
 */
export function checkSoftGuard(input: SoftGuardInput): SoftGuardResult
```

핵심 로직:
```
IF current_acos_7d >= internal_acos_target:
  → bid 인상 액션 전부 차단 ("ACoS already at {current}%, internal target {target}%")
  → bid 인하 / negate 액션만 허용

IF action.type === 'bid_adjust' AND proposed > current:
  predicted_acos = current_acos × (proposed_bid / current_bid)
  IF predicted_acos > target_acos:
    → 차단 ("Predicted ACoS {predicted}% would exceed target {target}%")
```

### 3.4 guardrails.ts 확장 (Hard Guard HG-01~05)

기존 G01~G10에 추가:

```typescript
// HG-01: Target ACoS 천장 (AutoPilot 전용)
'HG01_ACOS_CEILING': (p) => {
  if (p.current_acos_7d && p.target_acos && p.current_acos_7d > p.target_acos) {
    if (p.action_type === 'bid_adjust' && p.proposed_value > p.current_value) {
      return { blocked: true, guardrail_id: 'HG01',
        reason: `ACoS ${p.current_acos_7d}% exceeds target ${p.target_acos}%. Bid increase blocked.` }
    }
  }
  return null
}

// HG-02: 일일 예산 80% 도달 → 신규 bid 인상 중단
'HG02_DAILY_BUDGET_80': ...

// HG-03: 주간 예산 100% 도달 → 전체 pause
'HG03_WEEKLY_BUDGET_FULL': ...

// HG-04: Learning 기간 스킬 위반 최종 차단
'HG04_LEARNING_VIOLATION': ...

// HG-05: AutoPilot 액션 수 상한 (한 사이클 50개)
'HG05_ACTION_LIMIT': ...
```

### 3.5 orchestrator.ts (핵심 — 실행 순서 제어)

```typescript
type OrchestratorInput = {
  campaign: AutoPilotContext
  metrics: MetricsSnapshot
  aiReviewRecommendations?: AiRecommendation[]  // 최근 AI 리뷰
}

type OrchestratorOutput = {
  executed: WriteBackResult[]
  skipped: AutoPilotSkipped[]
  total_actions: number
  total_blocked: number
}

export async function runAutoPilot(input: OrchestratorInput): Promise<OrchestratorOutput>
```

실행 순서:
```
1. getStrategy(campaign.goal_mode)
2. getInternalAcosTarget(campaign.target_acos, campaign.goal_mode)
3. getLearningPhase(campaign.learning_day, campaign.confidence_score)

4. Retail Signal 체크
   → 재고 0 → 즉시 pause (다른 엔진 skip)
   → Buy Box 미보유 → bid 70% 감소 모드

5. Bid 계산 (모든 active 키워드)
   → calculateBid() × strategy.bid_multiplier × daypartMultiplier
   → AI 리뷰 추천이 있으면 반영 (±10% 범위)

6. Soft Guard 필터 (Layer 1)
   → 예측 ACoS > Target → bid 인상 제거

7. Learning Guard 필터
   → 현재 phase 제약 범위 밖 액션 제거

8. Action Build
   → actionBuilder.build(filteredActions)

9. Hard Guard 필터 (Layer 2 — 최종)
   → checkGuardrails() (G01~G10 + HG01~05)

10. WriteBack 실행
    → writeBackService.executeBatch(finalActions)
    → 모든 액션 automation_log 기록 (reason 포함)
```

### 3.6 action-builder.ts

```typescript
export function buildActions(
  bidResults: BidCalculation[],
  strategy: GoalStrategy,
  context: AutoPilotContext,
): AutoPilotAction[]

export function buildKeywordActions(
  harvests: KeywordScore[],
  negates: KeywordScore[],
  context: AutoPilotContext,
): AutoPilotAction[]
```

### 3.7 keyword-pipeline.ts

```typescript
type HarvestResult = {
  promoted: { keyword_id: string; from_match: string; to_match: 'exact' }[]
  negated: { keyword_id: string; keyword_text: string; reason: string }[]
}

/**
 * 수확 로직:
 * 1. search_term_reports에서 전환 검색어 추출
 * 2. orders >= strategy.keyword_harvest_min_orders
 *    AND ACoS < internal_acos_target
 *    AND clicks >= 10
 * 3. 기존 exact match에 없는 것만 → 새 키워드 생성
 * 4. 원본 캠페인에 negative exact 추가 (중복 방지)
 *
 * 제거 로직:
 * 1. keywords 테이블에서 active 키워드 스캔
 * 2. orders = 0 AND clicks >= strategy.keyword_negate_min_clicks AND spend > $5
 * 3. G09 guardrail 체크 (전환 있으면 차단)
 * 4. negate 실행
 */
export async function runKeywordPipeline(
  profileId: string,
  campaigns: AutoPilotContext[],
  db: SupabaseClient,
): Promise<HarvestResult>
```

### 3.8 retail-signal.ts

```typescript
type RetailSignal = {
  campaign_id: string
  inventory_days: number | null     // 잔여 재고 일수
  has_buy_box: boolean | null
  price_changed: boolean
  recommended_action: 'pause' | 'reduce_bid' | 'normal' | 'resume'
  reason: string
}

/**
 * SP-API를 통한 리테일 시그널 체크:
 * - inventory_days < 7 → reduce_bid (50%)
 * - inventory_days = 0  → pause
 * - has_buy_box = false → reduce_bid (70%)
 * - 복구 시 → resume / normal
 */
export async function checkRetailSignals(
  profileId: string,
  campaigns: AutoPilotContext[],
  spApiPort: SpApiPort,
  db: SupabaseClient,
): Promise<RetailSignal[]>
```

### 3.9 ai-reviewer.ts

```typescript
type AiReviewInput = {
  profile_id: string
  period: { start: string; end: string }
  campaigns: {
    id: string
    name: string
    goal_mode: GoalMode
    target_acos: number
    metrics_7d: MetricsSnapshot
  }[]
}

type AiRecommendation = {
  campaign_id: string
  recommendation_type: 'goal_mode_change' | 'bid_strategy' | 'keyword_insight' | 'budget_realloc'
  current_value: string
  suggested_value: string
  reasoning: string              // Claude가 생성한 자연어 근거
  confidence: number             // 0~1
  priority: 'high' | 'medium' | 'low'
}

type AiReviewOutput = {
  recommendations: AiRecommendation[]
  portfolio_summary: string      // 전체 포트폴리오 한 줄 요약
  tokens_used: number
}

export async function runWeeklyReview(input: AiReviewInput): Promise<AiReviewOutput>
```

### 3.10 prompts/weekly-review.ts

```typescript
export function buildWeeklyReviewPrompt(input: AiReviewInput): string
```

Prompt 구조:
```
You are an Amazon Ads optimization expert analyzing a Spigen campaign portfolio.

## Context
- Brand: Spigen (phone cases, accessories)
- Market: US
- Period: {start} ~ {end}

## Campaigns
{foreach campaign:}
### {name} (Goal: {goal_mode}, Target ACoS: {target_acos}%)
- 7d Metrics: ACoS {acos}%, Spend ${spend}, Sales ${sales}, Orders {orders}
- Top Keywords: ...
- Bottom Keywords: ...
{end}

## Task
Analyze each campaign and provide recommendations as JSON array.
Each recommendation must have: campaign_id, recommendation_type, current_value,
suggested_value, reasoning (in Korean), confidence (0-1), priority.

Focus on:
1. Goal Mode 전환 시점 (Launch→Growth, Growth→Profit 등)
2. 예산 재배분 기회
3. 키워드 전략 인사이트 (경쟁 과열, long-tail 기회 등)
4. 위험 신호 (ACoS 급등, 전환율 하락 등)

Respond ONLY with valid JSON array. No markdown.
```

---

## 4. API Routes

### 4.1 수동 실행 트리거

```
POST /api/ads/autopilot/run
Auth: admin+
Body: { profile_id: string, campaign_ids?: string[] }
Response: { executed: number, skipped: number, details: OrchestratorOutput[] }
```

### 4.2 AI 리뷰 조회

```
GET /api/ads/autopilot/ai-reviews?profile_id={id}&limit=5
Auth: editor+
Response: { data: AiReview[], total: number }
```

### 4.3 Goal Mode 변경

```
PATCH /api/ads/campaigns/{id}/goal-mode
Auth: editor+
Body: { goal_mode: GoalMode }
Response: { success: boolean, campaign_id: string, goal_mode: GoalMode }
```

---

## 5. Cron Schedules

| Cron File | Schedule | Description |
|-----------|----------|-------------|
| `autopilot-run.ts` | `0 * * * *` (매시간) | Orchestrator 실행 — bid 조정, retail signal |
| `keyword-pipeline-run.ts` | `0 6 * * *` (매일 6AM UTC) | 키워드 수확 + 제거 |
| `ai-weekly-review.ts` | `0 8 * * 1` (매주 월 8AM UTC) | Claude 주간 리뷰 |

---

## 6. Factory 확장

```typescript
// factory.ts에 추가
import { AutoPilotOrchestrator } from '@/modules/ads/engine/autopilot/orchestrator'

export function createAutoPilotOrchestrator(profileId: string): AutoPilotOrchestrator {
  return new AutoPilotOrchestrator(
    createAdsPort(profileId),
    createSpApiPort(profileId),
    createWriteBackService(profileId),
    createAdminClient(),
  )
}
```

---

## 7. UI Changes (최소)

### 7.1 Campaign Create Modal — Goal Mode 추가 (M01b-AP)

StepBudgetAP에 Goal Mode 선택 추가:

```
┌─────────────────────────────────┐
│  Goal Mode                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│  │Launch│ │Growth│ │Profit│ │Defend│
│  └──────┘ └──────┘ └──────┘ └──────┘
│  (selected: Growth)             │
│                                 │
│  Target ACoS: [25] %            │
│  Weekly Budget: [$2,000]        │
│                                 │
│  ℹ AI가 Target 아래에서 운영.    │
│    Max Bid Cap은 AI가 자동 산출. │
└─────────────────────────────────┘
```

### 7.2 AutoPilot Detail (S09) — AI Activity 강화

- Activity Log에 `source` 배지 표시 (autopilot_formula / autopilot_ai / rule_engine)
- AI Review 탭 추가: 주간 리뷰 결과 카드 표시
- Goal Mode 변경 버튼

---

## 8. Test Plan

| Test | Type | Description |
|------|------|-------------|
| T-01 | Unit | goal-strategy: 4종 전략 파라미터 정확성 |
| T-02 | Unit | learning-guard: phase 판정 + 제약 필터 |
| T-03 | Unit | soft-guard: 예측 ACoS 차단 로직 |
| T-04 | Unit | action-builder: BidCalculation → WriteBackAction 변환 |
| T-05 | Integration | orchestrator: 전체 파이프라인 (mock 데이터) |
| T-06 | Integration | keyword-pipeline: 수확+제거 (mock DB) |
| T-07 | Integration | Double Guardrail: Soft+Hard 동시 적용 시 우선순위 |
| T-08 | E2E | Campaign 생성(autopilot) → cron 실행 → automation_log 확인 |

---

## 9. Implementation Guide

### 9.1 Module Map

| Module | Files | Dependencies | LOC |
|--------|-------|-------------|-----|
| M1: Strategy + Types | goal-strategy.ts, learning-guard.ts, types.ts 확장 | 없음 | ~200 |
| M2: Guards | soft-guard.ts, guardrails.ts HG 추가 | M1 | ~200 |
| M3: Orchestrator + Cron | orchestrator.ts, action-builder.ts, autopilot-run.ts | M1, M2 | ~350 |
| M4: Keyword Pipeline | keyword-pipeline.ts, keyword-pipeline-run.ts | M1 | ~200 |
| M5: Retail Signal | retail-signal.ts | createSpApiPort | ~120 |
| M6: AI Review | ai-reviewer.ts, prompts/weekly-review.ts, ai-weekly-review.ts | Anthropic SDK | ~250 |
| M7: API + UI | routes, campaign-create-modal 수정, factory 확장 | M3, M6 | ~250 |

### 9.2 Implementation Order

```
M1 (Strategy+Types) → M2 (Guards) → M3 (Orchestrator) → M4 (Keyword)
                                                        → M5 (Retail)
                                                        → M6 (AI Review)
                                                        → M7 (API+UI)
```

M3이 핵심. M4~M7은 병렬 가능.

### 9.3 Session Guide

| Session | Scope | Modules | Estimated LOC |
|---------|-------|---------|---------------|
| Session 1 | Core Engine | M1 + M2 + M3 | ~750 |
| Session 2 | Pipeline + Signal | M4 + M5 | ~320 |
| Session 3 | AI + UI | M6 + M7 | ~500 |

---

*Design created: 2026-04-06*
*Architecture: Option B — Clean (책임 분리)*
*Next: `/pdca do autopilot-ai-engine --scope module-1,module-2,module-3`*
