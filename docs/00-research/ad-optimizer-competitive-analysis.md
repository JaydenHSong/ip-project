# AD Optimizer Competitive Research Summary

> **Date**: 2026-03-25
> **Sources**: 12 research agents (10 completed, 2 web-blocked)
> **Scope**: 15 PPC tools, automation strategies, UX patterns, enterprise needs, innovations, failures/pitfalls, AI bidding, Marketing Stream, market pricing

---

## 1. Market Landscape

### Tool Tiers

| Tier | Tools | Price | Automation | Target |
|------|-------|-------|-----------|--------|
| Enterprise | Pacvue, Skai | $10K-50K+/yr | Rule-based + AI | 대형 브랜드, 에이전시 |
| Mid-market AI | Perpetua, Quartile | $250-1500+/mo or % of spend | Goal-based AI | 중견 브랜드 |
| Mid-market Hybrid | Teikametrics, Intentwise | $199-500+/mo | AI + Rules | 중견, 이익 중심 |
| SMB | Adtomic, Scale Insights, Ad Badger | $78-279/mo | Rule-based | 소규모 셀러 |
| Discontinued | Prestozon, Sellozo (unclear) | - | - | - |

### Automation Level Spectrum (L0-L5)

```
L0 Manual        → Amazon Seller Central alone
L1 Alerts        → Basic threshold notifications
L2 Rule-Based    → Scale Insights, Pacvue, Zon.Tools (IF/THEN rules)
L3 AI-Assisted   → Teikametrics, Adtomic (AI recommends, human approves)
L4 Goal-Based    → Perpetua, Quartile (set goal, AI executes)
L5 Full Autonomy → NOBODY (strategy + new launches still need humans)
                   ← A.R.C. targets closest to here for managed campaigns
```

---

## 2. Key Gaps in Existing Tools (Our Opportunities)

### Gap 1: AI Transparency (Black Box Problem)
- Quartile/Perpetua users complain: "Don't know WHY the AI made that decision"
- Scale Insights users love: "I wrote the rules, I know exactly why"
- **Our approach**: Hybrid — AI decides + shows reasoning + allows override

### Gap 2: Internal Data Integration
- No external SaaS can access: inventory levels, COGS, product launch schedules, team org structure
- **Our advantage**: Same platform as Finance, Listings, Product Library modules

### Gap 3: Enterprise Finance Integration
- Existing tools: portfolio-level budgets only
- **We need**: Team × Marketplace × Product Line budget allocation + pacing + variance reports
- Campaign naming taxonomy enforcement for Finance reconciliation

### Gap 4: Product Launch Automation
- No tool does phone-launch-cycle-aware campaign creation
- **Our advantage**: Listing module integration → detect new ASIN → auto-create campaign templates

### Gap 5: Keyboard-First UX
- Zero tools have Cmd+K command palette or keyboard shortcuts
- Power users stuck clicking through menus
- **Our advantage**: Modern web app UX patterns (shadcn/ui + Tailwind)

### Gap 6: Undo/Rollback
- Bulk changes with no easy revert across the industry
- **We should build**: Git-like change history, batch rollback capability

---

## 3. Features to Copy (배껴야 할 것)

| Feature | Source Tool | Implementation |
|---------|-----------|----------------|
| Goal-based optimization (set ACoS target, AI runs) | Perpetua | Full Auto Pilot mode |
| Rule simulation/preview ("what-if") | Scale Insights | Before activating any automation rule |
| TACoS as first-class metric | Adtomic, Teikametrics | Show alongside ACoS everywhere |
| Recommendation + Approve workflow | Teikametrics | AI recommends, user bulk-approves |
| Custom report builder (drag-and-drop) | Intentwise | Phase 2 |
| Dayparting heatmap | Pacvue | Marketing Stream hourly data |
| Profit-based optimization (not just ACoS) | Teikametrics | Integrate COGS data |
| Automation activity timeline | Scale Insights | Every auto-action logged with reason |
| Campaign taxonomy enforcement | Pacvue (partial) | Auto-prefix from org_unit |

---

## 4. Features to Improve (더 좋게 만들 것)

| Existing Approach | Our Improvement |
|------------------|-----------------|
| Perpetua: AI black box | AI + full reasoning log + one-click rollback |
| Pacvue: complex rule builder | Template-based rules + AI rule suggestions |
| Scale Insights: SP only | SP + SB + SD + DSP unified |
| All tools: 24-48hr data delay | Marketing Stream real-time + predictive alerts |
| All tools: no mobile | Mobile monitoring dashboard (read-only + emergency actions) |
| All tools: manual CSV export | API-first + Google Sheets live + Slack alerts |
| All tools: generic permissions | org_unit-based Layer 1 + marketplace×SKU Layer 2 |

---

## 5. Features Nobody Has (새로 만들 것)

| Feature | Description | Why Valuable |
|---------|------------|-------------|
| **Inventory-aware bidding** | 재고 적으면 비딩 자동 축소, 많으면 공격적 | 재고 소진 시 광고비 낭비 방지 |
| **Buy Box 연동 auto-pause** | Buy Box 잃으면 캠페인 자동 정지 | 즉각적 비용 절감 |
| **Retail Readiness Score** | 별점, 리뷰수, A+, 재고 등 종합 점수 → 기준 미달 시 광고 차단 | 준비 안 된 상품에 광고비 낭비 방지 |
| **Phone Launch Playbook** | iPhone/Galaxy 출시 주기에 맞춘 자동 캠페인 템플릿 | Spigen 핵심 워크플로우 |
| **Cross-module attribution** | 광고→오가닉 순위 상승→추가 매출 = Total ROAS | 경쟁사 도구 불가능 |
| **Predictive budget alerts** | "현재 속도면 오후 2시에 예산 소진됩니다" | 사전 예방 |
| **Finance 연동 예산 관리** | 팀별 분기 예산 배정 → 일별 pacing → 차이 리포트 | Finance 모듈과 통합 |

