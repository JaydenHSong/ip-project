# R01: Awaiting Amazon / Action Required 상태 분리

> **중요도**: ★★★★★ (최우선)
> **난이도**: ★★☆☆☆ (낮음)
> **Phase**: 1
> **의존성**: R11 (모니터링 워커에서 상태 감지)
> **병렬 가능**: ✅ Web 타입 변경은 독립 작업 가능, 실제 자동 전환은 R11 완료 후

---

## 1. 문제

현재 `monitoring` 상태 하나로 모든 모니터링 케이스를 표현.
"아마존이 답장을 기다리는 건"과 "아마존이 우리에게 추가 정보를 요청한 건"을 구분할 수 없다.
오퍼레이터는 BR Dashboard에 직접 가서 확인해야 함.

## 2. 솔루션

### 2.1 상태 추가

`reports.br_case_status` 컬럼에 BR 측 상태를 저장:

| br_case_status | BR Dashboard 원본 | 의미 | 행동 필요 |
|----------------|-------------------|------|----------|
| `open` | (제출 직후) | 아마존이 아직 확인 안 함 | 대기 |
| `work_in_progress` | Work in progress | 아마존이 검토 중 | 대기 |
| `answered` | Answered | 아마존이 응답함 (정보 제공) | 대기 |
| `needs_attention` | Needs your attention | 아마존이 추가 정보 요청 | ⚠️ 즉시 행동 |
| `closed` | (케이스 종료) | 해결됨 또는 닫힘 | 없음 |

### 2.2 Sentinel 상태와 매핑

| br_case_status | Sentinel 표시 | 뱃지 색상 |
|----------------|--------------|----------|
| `open`, `work_in_progress`, `answered` | Awaiting Amazon | 파랑 |
| `needs_attention` | Action Required | 빨강 |
| `closed` | Case Closed | 회색 |

### 2.3 자동 전환 로직

```
모니터링 워커가 BR 스크래핑 시:
  if (br_case_status 변경됨)
    → reports.br_case_status 업데이트
    → br_case_events에 'br_status_changed' 기록
    → needs_attention이면 알림 트리거 (R6)
```

## 3. 구현 범위

### 3.1 DB
- `reports` 테이블에 `br_case_status TEXT` 컬럼 추가 (이미 Master Plan에 포함)

### 3.2 Types
- `src/types/reports.ts`에 `BrCaseStatus` 타입 추가
- `Report` 타입에 `br_case_status` 필드 추가

### 3.3 UI
- `StatusBadge.tsx`에 BR 케이스 상태 뱃지 추가 (또는 별도 `BrCaseStatusBadge`)
- Report Detail에 BR 케이스 상태 표시 영역 추가
- Reports 리스트에 BR 케이스 상태 컬럼/필터 추가

### 3.4 API
- `GET /api/reports` 쿼리에 `br_case_status` 필터 추가
- `/api/crawler/br-monitor-result`에서 `br_case_status` 업데이트

## 4. 작업량 추정

| 항목 | 예상 |
|------|------|
| DB 마이그레이션 | 10분 |
| Types 수정 | 15분 |
| StatusBadge 추가 | 20분 |
| Report Detail UI | 30분 |
| Reports 필터 | 20분 |
| API 수정 | 20분 |
| **합계** | **~2시간** |
