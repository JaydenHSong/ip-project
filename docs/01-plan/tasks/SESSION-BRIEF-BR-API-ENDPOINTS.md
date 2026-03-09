## Status: DONE
## Assigned Session: 2026-03-07 BR Track 세션
## Completed At: 2026-03-07
## Depends On: SESSION-BRIEF-BR-DB-SCHEMA (DB 컬럼 + 타입 필수)

---

# BR Submit API 엔드포인트 구현

## 세션 시작 명령어

```bash
# 1. 이 지시서 읽기
cat docs/01-plan/tasks/SESSION-BRIEF-BR-API-ENDPOINTS.md

# 2. 선행 작업 확인 (DB 스키마 세션이 완료되었는지)
cat docs/01-plan/tasks/SESSION-BRIEF-BR-DB-SCHEMA.md | head -3

# 3. SC 패턴 참고 (동일 구조로 미러링)
cat src/app/api/crawler/sc-pending/route.ts
cat src/app/api/crawler/sc-result/route.ts

# 4. BR 타입 확인
cat src/types/reports.ts | grep -A 20 "BrSubmitData"
cat src/lib/reports/br-data.ts

# 5. 작업 시작 후 검증
pnpm typecheck && pnpm build
```

## Developer Persona

너는 **Kai** — 시니어 풀스택 엔지니어.
Next.js App Router API Routes, Supabase 쿼리, Service Token 인증에 능숙.
SC Track API를 정확히 미러링하여 일관된 패턴을 유지한다.

---

## 배경

BR Crawler Worker가 2분마다 `GET /api/crawler/br-pending`을 폴링하고, 제출 완료 시 `POST /api/crawler/br-result`를 호출한다. 이 두 엔드포인트가 아직 없다.

## 목표

Crawler ↔ Web 연동을 위한 API 2개 + SC→BR 상태 전환 로직 구현

---

## 구현 태스크

### Task 1: GET /api/crawler/br-pending

**파일:** `src/app/api/crawler/br-pending/route.ts` (새 파일)

**패턴:** `src/app/api/crawler/sc-pending/route.ts`와 동일

**로직:**
1. Service Token 인증 (`Authorization: Bearer {CRAWLER_SERVICE_TOKEN}`)
2. reports 테이블에서 조회:
   - `status = 'br_submitting'`
   - `br_submit_data IS NOT NULL`
   - `br_case_id IS NULL`
3. 최대 10건, `created_at ASC` 정렬 (오래된 것 먼저)
4. 응답: `{ reports: [{ id, br_submit_data }] }`

```typescript
// 쿼리 예시
const { data } = await supabase
  .from('reports')
  .select('id, status, br_submit_data, listing:listings(asin, marketplace, title)')
  .eq('status', 'br_submitting')
  .not('br_submit_data', 'is', null)
  .is('br_case_id', null)
  .order('created_at', { ascending: true })
  .limit(10)
```

### Task 2: POST /api/crawler/br-result

**파일:** `src/app/api/crawler/br-result/route.ts` (새 파일)

**패턴:** `src/app/api/crawler/sc-result/route.ts`와 동일

**Request Body:**
```typescript
{
  report_id: string
  success: boolean
  br_case_id?: string | null
  error?: string | null
}
```

**로직:**
```
성공 (success: true):
  → status = 'monitoring'
  → br_case_id = 요청값
  → br_submitted_at = now()
  → br_submit_data = null (정리)
  → br_submission_error = null
  → monitoring_started_at = now() (없으면)
  → report_snapshots에 초기 스냅샷 생성

실패 (success: false):
  → br_submit_attempts += 1
  → br_submission_error = error 메시지
  → br_submit_attempts < 3:
      status 유지 (br_submitting) → 재시도 대기
  → br_submit_attempts >= 3:
      status = 'approved' (복귀, 수동 검토 필요)
      br_submit_data = null
      → Admin에게 Google Chat 알림
```

### Task 3: SC Result → BR 전환 로직

**파일:** `src/app/api/crawler/sc-result/route.ts` (수정)

**현재:** SC 성공 → status = `monitoring`
**변경:** SC 성공 → `br_submit_data`가 있으면 status = `br_submitting`, 없으면 `monitoring`

```typescript
// sc-result 성공 처리 부분에 추가
const report = await getReport(reportId)

if (report.br_submit_data) {
  // BR Track도 제출해야 함 → br_submitting으로 전환
  updates.status = 'br_submitting'
} else {
  // SC만으로 완료 → monitoring
  updates.status = 'monitoring'
  updates.monitoring_started_at = new Date().toISOString()
}
```

**주의:** sc_case_id는 저장하되, status만 분기하는 것. sc_submit_data는 여전히 null로 정리.

### Task 4: Report 상태 플로우 문서 업데이트

기존 상태 플로우에 BR 단계 추가:

```
approve
  → sc_submitting (PD Reporting) + br_submit_data 준비
  → PD Reporting 성공
    → br_submit_data 있음? → br_submitting (BR 큐)
                              → BR 성공 → monitoring
                              → BR 3회 실패 → approved (수동)
    → br_submit_data 없음? → monitoring
```

---

## 끝점 (완료 조건)

- [ ] `GET /api/crawler/br-pending` 라우트 생성 + Service Token 인증
- [ ] `POST /api/crawler/br-result` 라우트 생성 + 성공/실패 분기 처리
- [ ] SC result 라우트에서 BR 전환 로직 추가
- [ ] `pnpm typecheck && pnpm build` 통과
- [ ] curl로 엔드포인트 테스트 (빈 배열 응답 확인)

## 리스크

1. **SC result 수정** — 기존 SC 흐름에 영향 주지 않도록 주의. br_submit_data가 null이면 기존과 동일하게 동작해야 함
2. **상태 전환 원자성** — Supabase update는 단일 쿼리로 처리하여 race condition 방지
3. **모니터링 스냅샷** — BR 성공 시에도 report_snapshots 초기 스냅샷 생성 필요