---

## 6. Keyword Harvesting Pipeline (자동화 규칙)

### Campaign Structure: 4-Tier

```
Tier 1: Auto Campaign (Discovery)
  ↓ [clicks≥8, orders≥1, ACoS≤target×1.5]
Tier 2: Broad Match (Expansion)
  ↓ [clicks≥10, orders≥2, ACoS≤target×1.25]
Tier 3: Phrase Match (Refinement)
  ↓ [clicks≥15, orders≥3, ACoS≤target×1.0]
Tier 4: Exact Match (Scaling) ← 60%+ budget here
```

### Negation Rules
- clicks≥15, orders=0 → negative exact in source
- clicks≥20, ACoS > target×3.0 → negative exact
- 승격된 키워드 → 원래 캠페인에서 negative exact (카니발리제이션 방지)

### Budget Allocation
- Discovery (Auto/Broad): 20-30%
- Research (Phrase): 15-25%
- Performance (Exact): 50-60%

---

## 7. Full Auto Pilot Architecture

### Three-Tier Hybrid System

```
Tier 1: Rule Engine (deterministic, transparent)
  - User-configurable IF/THEN rules
  - Template library for common scenarios
  - Full audit trail

Tier 2: Algorithm Layer (statistical optimization)
  - Target ACoS/ROAS based bid calculation
  - Budget pacing algorithm
  - Keyword scoring for harvesting

Tier 3: ML Layer (predictive, adaptive)
  - Conversion probability prediction
  - Daypart optimization
  - Anomaly detection
  - Seasonal pattern recognition
```

### Guardrails (필수 안전장치)
- Max bid caps (per keyword, per campaign, global)
- ACoS/ROAS floor/ceiling
- Min data thresholds before acting (clicks, impressions, days)
- Change velocity limits (max % change per adjustment)
- "Do not touch" lists
- Rollback capability
- Dry run mode (preview without applying)

---

## 8. UX Design Recommendations

### Dashboard Layout
```
+------------------------------------------------------------------+
| [Marketplace] [Date Range + Compare] [Cmd+K Search] [Alerts 🔔] |
+------------------------------------------------------------------+
| KPI Cards: [Spend][Sales][ACoS][TACoS][ROAS][Orders][CPC][CTR]  |
+------------------------------------------------------------------+
| Primary Chart: Spend vs Sales (configurable, ACoS overlay)       |
+------------------------------------------------------------------+
| [Top Campaigns Table]        | [Alerts & AI Recommendations]     |
| inline edit, virtual scroll  | priority-sorted action items      |
+------------------------------------------------------------------+
| [Automation Activity Log] — timeline with rollback               |
+------------------------------------------------------------------+
```

### Campaign Table
- Virtual scrolling (1000+ rows without lag)
- Inline editing (double-click cell)
- Column customization + saved views
- Bulk actions toolbar
- Keyboard navigation

### Must-Have UX Patterns
- Cmd+K command palette
- Keyboard shortcuts for common actions
- Optimistic UI updates (instant feel)
- Mobile monitoring view (read-only)
- Progressive disclosure (simple → advanced)

---

## 9. Enterprise-Specific Features (Spigen)

### Campaign Naming Convention
```
{MARKET}_{TYPE}_{MATCH}_{CATEGORY}_{PRODUCT}_{STRATEGY}
US_SP_Exact_Case_iPhone16ProMax_Branded
JP_SB_Video_Protector_GalaxyS26_Conquest
```
→ Team prefix auto-attached from org_unit

### Suggested `ads` Schema Tables (Beyond basics)
```
ads.marketplace_profiles    — API credentials per marketplace
ads.campaign_taxonomy       — parsed naming convention fields
ads.budget_allocations      — internal budget by team/product/quarter
ads.budget_pacing           — daily spend tracking vs allocation
ads.strategy_tags           — brand_defense, conquest, generic, launch
ads.launch_playbooks        — campaign templates for product launches
ads.approval_requests       — budget/bid change workflows
ads.change_log              — audit trail
ads.sov_snapshots           — Share of Voice tracking
ads.keyword_rankings        — Brand Analytics history
ads.seasonal_events         — phone launches, Prime Day with bid rules
```

---

## 10. Build vs Buy Justification (왜 직접 만드나)

| Factor | External SaaS | A.R.C. Internal |
|--------|--------------|-----------------|
| 비용 | $12K-60K+/yr (10 marketplace) | 개발 비용만 (인건비) |
| 커스터마이징 | 제한적 | 무한 |
| 내부 데이터 통합 | 불가 | Finance, Listings, Products 직접 연동 |
| 권한 시스템 | 제네릭 RBAC | org_units Layer 1+2 |
| 제품 런칭 자동화 | 없음 | Listing 모듈 연동 |
| 데이터 소유권 | SaaS 종속 | 자체 DB |
| 속도/이터레이션 | 분기별 업데이트 | 즉시 수정 |
