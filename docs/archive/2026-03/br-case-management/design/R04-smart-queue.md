# R04: Needs Attention 스마트 큐

> **중요도**: ★★★★★ (최우선)
> **난이도**: ★★☆☆☆ (낮음)
> **Phase**: 1
> **의존성**: R1 (상태 분리)
> **병렬 가능**: ✅ 완전 독립 (필터 로직 + UI)

---

## 1. 문제

수백~수천 개 케이스 중 "지금 행동이 필요한 건"을 찾으려면 일일이 확인해야 함.
Freshdesk의 "미해결/지연/미할당" 대시보드처럼 자동 필터링된 뷰 필요.

## 2. 솔루션

### 2.1 스마트 큐 정의

| 큐 이름 | 조건 | 우선순위 |
|---------|------|:--------:|
| **Action Required** | `br_case_status = 'needs_attention'` | 🔴 최우선 |
| **SLA Breached** | `br_sla_deadline_at < now()` | 🔴 최우선 |
| **SLA Warning** | `br_sla_deadline_at < now() + 24h` | 🟡 높음 |
| **New Amazon Reply** | `br_last_amazon_reply_at > br_last_our_reply_at` | 🟡 높음 |
| **Stale (7일 미응답)** | `br_submitted_at < now() - 7d AND br_case_status IN ('open', 'work_in_progress')` | 🟠 중간 |
| **All Monitoring** | `status = 'monitoring' AND br_case_id IS NOT NULL` | 기본 |

### 2.2 UI

Reports 페이지 상단에 카운트 뱃지:

```
┌────────────────────────────────────────────────────┐
│ BR Cases                                            │
│                                                     │
│ 🔴 Action Required (3)  🟡 SLA Warning (5)         │
│ 🟡 New Reply (2)        🟠 Stale (8)               │
│                                                     │
│ [전체 모니터링 케이스: 47건]                         │
└────────────────────────────────────────────────────┘
```

클릭 시 해당 조건으로 필터링된 리포트 목록 표시.

### 2.3 정렬

기본 정렬: 긴급도 순 (Action Required → SLA Breached → SLA Warning → New Reply → Stale → 나머지)

## 3. 구현 범위

### 3.1 API
- `GET /api/reports` 쿼리에 `smart_queue` 파라미터 추가
  - `?smart_queue=action_required`
  - `?smart_queue=sla_warning`
  - `?smart_queue=new_reply`
  - `?smart_queue=stale`
- `GET /api/dashboard/br-case-summary` — 큐별 카운트 반환

### 3.2 UI
- `BrCaseQueueBar.tsx` — 큐별 카운트 뱃지 바
- Reports 리스트 필터에 스마트 큐 옵션 추가
- Dashboard에 BR 케이스 위젯 추가 (선택)

## 4. 작업량 추정

| 항목 | 예상 |
|------|------|
| API 필터 로직 | 1시간 |
| Dashboard summary API | 30분 |
| BrCaseQueueBar 컴포넌트 | 1시간 |
| Reports 필터 연동 | 30분 |
| **합계** | **~3시간** |
