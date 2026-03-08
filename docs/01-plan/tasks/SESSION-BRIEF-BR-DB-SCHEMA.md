## Status: DONE
## Assigned Session: 2026-03-07 BR Track 세션
## Completed At: 2026-03-07

---

# BR Submit DB 스키마 & 타입 추가

## 세션 시작 명령어

```bash
# 1. 이 지시서 읽기
cat docs/01-plan/tasks/SESSION-BRIEF-BR-DB-SCHEMA.md

# 2. 기존 SC 패턴 파악 (참고)
cat src/types/reports.ts
cat src/lib/reports/sc-data.ts
cat supabase/migrations/014_report_workflow_overhaul.sql

# 3. BR 타입 참고
cat extension/src/shared/br-report-config.ts
cat crawler/src/br-submit/types.ts

# 4. 작업 시작 후 검증
pnpm typecheck
```

## Developer Persona

너는 **Kai** — 시니어 풀스택 엔지니어.
Supabase PostgreSQL, TypeScript 타입 시스템, JSONB 컬럼 설계에 깊은 전문성.
SC Track 패턴을 정확히 미러링하되 불필요한 중복을 만들지 않는다.

---

## 배경

BR (Brand Registry) 자동 신고 엔진의 Playwright worker가 이미 구현되어 있다:
- `crawler/src/br-submit/worker.ts` — 폼 자동 채우기 + 제출
- `crawler/src/br-submit/queue.ts` — BullMQ 큐
- `crawler/src/br-submit/scheduler.ts` — 2분 폴링

**문제:** DB에 `br_submit_data` 컬럼이 없고, TypeScript 타입도 없어서 Web ↔ Crawler 연동이 안 됨.

## 목표

reports 테이블에 BR 관련 컬럼 추가 + TypeScript 타입 정의

---

## 구현 태스크

### Task 1: Supabase 마이그레이션 SQL

**Supabase SQL Editor에서 실행:**

```sql
-- BR Submit 컬럼 추가
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS br_submit_data JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS br_case_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS br_submitted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS br_submission_error TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS br_submit_attempts INTEGER DEFAULT 0;

-- br_submitting 상태 인덱스 (스케줄러 폴링 성능)
CREATE INDEX IF NOT EXISTS idx_reports_br_submitting
  ON reports (created_at)
  WHERE status = 'br_submitting';

COMMENT ON COLUMN reports.br_submit_data IS 'BR Contact Support 폼 데이터 (제출 후 null)';
COMMENT ON COLUMN reports.br_case_id IS 'BR 제출 후 반환된 케이스 ID';
```

**주의:** Supabase SQL Editor에서 먼저 실행 후 코드 배포 (CLAUDE.md 규칙)

### Task 2: 마이그레이션 파일 생성

**파일:** `supabase/migrations/XXX_add_br_submit_columns.sql`

위 SQL을 마이그레이션 파일로도 저장 (히스토리 관리용). 파일 번호는 기존 마이그레이션의 다음 번호.

### Task 3: TypeScript 타입 추가

**파일:** `src/types/reports.ts`

기존 `ScSubmitData` 옆에 추가:

```typescript
export type BrFormType =
  | 'other_policy'
  | 'incorrect_variation'
  | 'product_review'
  | 'product_not_as_described'

export type BrSubmitData = {
  form_type: BrFormType
  subject: string
  description: string
  product_urls: string[]
  seller_storefront_url?: string
  policy_url?: string
  asins?: string[]           // product_review 전용
  order_id?: string          // product_review 전용
  prepared_at: string
}
```

Report 타입에 추가:
```typescript
// 기존 sc_* 필드 아래에
br_submit_data?: BrSubmitData | null
br_case_id?: string | null
br_submitted_at?: string | null
br_submission_error?: string | null
br_submit_attempts?: number
```

### Task 4: buildBrSubmitData 헬퍼

**파일:** `src/lib/reports/br-data.ts` (새 파일)

`src/lib/reports/sc-data.ts`와 동일 패턴:

```typescript
import type { BrSubmitData, BrFormType } from '@/types/reports'

// V01~V19 → BR 폼 타입 매핑 (extension/src/shared/br-report-config.ts와 동기화)
const BR_VIOLATION_MAP: Record<string, BrFormType | null> = {
  V01: null, V02: null, V03: null,
  V04: 'other_policy',
  V05: 'other_policy', V06: 'other_policy',
  V07: 'product_not_as_described',
  V08: 'other_policy', V09: 'other_policy',
  V10: 'incorrect_variation',
  V11: 'product_review', V12: 'product_review',
  V13: 'other_policy', V14: 'other_policy', V15: 'other_policy',
  V16: 'other_policy', V17: 'other_policy', V18: 'other_policy', V19: 'other_policy',
}

type BuildBrDataInput = {
  report: {
    id: string
    user_violation_type: string
    draft_body: string | null
    draft_title: string | null
  }
  listing: {
    asin: string
    url: string | null
  }
}

export const isBrReportable = (violationCode: string): boolean =>
  BR_VIOLATION_MAP[violationCode] !== null && BR_VIOLATION_MAP[violationCode] !== undefined

export const buildBrSubmitData = ({ report, listing }: BuildBrDataInput): BrSubmitData | null => {
  const formType = BR_VIOLATION_MAP[report.user_violation_type]
  if (!formType) return null

  return {
    form_type: formType,
    subject: `Policy Violation Report - ${listing.asin}`,
    description: report.draft_body ?? '',
    product_urls: listing.url ? [listing.url] : [],
    prepared_at: new Date().toISOString(),
  }
}
```

---

## 끝점 (완료 조건)

- [ ] SQL 마이그레이션 파일 생성됨
- [ ] Supabase SQL Editor에서 마이그레이션 실행 완료
- [ ] `BrSubmitData`, `BrFormType` 타입이 `src/types/reports.ts`에 정의됨
- [ ] Report 타입에 br_* 필드 추가됨
- [ ] `buildBrSubmitData()` 헬퍼가 `src/lib/reports/br-data.ts`에 구현됨
- [ ] `pnpm typecheck` 통과
- [ ] 기존 코드에 영향 없음 (새 컬럼은 nullable이므로)

## 리스크

1. **기존 쿼리 영향 없음** — 새 컬럼은 모두 nullable/default, SELECT * 사용하는 곳만 주의
2. **타입 동기화** — `extension/src/shared/br-report-config.ts`의 매핑과 `src/lib/reports/br-data.ts`의 매핑이 일치해야 함
