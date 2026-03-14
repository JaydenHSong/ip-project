# BR Lifecycle Pivot — Design

> **Feature**: br-lifecycle-pivot
> **Plan**: `docs/01-plan/features/br-lifecycle-pivot.plan.md`
> **Date**: 2026-03-14
> **Status**: Draft

---

## 1. Status Lifecycle (변경 후)

### 1.1 Before → After

```
Before:
  draft → pending_review → approved → br_submitting → submitted → monitoring → (completed에 섞임)

After:
  draft → pending_review → approved → br_submitting → monitoring → (answered) → resolved/unresolved
                                                         ↑                │
                                                         └── Reply ───────┘
```

### 1.2 Status 정의 (변경 후)

| Status | 의미 | 위치 | 비고 |
|--------|------|------|------|
| `draft` | 작성 중 | Reports | |
| `pending_review` | 승인 대기 | Reports | |
| `approved` | 승인됨 | Reports | |
| `rejected` | 반려됨 | Reports | |
| `cancelled` | 취소됨 | Reports | |
| `br_submitting` | BR 제출 중 | Reports | |
| ~~`submitted`~~ | ~~제출됨~~ | ~~삭제~~ | **완전 제거** |
| `monitoring` | 모니터링 중 | Reports (Monitoring 탭) | submitted 흡수 |
| `resolved` | 해결됨 | Completed | |
| `unresolved` | 미해결 | Completed | |
| `resubmitted` | 재제출됨 (원본 종결) | Completed | |
| `escalated` | 에스컬레이션 | Completed | |
| `archived` | 보관됨 | Completed (Archive 탭) | |

### 1.3 탭 구조 (변경 후)

**Reports 페이지:**
```
[All] [Draft] [BR Submitting] [Monitoring] [Answered]
```

**Completed 페이지:**
```
[All] [Resolved] [Unresolved] [Resubmitted] [Escalated] [Archived]
```

### 1.4 Answered 탭 쿼리 조건

```sql
status = 'monitoring' AND br_case_status = 'answered'
```

Monitoring 탭에서는 `answered`가 아닌 케이스만:
```sql
status = 'monitoring' AND (br_case_status IS NULL OR br_case_status != 'answered')
```

---

## 2. 파일별 변경 상세

### Phase 1: DB 마이그레이션 (Supabase SQL Editor 먼저)

```sql
-- 1. 현황 확인
SELECT count(*), br_case_id IS NOT NULL as has_case
FROM reports WHERE status = 'submitted'
GROUP BY has_case;

-- 2. submitted → monitoring 마이그레이션
UPDATE reports
SET status = 'monitoring',
    monitoring_started_at = COALESCE(monitoring_started_at, updated_at)
WHERE status = 'submitted';

-- 3. 검증
SELECT count(*) FROM reports WHERE status = 'submitted'; -- 0이어야 함
```

### Phase 2: 타입 + 상수 정리

| # | 파일 | 변경 |
|---|------|------|
| 2-1 | `src/types/reports.ts` | `REPORT_STATUSES`에서 `'submitted'` 제거 |
| 2-2 | `src/components/ui/StatusBadge.tsx` | `REPORT_STATUS_MAP`에서 `submitted` 항목 제거 |

**`src/types/reports.ts`:**
```typescript
// Before
'br_submitting', 'submitted', 'monitoring'
// After
'br_submitting', 'monitoring'
```

**`src/components/ui/StatusBadge.tsx`:**
```typescript
// submitted 항목 삭제
// pd_submitting 항목도 이미 불필요하면 같이 삭제
```

### Phase 3: Reports 페이지 — Answered 탭 추가

| # | 파일 | 변경 |
|---|------|------|
| 3-1 | `src/app/(protected)/reports/ReportsContent.tsx` | STATUS_TABS에 `answered` 추가 |
| 3-2 | `src/app/(protected)/reports/page.tsx` | `answered` 파라미터 처리 — `status=monitoring AND br_case_status=answered` |

**`ReportsContent.tsx` STATUS_TABS:**
```typescript
const STATUS_TABS = [
  { value: '', label: t('common.all') },
  { value: 'draft', label: t('reports.tabs.draft') },
  { value: 'br_submitting', label: 'BR Submitting' },
  { value: 'monitoring', label: t('reports.tabs.monitoring') },
  { value: 'answered', label: 'Answered' },  // NEW
]
```

**`page.tsx` 쿼리 로직:**
```typescript
if (params.status === 'answered') {
  // monitoring 상태 + br_case_status = 'answered'
  query = query.eq('status', 'monitoring').eq('br_case_status', 'answered')
} else if (params.status === 'monitoring') {
  // monitoring 상태 + br_case_status != 'answered' (또는 null)
  query = query.eq('status', 'monitoring').neq('br_case_status', 'answered')
} else if (params.status) {
  query = query.eq('status', params.status)
} else {
  // All (기존 default filter + monitoring)
  query = query.in('status', ['draft', 'pending_review', 'approved', 'rejected', 'br_submitting', 'monitoring'])
}
```

### Phase 4: Completed 페이지 — submitted/monitoring 제거

| # | 파일 | 변경 |
|---|------|------|
| 4-1 | `src/app/(protected)/reports/completed/page.tsx` | `COMPLETED_STATUSES` 변경 |
| 4-2 | `src/app/(protected)/reports/completed/CompletedReportsContent.tsx` | STATUS_TABS 정리 |

**`completed/page.tsx`:**
```typescript
// Before
const COMPLETED_STATUSES = ['submitted', 'monitoring', 'resolved', 'unresolved', 'resubmitted', 'escalated']
// After
const COMPLETED_STATUSES = ['resolved', 'unresolved', 'resubmitted', 'escalated']
```

