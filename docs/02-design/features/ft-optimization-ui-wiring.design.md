# ft-optimization-ui-wiring Design Document

> **Summary**: Option C Pragmatic Balance — 공유 hook 2개(useSkipRecommendations, useRowSelection) + 모달 state는 caller-local. 3 orphan 모달 + 5 AI 버튼 + 히트맵 + Skip All + 메트릭 + S04 bulk bar + E2E.
>
> **Project**: arc-ads
> **Author**: Jayden Song
> **Date**: 2026-04-23
> **Status**: Ready for Implementation
> **Architecture**: Option C — Pragmatic Balance

---

## Context Anchor

(from Plan)

| Key | Value |
|-----|-------|
| **WHY** | Optimization 57% (5-audit 최악). 구조물 존재하나 user-reachable 불가. 즉시 해결 가치 높음 |
| **WHO** | Spigen 마케터 (editor+) |
| **RISK** | R-1 3 모달 prop 인터페이스 ↔ caller state 흐름 정합성 |
| **SUCCESS** | SC-1~SC-9 (모달 도달, AI 버튼, 히트맵, Skip All, bulk bar, 메트릭) |
| **SCOPE** | C2+C3+C4+C5+I3+I4+I5/I6+I8+S04 bulk bar + E2E |

---

## 1. Overview

### 1.1 Selected Architecture — Option C

**핵심 원칙**: 공유되는 것만 추상화, 나머지는 co-located. 3 모달은 각각 1 caller 관계라 caller-local `useState` 유지. Skip All은 3 페이지에서 동일 로직 반복이라 hook 추출. Bulk 체크박스 selection은 재사용 가치 있어 generic hook.

### 1.2 Non-Goals

- Zod validation (별도 `ft-zod-validation`)
- Marketing Stream hourly spend (Amazon 기능)
- M03/M04/M05 내부 로직 재작성 (이미 구현됨, wiring만)

---

## 2. Architecture Overview

### 2.1 New Shared Hooks (2개)

#### 2.1.1 `useSkipRecommendations` — `src/modules/ads/features/optimization/hooks/use-skip-recommendations.ts`

```typescript
// Design Ref: §2.1.1 — Skip All 서버 연동 재사용
import { useCallback, useState } from 'react'

export type SkipResult = {
  total: number
  succeeded: number
  failed: number
  failedIds: string[]
}

export function useSkipRecommendations(brandMarketId: string) {
  const [isRunning, setIsRunning] = useState(false)

  const skipAll = useCallback(async (ids: string[]): Promise<SkipResult> => {
    setIsRunning(true)
    try {
      const results = await Promise.allSettled(
        ids.map(id =>
          fetch(`/api/ads/recommendations/${id}/skip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brand_market_id: brandMarketId }),
          }).then(res => { if (!res.ok) throw new Error(`${res.status}`) })
        )
      )
      const failed = results
        .map((r, i) => (r.status === 'rejected' ? ids[i] : null))
        .filter((x): x is string => x !== null)
      return {
        total: ids.length,
        succeeded: ids.length - failed.length,
        failed: failed.length,
        failedIds: failed,
      }
    } finally {
      setIsRunning(false)
    }
  }, [brandMarketId])

  return { skipAll, isRunning }
}
```

**Consumers** (3):
- `bid-optimization.tsx` (S04 Skip All)
- `keywords-management.tsx` (S06 Skip All)
- `ai-recommendations.tsx` (S11 Skip All)

#### 2.1.2 `useRowSelection<T>` — `src/modules/ads/shared/hooks/use-row-selection.ts`

```typescript
// Design Ref: §2.1.2 — Bulk 체크박스 선택 상태 재사용
import { useCallback, useMemo, useState } from 'react'

export function useRowSelection<T extends { id: string }>(rows: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id))
    )
  }, [rows])

  const clear = useCallback(() => setSelectedIds(new Set()), [])

  const selectedRows = useMemo(
    () => rows.filter(r => selectedIds.has(r.id)),
    [rows, selectedIds],
  )

  const allSelected = selectedIds.size > 0 && selectedIds.size === rows.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < rows.length

  return { selectedIds, selectedRows, toggle, toggleAll, clear, allSelected, someSelected }
}
```

**Consumers** (1 primary, expandable):
- `bid-optimization.tsx` (S04 bulk bar 체크박스) — 초기 도입
- 향후 `keywords-management.tsx`, `ai-recommendations.tsx`로 확장 가능

### 2.2 Modal State Pattern (Option C — caller-local)

각 모달 caller는 `useState<{open: boolean, data?: T}>`로 관리:

```typescript
// 예: bid-optimization.tsx에서 M03 호출
const [ruleModal, setRuleModal] = useState<{ open: boolean; seed?: Partial<RuleFormData> }>({ open: false })

