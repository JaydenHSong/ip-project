# Case ID Recovery — Design

## Executive Summary

| Item | Detail |
|:--|:--|
| **Feature** | Case ID Recovery |
| **Plan** | `docs/01-plan/features/case-id-recovery.plan.md` |
| **Created** | 2026-03-18 |

### Value Delivered

| Perspective | Detail |
|:--|:--|
| **Problem** | BR 제출 성공했지만 case_id 추출 실패 시 Monitor 추적 불가 (3/13 6건, 3/16 1건) |
| **Solution** | Monitor 사이클에서 자동 복구 (3회) + 수동 입력 fallback |
| **Function UX Effect** | 관리자 개입 최소화, 수동 입력은 최후의 수단으로만 노출 |
| **Core Value** | BR 케이스 추적 100% 커버리지 달성 |

---

## 1. DB Schema Changes

### 1.1 새 컬럼

```sql
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS br_case_id_retry_count integer DEFAULT 0;

COMMENT ON COLUMN reports.br_case_id_retry_count
  IS '자동 case_id 복구 시도 횟수 (3회 초과 시 수동 입력 전환)';
```

### 1.2 br_case_status 확장

기존 값: `work_in_progress`, `answered`, `needs_attention`, `closed`, `open`, `null`

추가: `case_id_missing` — 자동 복구 3회 실패 후 수동 입력 대기 상태

---

## 2. 자동 복구 로직 (Crawler)

### 2.1 새 API: `GET /api/crawler/br-case-id-missing`

case_id가 null인 monitoring 리포트를 반환.

```typescript
// 쿼리 조건
supabase
  .from('reports')
  .select('id, draft_title, br_submitted_at, br_case_id_retry_count')
  .eq('status', 'monitoring')
  .is('br_case_id', null)
  .lt('br_case_id_retry_count', 3)
  .order('br_submitted_at', { ascending: true })
  .limit(10)

// 응답
{ reports: [{ report_id, draft_title, submitted_at, retry_count }] }
```

### 2.2 새 API: `POST /api/crawler/br-case-id-recovery`

복구 결과를 보고하는 엔드포인트.

```typescript
type CaseIdRecoveryRequest = {
  report_id: string
  br_case_id: string | null   // null이면 실패
}

// 성공 시: br_case_id 업데이트
// 실패 시: br_case_id_retry_count + 1, 3회 도달 시 br_case_status = 'case_id_missing'
```

### 2.3 Monitor Worker에 복구 스텝 추가

**위치**: `crawler/src/br-monitor/worker.ts` — `processBrMonitorJob()` 시작 부분

**플로우**:

```
processBrMonitorJob() 시작
  ├─ [NEW] Phase 0: Case ID 복구
  │   ├─ sentinelClient.getCaseIdMissing() 호출
  │   ├─ 대상 없으면 건너뛰기
  │   ├─ BR 대시보드 접속 (이미 로그인된 세션 활용)
  │   ├─ 최근 케이스 목록 스크래핑
  │   ├─ 각 리포트에 대해 매칭 시도
  │   └─ 결과 보고 (sentinelClient.reportCaseIdRecovery)
  │
  └─ [기존] Phase 1: 정상 모니터링
      ├─ 각 케이스 상세 스크래핑
      └─ 메시지/상태 변경 감지
```

### 2.4 대시보드 케이스 매칭 전략 (간소화)

**핵심 원리**: 대시보드 Subject = 우리가 제출한 draft_title.
Subject 매칭이면 끝.

**참고 (스크린샷 확인 2026-03-18)**:
- 대시보드 컬럼: ID, Status, Subject, Creation Date, Last Amazon Reply, Action
- Subject = 제출 시 입력한 제목 그대로 표시됨

**매칭 로직**:

```
1. 대시보드 접속 → 최근 케이스 목록 스크래핑
2. 각 행에서 { caseId, subject, createdAt } 추출
3. 이미 DB에 매칭된 case_id 제외
4. 매칭 시도 (우선순위):
   a. Subject에 ASIN 포함 여부 확인 (새로 제출된 건 — [ASIN] suffix)
   b. Subject === draft_title 비교 (기존 건 — ASIN suffix 없는 경우)
5. (동일 매칭 여러 건일 경우) br_submitted_at과 가장 가까운 것 선택
```