### Phase 5: API 수정

| # | 파일 | 변경 |
|---|------|------|
| 5-1 | `src/app/api/dashboard/stats/route.ts` | `statusPipeline`에서 `submitted` 제거, `approvedCount` 수정 |
| 5-2 | `src/app/api/reports/[id]/approve/route.ts` | 비BR: `submitted` → `monitoring` 으로 변경 |
| 5-3 | `src/app/api/reports/[id]/start-monitoring/route.ts` | `submitted` 선제조건 제거 또는 API 자체 제거 검토 |
| 5-4 | `src/app/api/reports/[id]/force-resubmit/route.ts` | 비BR: `submitted` → `monitoring` |
| 5-5 | `src/app/api/reports/bulk-approve/route.ts` | 비BR: `submitted` → `monitoring` |
| 5-6 | `src/app/api/ai/learn/route.ts` | `submitted` → `monitoring` 허용 조건 변경 |
| 5-7 | `src/app/api/dashboard/br-case-summary/route.ts` | `answered` 카운트 추가 |

**`approve/route.ts` 핵심 변경:**
```typescript
// Before
status: brReportable ? 'br_submitting' : 'submitted'
// After
status: brReportable ? 'br_submitting' : 'monitoring'
```

**`stats/route.ts`:**
```typescript
// Before
const statusPipeline = ['draft', 'pending_review', 'approved', 'submitted', 'monitoring', ...]
// After
const statusPipeline = ['draft', 'pending_review', 'approved', 'br_submitting', 'monitoring', ...]

// Before
const approvedCount = allReports.filter((r) => r.status === 'approved' || r.status === 'submitted').length
// After
const approvedCount = allReports.filter((r) => r.status === 'approved' || r.status === 'monitoring').length
```

**`start-monitoring/route.ts`:**
```typescript
// submitted 상태가 없으므로 이 API의 용도 재검토
// 옵션 A: API 제거 (monitoring은 approve에서 직접 전환)
// 옵션 B: monitoring 상태에서도 호출 가능하게 변경 (no-op)
// 권장: 옵션 A — approve에서 직접 monitoring으로 전환하므로 불필요
```

### Phase 6: BrCaseQueueBar 업데이트 (Could)

| # | 파일 | 변경 |
|---|------|------|
| 6-1 | `src/components/features/BrCaseQueueBar.tsx` | `answered` 항목 추가 |
| 6-2 | `src/app/api/dashboard/br-case-summary/route.ts` | `answered` 카운트 로직 추가 |

**BrCaseQueueBar:**
```typescript
const QUEUE_ITEMS = [
  { key: 'action_required', label: 'Action Required', variant: 'danger', param: 'needs_attention' },
  { key: 'answered', label: 'Answered', variant: 'violet', param: 'answered' },  // NEW
  { key: 'sla_warning', label: 'SLA Warning', variant: 'warning', param: 'sla_warning' },
  { key: 'new_reply', label: 'New Reply', variant: 'info', param: 'new_reply' },
  { key: 'stale', label: 'Stale (7d+)', variant: 'default', param: 'stale' },
]
```

### Phase 7: 전체 `submitted` 참조 제거

```bash
grep -r "submitted" --include="*.ts" --include="*.tsx" src/
```

모든 `'submitted'` 문자열 참조를 찾아 제거 또는 `'monitoring'`으로 교체.
i18n 레이블, notification 타입 등 포함.

### Phase 8: 빌드 검증

```bash
pnpm typecheck && pnpm lint && pnpm build
```

---

## 3. 영향 범위 요약

| 영역 | 파일 수 | 우선순위 |
|------|---------|---------|
| DB 마이그레이션 | SQL 1건 | Must (먼저) |
| 타입 + 상수 | 2 | Must |
| Reports 페이지 (Answered 탭) | 2 | Must |
| Completed 페이지 | 2 | Must |
| API 수정 | 7 | Must |
| BrCaseQueueBar | 2 | Could |
| `submitted` 참조 전수 제거 | ~20+ | Must |
| 빌드 검증 | - | Must |

---

## 4. 구현 순서 (의존성 기반)

```
Phase 1: DB 마이그레이션 (Supabase SQL Editor)
    ↓
Phase 2: 타입 + 상수 (submitted 제거)
    ↓
Phase 3: Reports 페이지 (Answered 탭)
    ↓  (동시 가능)
Phase 4: Completed 페이지 (COMPLETED_STATUSES)
    ↓
Phase 5: API 수정 (approve, stats, force-resubmit 등)
    ↓
Phase 6: BrCaseQueueBar (Could)
    ↓
Phase 7: submitted 참조 전수 제거
    ↓
Phase 8: typecheck → lint → build
```

---

## 5. Verification Checklist

- [ ] DB에 `status = 'submitted'` 레코드 0건
- [ ] Reports 페이지: Monitoring 탭에 monitoring 케이스 표시 (answered 제외)
- [ ] Reports 페이지: Answered 탭에 answered 케이스만 표시
- [ ] Completed 페이지: monitoring 케이스 안 보임
- [ ] Completed 페이지: resolved, unresolved, resubmitted, escalated만 표시
- [ ] Dashboard stats: submitted 없이 파이프라인 표시
- [ ] approve API: 비BR 승인 시 `monitoring` 상태로 전환
- [ ] `pnpm typecheck && pnpm lint && pnpm build` 성공
- [ ] BrCaseQueueBar에 answered 카운트 표시 (Could)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-03-14 | Initial design based on plan + code analysis |