// ... trigger
<button onClick={() => setRuleModal({ open: true, seed: { brand_market_id } })}>
  + New Rule
</button>

// ... render
{ruleModal.open && (
  <RuleCreateModal
    initialData={ruleModal.seed}
    onClose={() => setRuleModal({ open: false })}
    onSubmit={handleRuleSubmit}
  />
)}
```

### 2.3 Helper Function for Metrics

#### 2.3.1 `computeEstRevenue` in `queries.ts`

```typescript
// Design Ref: §2.3 — I8 est_revenue_impact 공식
// 현재는 0 하드코딩. 추정: estimated_impact% × avg_sales_7d
function computeEstRevenue(row: {
  estimated_impact: number | null
  campaign_avg_sales_7d: number | null
}): number {
  const impact = row.estimated_impact ?? 0
  const avgSales = row.campaign_avg_sales_7d ?? 0
  return Math.round((impact / 100) * avgSales * 100) / 100
}
```

---

## 3. File-by-File Implementation Plan

### 3.1 New Files (3)

| # | 파일 | LOC 예상 | 책임 |
|---|------|---------|------|
| 1 | `src/modules/ads/features/optimization/hooks/use-skip-recommendations.ts` | ~35 | Skip All 서버 호출 + 결과 요약 |
| 2 | `src/modules/ads/shared/hooks/use-row-selection.ts` | ~35 | Generic row selection state |
| 3 | `tests/e2e/optimization-ui.spec.ts` | ~180 | Playwright E2E — 3 모달 + AI 버튼 + 히트맵 + Skip All + bulk bar |

### 3.2 Modified Files

#### S1 scope `modals` (3 모달 wiring)
| # | 파일 | 변경 |
|---|------|------|
| 1 | `src/modules/ads/features/optimization/components/bid-optimization.tsx` | M03 Rule Create 모달 state + `+ New Rule` 버튼 Strategy Strip에 추가 |
| 2 | `src/modules/ads/features/optimization/components/daily-budget-pacing.tsx` | M04 Alert Detail 모달 + M05 Underspend 모달 state. Alert-dot 클릭 + Analyze → 버튼 |

#### S2 scope `ai-buttons` (Apply/Dismiss onClick)
| # | 파일 | 변경 |
|---|------|------|
| 3 | `src/modules/ads/features/optimization/components/daily-budget-pacing.tsx` | AI Budget Apply → PATCH `/api/ads/campaigns/:id`. Dismiss → localStorage |
| 4 | `src/modules/ads/features/optimization/components/dayparting-schedule.tsx` | Apply AI Schedule → PATCH `/api/ads/dayparting/schedules/:id`. Adjust → 현재 UI에서 편집 모드 진입 |

#### S3 scope `heatmap`
| # | 파일 | 변경 |
|---|------|------|
| 5 | `src/modules/ads/features/optimization/components/dayparting-schedule.tsx` | inline grid 제거, shared `heatmap-grid.tsx` 사용. `onCellToggle` prop 전달 |

#### S4 scope `skip-api`
| # | 파일 | 변경 |
|---|------|------|
| 6 | `src/modules/ads/features/optimization/components/bid-optimization.tsx` | Skip All → `useSkipRecommendations` hook 사용 |
| 7 | `src/modules/ads/features/optimization/components/keywords-management.tsx` | 동일 |
| 8 | `src/modules/ads/features/optimization/components/ai-recommendations.tsx` | 동일 + brand/market filter (S6 scope) |

#### S5 scope `metrics`
| # | 파일 | 변경 |
|---|------|------|
| 9 | `src/modules/ads/features/optimization/queries.ts` | line 181 auto_count fix; line 147-148 est_revenue helper 호출. `computeEstRevenue` helper 추가 |

#### S6 scope `filters-bulkbar`
| # | 파일 | 변경 |
|---|------|------|
| 10 | `src/modules/ads/features/optimization/components/ai-recommendations.tsx` | Brand/Market 다중선택 필터 추가 (S11) |
| 11 | `src/modules/ads/features/optimization/components/bid-optimization.tsx` | `useRowSelection` hook + 체크박스 컬럼 + bulk bar (Approve All / Skip All) |

**총**: 3 신규 + 11 수정 = **14 파일** (일부 파일은 여러 세션에서 터치)

### 3.3 API Endpoints (기존 활용 — 신규 없음)

| Endpoint | Method | 용도 | 상태 |
|----------|--------|------|------|
| `/api/ads/recommendations/:id/skip` | POST | Skip All 각 row | ✅ 서버 존재 |
| `/api/ads/campaigns/:id` | PATCH | Budget Apply (daily_budget) | ✅ 존재 |
| `/api/ads/rules` | POST | M03 submit | ✅ 존재 (M03 내부) |
| `/api/ads/dayparting/schedules/:id` | PATCH | Apply AI Schedule | ✅ 확인 필요 (존재할 것으로 기대) |
| `/api/ads/alerts/:id` | GET | M04 alert 상세 조회 | ✅ 존재 (M04 내부) |

---

## 4. API Contract — No Change

기존 엔드포인트만 소비. 새 contract 도입 없음. Client-side fetch 호출만 추가.

---

## 5. Data Flow — Skip All 예시

### 5.1 Before

```
User clicks "Skip All" on S04
  → onClick handler updates local skippedIds state
  → UI hides skipped rows
  → ❌ Server never notified
  → 새로고침 시 pending 상태로 복귀