### Subject에 ASIN 강제 포함 (예방 조치)

BR 제출 시 Subject에 ASIN suffix를 자동 추가하여 매칭 정확도를 높임.

**변경 위치**: `src/lib/reports/br-data.ts` — `buildBrSubmitData()`

```typescript
// subject 생성 시 ASIN suffix 추가 (중복 방지)
const subject = asin && !draftTitle.includes(asin)
  ? `${draftTitle} [${asin}]`
  : draftTitle
```

- Before: `Color variation - Different product`
- After: `Color variation - Different product [B0FLTCWBN3]`
- 관리자가 이미 ASIN을 넣은 경우: 중복으로 안 붙임
- 대시보드 검색창에서 ASIN 검색 가능
- 기존 건(ASIN 없는 Subject)은 draft_title로 fallback 매칭

**핵심 코드 구조**:

```typescript
// crawler/src/br-monitor/case-id-recovery.ts (신규)

type RecoveryTarget = {
  reportId: string
  asin: string
  submittedAt: string
  retryCount: number
}

type DashboardCase = {
  caseId: string
  text: string         // 행 전체 텍스트
  createdAt: string    // 케이스 생성 시간 (파싱)
  href: string         // 케이스 상세 링크
}

const recoverCaseIds = async (
  page: Page,
  targets: RecoveryTarget[],
  sentinelClient: SentinelClient,
): Promise<void> => {
  // 1. 대시보드에서 최근 케이스 목록 스크래핑
  const cases = await scrapeDashboardCases(page)

  // 2. 이미 매칭된 case_id 제외 (DB에 있는 것들)
  const usedCaseIds = new Set(/* 기존 br_case_id 목록 */)
  const available = cases.filter(c => !usedCaseIds.has(c.caseId))

  // 3. 각 타겟에 대해 매칭 시도
  for (const target of targets) {
    const matched = matchCaseToReport(target, available)
    await sentinelClient.reportCaseIdRecovery({
      report_id: target.reportId,
      br_case_id: matched?.caseId ?? null,
    })
  }
}
```

### 2.5 SentinelClient 확장

```typescript
// crawler/src/api/sentinel-client.ts에 추가

getCaseIdMissing: () => Promise<RecoveryTarget[]>
// GET /api/crawler/br-case-id-missing

reportCaseIdRecovery: (data: CaseIdRecoveryRequest) => Promise<void>
// POST /api/crawler/br-case-id-recovery
```

---

## 3. 수동 입력 UI (Web)

### 3.1 표시 조건

```typescript
const showCaseIdInput =
  currentStatus === 'monitoring' &&
  !report.br_case_id &&
  (report.br_case_id_retry_count ?? 0) >= 3
```

### 3.2 UI 컴포넌트

**위치**: `ReportDetailContent.tsx` — BR Case Info 영역

```
┌─ Case Info ──────────────────────────────────┐
│                                              │
│  ⚠️ Case ID를 자동으로 가져오지 못했습니다.  │
│                                              │
│  Case ID  [___________________]  [저장]      │
│                                              │
│  💡 BR Dashboard에서 확인하세요              │
│  (대시보드 링크)                              │
│                                              │
└──────────────────────────────────────────────┘
```

- 자동 복구 진행 중 (retry < 3): `"Case ID 자동 복구 중... (시도 {n}/3)"`
- 자동 복구 실패 (retry >= 3): 수동 입력 필드 노출
- 입력 후 저장: br_case_id 업데이트 + br_case_status 초기화

### 3.3 API: `PATCH /api/reports/[id]/case-id`

```typescript
// 요청
{ br_case_id: string }  // 11자리 숫자

// 처리
1. 유효성 검증: /^\d{5,}$/ (5자리 이상 숫자)
2. 중복 확인: 다른 리포트에 같은 case_id가 없는지
3. 업데이트:
   - br_case_id = 입력값
   - br_case_status = null (초기화 → 다음 Monitor에서 스크래핑)
   - br_case_id_retry_count = 0 (리셋)
4. 권한: owner, admin, editor
```

