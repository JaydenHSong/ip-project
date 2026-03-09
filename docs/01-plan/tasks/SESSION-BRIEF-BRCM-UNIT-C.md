# SESSION-BRIEF: BRCM Unit C — Web UI Phase 1 (상태 + 큐 + 연결)

## Status: DONE
## Assigned Session: 2026-03-08
## Completed At: 2026-03-08

---

## 개요

R01(상태 분리) + R04(스마트 큐) + R07(케이스 연결) UI 구현.
모니터링 데이터가 들어왔을 때 사용자가 바로 활용할 수 있는 기본 뷰.

## 예상 시간: 9시간

## 의존성: Unit A (DB 스키마 + 타입) 완료 필요

---

## 작업 목록

### 1. R01: 상태 분리 UI

#### BrCaseStatusBadge 컴포넌트
- `src/components/ui/BrCaseStatusBadge.tsx`
- Props: `status: BrCaseStatus`
- 색상: Awaiting Amazon(파랑), Action Required(빨강), Case Closed(회색)

#### Report Detail 수정
- `src/app/(protected)/reports/[id]/ReportDetailContent.tsx`
  - BR 케이스 정보 섹션 추가 (br_case_id, br_case_status, 마지막 응답 시간)

#### Reports 리스트 수정
- `src/app/(protected)/reports/ReportsContent.tsx`
  - BR 케이스 상태 컬럼 추가 (또는 기존 Status 옆에 서브 뱃지)
  - 필터에 `br_case_status` 옵션 추가

#### API 수정
- `GET /api/reports` 쿼리에 `br_case_status` 필터 추가

### 2. R04: 스마트 큐

#### BrCaseQueueBar 컴포넌트
- `src/components/features/BrCaseQueueBar.tsx`
- 큐별 카운트 뱃지 (Action Required, SLA Warning, New Reply, Stale)
- 클릭 시 해당 조건으로 필터

#### Dashboard summary API
- `GET /api/dashboard/br-case-summary`
- 반환: `{ action_required: 3, sla_warning: 5, new_reply: 2, stale: 8, total: 47 }`

#### API 수정
- `GET /api/reports` 에 `smart_queue` 파라미터 추가

### 3. R07: 케이스 연결

#### CaseChain 컴포넌트
- `src/components/features/CaseChain.tsx`
- 수평 체인: 원본 → 재제출 → 에스컬레이션
- 각 노드 클릭 시 해당 리포트로 이동

#### RelatedReports 컴포넌트
- `src/components/features/RelatedReports.tsx`
- 같은 listing_id 가진 리포트 리스트

#### API
- `GET /api/reports/[id]/related`
  - parent chain, children, same listing

#### Report Detail 통합
- CaseChain + RelatedReports를 Report Detail에 배치

---

## 완료 기준

- [ ] BR 케이스 상태 뱃지가 리포트 리스트 + 상세에 표시
- [ ] 스마트 큐 카운트 뱃지 동작 (클릭 → 필터)
- [ ] 케이스 체인이 관련 리포트를 시각화
- [ ] `pnpm typecheck && pnpm lint` 통과

## 변경 파일 목록 (완료 후 기록)

### 신규 파일
- `src/app/api/dashboard/br-case-summary/route.ts` — 스마트 큐 카운트 API
- `src/app/api/reports/[id]/related/route.ts` — 관련 리포트 조회 API
- `src/components/features/BrCaseQueueBar.tsx` — 큐 카운트 뱃지 바
- `src/components/features/CaseChain.tsx` — 케이스 체인 시각화
- `src/components/features/RelatedReports.tsx` — 동일 리스팅 리포트

### 수정 파일
- `src/app/(protected)/reports/ReportsContent.tsx` — BrCaseQueueBar 추가, BR Case 컬럼 추가
- `src/app/(protected)/reports/page.tsx` — br_case_status, smart_queue 필터 추가
- `src/app/(protected)/reports/[id]/page.tsx` — ReportData BR 필드 확장
- `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` — CaseChain, RelatedReports 통합
- `src/app/api/reports/route.ts` — brCaseStatus 필터 추가