```

### 5.2 After (Option C)

```
User clicks "Skip All" on S04
  → useSkipRecommendations().skipAll(pendingIds)
  → Promise.allSettled(ids.map(id => fetch POST /skip))
  → SkipResult { total, succeeded, failed, failedIds }
  → toast 표시 ("5개 중 4개 skip 성공, 1개 실패")
  → refetch list → 서버 상태와 동기화
  → ✅ 새로고침 후에도 유지
```

---

## 6. Error Handling

### 6.1 useSkipRecommendations

- Partial failure: `allSettled` 반환, `failedIds` 배열로 표시
- Network error: `failed++`로 합산, toast로 "N개 실패" 표시
- 401/403: 개별 row는 실패 카운트, 사용자에게 "권한 없음" 토스트

### 6.2 AI Budget Apply (C3)

- PATCH 실패 시 alert/toast: "예산 변경 실패: {error.code}"
- 성공 시: 현재 카드 값 즉시 업데이트 + refetch

### 6.3 Dayparting Apply (C4)

- 부분 성공 허용: 24 시간 × 7일 = 168 cells. 모두 PATCH하거나 bulk endpoint 사용
- 현재 Design: 단일 `PATCH /api/ads/dayparting/schedules/:id` (schedule entire object) → atomic

### 6.4 Modal Close

- 모든 모달은 `onClose` 콜백을 받아야 함 (기존 구현 검증 필요)
- Close 시 상태 reset, caller의 `useState` → `{ open: false }`

---

## 7. Security Considerations

### 7.1 Role Gate

- Skip All: editor+ (기존 `/skip` route가 이미 검증)
- Budget Apply (PATCH campaigns): editor+
- Rule Create (M03 submit): editor+
- Alert 조회 (M04): viewer+

### 7.2 Input Validation

- Client-side: 버튼 disable (loading/error)
- Server-side: Zod는 OUT OF SCOPE (별도 PDCA). 기존 manual check 유지.

---

## 8. Test Plan

### 8.1 Playwright E2E (`tests/e2e/optimization-ui.spec.ts`)

```typescript
// L1 API verification
test('/api/ads/recommendations/:id/skip — 401 no auth', ...)
test('/api/ads/recommendations/:id/skip — 200 editor role', ...)

// L2 UI actions
test.describe('S04 Bid Optimization', () => {
  test('+ New Rule 버튼 클릭 → M03 모달 open', ...)
  test('체크박스 전체 선택 → bulk bar 표시', ...)
  test('Skip All → 모든 pending row 서버 호출', ...)
})

test.describe('S05 Daily Budget', () => {
  test('alert-dot 클릭 → M04 모달 open', ...)
  test('Underspend "Analyze →" → M05 모달 open', ...)
  test('AI Budget Apply → PATCH campaigns + UI 반영', ...)
  test('AI Budget Dismiss → localStorage에 저장', ...)
})

test.describe('S07 Dayparting', () => {
  test('Apply AI Schedule → PATCH schedules + heatmap refresh', ...)
  test('heatmap cell 클릭 → weight 토글 + PATCH', ...)
})

test.describe('S11 AI Recommendations', () => {
  test('Brand/Market 필터 변경 → list refetch', ...)
  test('Skip All → 모든 row /skip 호출 + refetch', ...)
})