---

## 4. 기존 br-result API 보강

### 4.1 Case ID 없이 성공 시 retry_count 초기화

`/api/crawler/br-result` — 성공이지만 case_id가 null인 경우:

```typescript
// 기존 (변경 없음)
br_case_id: body.br_case_id ?? null,

// 추가
br_case_id_retry_count: body.br_case_id ? 0 : 0,  // 둘 다 0으로 시작
// → 자동 복구가 이후 Monitor 사이클에서 시도됨
```

현재 코드가 이미 `br_case_id: null`을 허용하고 `monitoring`으로 전환하므로, 추가 변경 불필요. 복구는 Monitor에서 처리.

---

## 5. 구현 순서

| Step | 파일 | 설명 |
|:--|:--|:--|
| **S1** | Supabase SQL | `br_case_id_retry_count` 컬럼 추가 |
| **S2** | `src/app/api/crawler/br-case-id-missing/route.ts` | 새 API — 복구 대상 조회 |
| **S3** | `src/app/api/crawler/br-case-id-recovery/route.ts` | 새 API — 복구 결과 보고 |
| **S4** | `crawler/src/api/sentinel-client.ts` | 2개 메서드 추가 |
| **S5** | `crawler/src/br-monitor/case-id-recovery.ts` | 대시보드 매칭 로직 (신규 파일) |
| **S6** | `crawler/src/br-monitor/worker.ts` | Phase 0 복구 스텝 추가 |
| **S7** | `src/app/api/reports/[id]/case-id/route.ts` | 수동 입력 API |
| **S8** | `ReportDetailContent.tsx` | 수동 입력 UI |

---

## 6. 매칭 실패 프로시저

```
시도 1회차 (첫 Monitor 사이클)
  → Subject 매칭 시도
  → 실패: retry_count = 1
  → 로그: [WARN] Case ID recovery failed (1/3) for report {id}

시도 2회차 (30분 후 다음 사이클)
  → Subject 매칭 재시도
  → 실패: retry_count = 2

시도 3회차 (또 30분 후)
  → Subject 매칭 재시도
  → 실패: retry_count = 3
  → br_case_status = 'case_id_missing' 마킹
  → Google Chat 알림: "Report #{number}의 Case ID를 자동으로 찾지 못했습니다. 수동 입력 필요"
  → Report Detail에 수동 입력 UI 노출

수동 입력 (관리자)
  → BR Dashboard에서 Case ID 확인
  → Report Detail에서 입력 + 저장
  → br_case_id 업데이트, br_case_status 초기화
  → 다음 Monitor 사이클부터 정상 추적
```

### 엣지 케이스

| 상황 | 처리 |
|:--|:--|
| 대시보드 로드 실패 | Phase 0 전체 스킵, retry_count 증가 안 함, 다음 사이클에서 재시도 |
| 로그인 만료 | 자동 로그인 후 재시도 (기존 로직 활용) |
| Subject 매칭 후보 0개 | retry_count + 1 |
| 동일 Subject 여러 건 | br_submitted_at과 시간 가장 가까운 것 선택 |
| 이미 다른 리포트에 매칭된 case_id | 제외하고 다음 후보 |
| 수동 입력 시 잘못된 case_id | 프론트에서 숫자 5자리 이상 검증 |
| 수동 입력 시 중복 case_id | API에서 거부 + 에러 메시지 |

---

## 7. 모니터링 & 알림

| 이벤트 | 채널 | 메시지 |
|:--|:--|:--|
| 자동 복구 성공 | 로그 | `[INFO] Case ID recovered for report {id}: {caseId}` |
| 자동 복구 시도 실패 | 로그 | `[WARN] Case ID recovery failed ({n}/3) for report {id}` |
| 3회 실패 → 수동 전환 | Google Chat + 로그 | `Report #{number} Case ID 자동 복구 실패. 수동 입력 필요` |
| 수동 입력 완료 | 로그 | `[INFO] Case ID manually set for report {id}: {caseId}` |
