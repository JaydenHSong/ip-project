## Status: DONE
## Assigned Session: 2026-03-07 BR Track 세션
## Completed At: 2026-03-07
## Depends On: SESSION-BRIEF-BR-DB-SCHEMA (타입 + 헬퍼), SESSION-BRIEF-BR-API-ENDPOINTS (API 라우트)

---

# BR Submit 승인 흐름 통합

## 세션 시작 명령어

```bash
# 1. 이 지시서 읽기
cat docs/01-plan/tasks/SESSION-BRIEF-BR-APPROVAL-FLOW.md

# 2. 선행 작업 확인
cat docs/01-plan/tasks/SESSION-BRIEF-BR-DB-SCHEMA.md | head -3
cat docs/01-plan/tasks/SESSION-BRIEF-BR-API-ENDPOINTS.md | head -3

# 3. 현재 승인 흐름 파악
cat src/app/api/reports/\[id\]/approve/route.ts
cat src/app/api/reports/bulk-approve/route.ts
cat src/lib/reports/sc-data.ts
cat src/lib/reports/br-data.ts

# 4. 작업 시작 후 검증
pnpm typecheck && pnpm build
```

## Developer Persona

너는 **Kai** — 시니어 풀스택 엔지니어.
기존 승인 흐름을 최소 변경으로 BR Track을 추가하는 것에 집중.
사이드이펙트 없이 기존 SC 흐름이 그대로 동작하는 것을 보장한다.

---

## 배경

현재 Report 승인 시:
1. `buildScSubmitData()` 호출 → `sc_submit_data` 생성
2. `status = 'sc_submitting'` 설정
3. Crawler가 SC 폼 자동 제출

**추가할 것:** 승인 시 BR 대상이면 `br_submit_data`도 함께 생성. SC 완료 후 BR로 자동 전환.

## 목표

Report 승인 시 BR 제출 데이터를 동시에 준비하여 SC→BR 순차 자동 제출 파이프라인 완성

---

## 구현 태스크

### Task 1: approve 라우트 수정

**파일:** `src/app/api/reports/[id]/approve/route.ts`

**변경 위치:** `buildScSubmitData()` 호출 직후

```typescript
import { buildBrSubmitData, isBrReportable } from '@/lib/reports/br-data'

// 기존 SC 데이터 생성 다음에 추가:
const brSubmitData = listing && isBrReportable(report.user_violation_type)
  ? buildBrSubmitData({ report: { id, user_violation_type, draft_body, draft_title }, listing })
  : null

// updates 객체에 추가:
const updates: Record<string, unknown> = {
  status: 'sc_submitting',
  approved_by: authUser!.id,
  approved_at: now,
  sc_submit_data: scSubmitData,
  br_submit_data: brSubmitData,  // ★ 추가
}
```

**핵심:** `br_submit_data`는 승인 시점에 함께 저장되지만, 실제 BR 제출은 SC 완료 후에 시작됨 (`sc-result`에서 `br_submitting`으로 전환).

### Task 2: bulk-approve 라우트 수정

**파일:** `src/app/api/reports/bulk-approve/route.ts`

**동일 패턴:**
- 각 report에 대해 `buildBrSubmitData()` 호출
- updates에 `br_submit_data` 포함

### Task 3: cancel-submit에 BR 데이터 정리 추가

**파일:** `src/app/api/reports/[id]/cancel-submit/route.ts`

**현재:** sc_submit_data = null
**추가:** br_submit_data = null, br_submit_attempts = 0

```typescript
const updates = {
  status: 'draft',
  sc_submit_data: null,
  br_submit_data: null,     // ★ 추가
  br_submit_attempts: 0,    // ★ 추가
}
```

### Task 4: confirm-submitted에서 BR 상태 체크

**파일:** `src/app/api/reports/[id]/confirm-submitted/route.ts`

Extension의 SC 제출 확인 콜백. SC 성공 시 BR 전환 로직 필요:

```typescript
// 기존: status = 'submitted'
// 변경: br_submit_data가 있으면 'br_submitting', 없으면 'submitted'

const report = await getReport(id)
const nextStatus = report.br_submit_data ? 'br_submitting' : 'submitted'

const updates = {
  status: nextStatus,
  sc_submit_data: null,
  sc_case_id: requestBody.sc_case_id,
  // ...
}
```

### Task 5: 상태 표시 UI 업데이트 (최소)

**파일:** 상태 뱃지가 표시되는 컴포넌트 확인 후 `br_submitting` 상태 추가

```typescript
// 상태 뱃지 매핑에 추가
'br_submitting': { label: 'BR Submitting', color: 'blue' }
```

검색 키워드: `sc_submitting` 텍스트가 있는 컴포넌트 파일을 찾아서 옆에 `br_submitting` 추가.

---

## 전체 상태 플로우 (SC + BR)

```
draft
  → pending_review
  → approve
    → sc_submitting (sc_submit_data + br_submit_data 동시 저장)

    [SC Track]
    → Extension confirm-submitted 또는 Crawler sc-result
      → SC 성공 + br_submit_data 있음 → br_submitting
      → SC 성공 + br_submit_data 없음 → monitoring (또는 submitted)
      → SC 실패 → retry 또는 approved 복귀

    [BR Track]
    → Crawler br-result
      → BR 성공 → monitoring
      → BR 실패 → retry 또는 approved 복귀
```

---

## 끝점 (완료 조건)

- [ ] approve 라우트에서 `br_submit_data` 생성 + 저장
- [ ] bulk-approve에서도 동일하게 BR 데이터 생성
- [ ] cancel-submit에서 BR 데이터 정리
- [ ] confirm-submitted에서 SC→BR 상태 전환
- [ ] `br_submitting` 상태 뱃지가 UI에 표시됨
- [ ] `pnpm typecheck && pnpm build` 통과
- [ ] 기존 SC 흐름이 그대로 동작함 (BR 대상 아닌 report는 영향 없음)

## 리스크

1. **기존 흐름 사이드이펙트** — `br_submit_data`가 null이면 모든 기존 로직이 그대로 동작해야 함. BR 관련 코드는 항상 null 체크 후 실행
2. **SC→BR 전환 타이밍** — SC가 실패하면 BR도 시작 안 됨 (의도된 동작). SC를 먼저 성공시키는 것이 우선
3. **UI 상태 표시** — `br_submitting`이 사용자에게 혼란스럽지 않도록 적절한 라벨 필요
4. **동시 제출 방지** — SC와 BR이 동시에 실행되지 않도록 순차 처리 보장