test.describe('Metrics accuracy', () => {
  test('GET /api/ads/recommendations .summary.est_revenue_impact > 0', ...)
  test('auto_count !== broad_count when 다른 match_type 존재', ...)
})
```

### 8.2 Preview Manual Smoke (S8)

- https://<preview>/ads/optimization 로그인
- Bid 탭: "+ New Rule" 클릭 → 모달 열림 → 취소
- Budget 탭: alert-dot 클릭, AI Apply 시도
- Dayparting 탭: Apply AI, 히트맵 셀 클릭
- Keywords 탭: Skip All
- /ads/optimization/recommendations: Skip All, Brand filter

---

## 9. Rollback Strategy

### 9.1 Single Revert

각 세션을 독립 commit으로 유지 (S1~S6 각각). 문제 발견 시 해당 session commit만 revert 가능.

### 9.2 Dangerous Path

- S4 Skip All: 서버 `/skip`이 idempotent이라 재호출 safe. 단, 사용자가 실수로 Skip All 클릭 시 대량 skip 발생 → **confirm dialog** 필요 (design §6.1에 반영 필요)

**추가 결정**: Skip All 클릭 시 `confirm("N개의 추천을 Skip 처리합니다. 계속?")` 추가.

---

## 10. Success Verification

| SC | 확인 방법 |
|----|----------|
| SC-1 | Playwright: "+ New Rule" → M03 visible. Alert dot → M04 visible. "Analyze →" → M05 visible |
| SC-2 | Playwright: AI Budget Apply → network PATCH `/api/ads/campaigns/:id` 확인 |
| SC-3 | Playwright: Apply AI Schedule → network PATCH. heatmap cell click → PATCH 발생 |
| SC-4 | Playwright: Skip All 후 refetch → skipped rows 사라짐. DB query: `SELECT count(*) WHERE status='skipped'` 증가 |
| SC-5 | Playwright: S04 헤더에 "Select All" 체크박스 visible. 선택 시 bulk bar 나타남 |
| SC-6 | DB query or Playwright intercept: `summary.auto_count` !== `summary.broad_count` when 다른 match_type 캠페인 존재 |
| SC-7 | Network intercept: `summary.est_revenue_impact` > 0 when estimated_impact > 0 |
| SC-8 | Playwright: Brand/Market multiselect 확인, 필터 변경 시 list refetch |
| SC-9 | `pnpm playwright test tests/e2e/optimization-ui.spec.ts` exit 0 |

---

## 11. Implementation Guide

### 11.1 Session Dependencies

```
S1 modals ──┐
S2 ai-buttons ──┐ 
S3 heatmap ──┤── (병렬 가능, file 겹침 조심)
S4 skip-api ─┤  ← S5 (queries.ts) 전에 완료 권장
S5 metrics ──┤  ← I8 helper 함수 추가
S6 filters-bulkbar ─┘  ← S4의 hook 재사용
           │
           ▼
        S7 e2e ← 모든 S1~S6 완료 후
           │
           ▼
       S8 deploy
```

**실제 순서**: S1 → S2 → S3 → S4 (hook 신설) → S6 (hook 재사용 + bulk) → S5 (metrics) → S7 → S8

### 11.2 Pre-Do Checklist (S1 시작 전)

- [ ] Rule Create modal의 public props 확인: 필수 `onSubmit`, `onClose`, optional `initialData`
- [ ] Alert Detail modal: `alertId` 또는 `alert` object prop
- [ ] Underspend modal: `campaignId` 또는 `campaign` object prop
- [ ] 각 모달이 자체 내부 API call (submit) 처리하는지 vs caller가 처리해야 하는지

### 11.3 Session Guide

| Session | scope key | 내용 | 예상 | 파일 |
|---------|-----------|------|------|------|
| **S1** | `modals` | M03/M04/M05 caller state + CTA 버튼 연결 | 1.5h | 2 modified |
| **S2** | `ai-buttons` | Budget Apply/Dismiss + Dayparting Apply onClick | 45min | 2 modified |
| **S3** | `heatmap` | inline grid → shared `heatmap-grid` | 30min | 1 modified |
| **S4** | `skip-api` | `useSkipRecommendations` hook 신설 + 3 페이지 적용 | 45min | 1 new + 3 modified |
| **S5** | `metrics` | `auto_count` fix + `computeEstRevenue` helper + I8 wiring | 30min | 1 modified |
| **S6** | `filters-bulkbar` | `useRowSelection` hook 신설 + S04 bulk bar + S11 Brand/Market | 1h | 1 new + 2 modified |
| **S7** | `e2e` | Playwright spec | 1h | 1 new |
| **S8** | `deploy` | Preview + 관찰 + Prod | 30min + 관찰 | — |

**총**: 3 신규 + 11 수정 파일, ~5h

### 11.4 Command Examples

```bash
/pdca do ft-optimization-ui-wiring --scope modals
/pdca do ft-optimization-ui-wiring --scope ai-buttons,heatmap
/pdca do ft-optimization-ui-wiring --scope skip-api,filters-bulkbar
/pdca do ft-optimization-ui-wiring --scope metrics
/pdca do ft-optimization-ui-wiring --scope e2e
```

---

## 12. Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-23 | Initial Design with Option C (Pragmatic). 14 파일 (3 new + 11 modified). 2 공유 hook 도입. | Jayden Song |
