# BR Case URL & Case ID 관리 개선 — Plan

> **Feature**: BR 케이스 ID 링크화 + 추출 버그 수정 + 목록 표시 + CaseThread 새로고침
> **Created**: 2026-03-11
> **Phase**: Completed
> **Priority**: High (Critical Bug + Critical UX)

---

## 1. Background

BR 케이스를 아마존에 제출한 후, 케이스 번호를 추출하고 링크와 함께 관리하는 흐름을 점검한 결과 4개 이슈 발견.

**잘 되어 있는 것:**
- DB 스키마 완비 (`br_case_id`, `br_case_status`, SLA, 메시지/이벤트/노트 테이블)
- Crawler가 케이스 제출 → 케이스 ID 추출 → DB 저장 → 모니터링 전환 흐름
- UI에 BR Case Card (케이스 ID, 상태, SLA, 타임스탬프 표시)
- 30분 주기 모니터링 (케이스 상태, 메시지 스크래핑)
- CaseThread (메시지/노트/이벤트 통합 타임라인)

## 2. Goals

| # | Goal | Description |
|---|------|-------------|
| G1 | Case ID 클릭 가능 | BR 대시보드로 바로 이동 (새 탭) |
| G2 | 추출 실패 버그 수정 | `'submitted'` 문자열 → `null` 반환하여 모니터링 오류 방지 |
| G3 | 목록에서 Case ID 표시 | Reports 목록에서 케이스 ID 확인 + 링크 클릭 |
| G4 | CaseThread 새로고침 | 수동 Refresh 버튼으로 최신 메시지 확인 |

## 3. Scope

### 3.1 In Scope

| # | Item | Detail |
|---|------|--------|
| S1 | ReportDetail Case ID 링크 | Case ID → `brandregistry.amazon.com` 링크, `'submitted'`는 plain text |
| S2 | Crawler 반환값 수정 | `worker.ts`에서 `'submitted'` → `null` |
| S3 | Reports 목록 Case ID | 데스크톱 테이블 + 모바일 카드에 BR#{id} 링크 |
| S4 | CaseThread Refresh 버튼 | closed가 아닌 경우만 표시, 스피너 애니메이션 |

### 3.2 Out of Scope

- 자동 polling (수동 버튼으로 충분)
- DB에 기존 `'submitted'` 레코드 마이그레이션 (수동 정리)
- br_result API route 변경 (기존 null 처리 로직으로 충분)

## 4. Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| 기존 `br_case_id = 'submitted'` 레코드 | UI에서 링크 비활성화로 처리 | 코드에서 `'submitted'` 체크 유지 |
| Case ID URL 형식 변경 | 링크 404 | Amazon BR URL은 안정적, 변경 시 1곳만 수정 |

## 5. 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `crawler/src/br-submit/worker.ts` | `'submitted'` → `null` 반환 |
| `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` | Case ID → 클릭 가능 BR 대시보드 링크 |
| `src/app/(protected)/reports/ReportsContent.tsx` | 목록에 BR#{id} 링크 (데스크톱 + 모바일) |
| `src/components/features/case-thread/CaseThread.tsx` | Refresh 버튼 추가 |
