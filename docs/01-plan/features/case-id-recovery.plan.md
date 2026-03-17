# Case ID Recovery — Plan

> **Feature**: BR 제출 후 case_id 누락 시 자동 복구 + 수동 fallback
> **Created**: 2026-03-17
> **Phase**: Plan
> **Priority**: High
> **Related Issue**: "신고는 들어가는데 case id를 못가져옴 (3/16)"

---

## 1. Background

### 현재 상황
- BR 제출 후 case_id 추출: URL → 프레임 텍스트 → 대시보드 순서로 시도
- 간헐적 실패: 3/13에 6건, 3/16에 1건 (#27050) case_id가 null
- 3/17 제출 10건은 모두 정상 → 완전히 깨진 건 아니고 간헐적
- case_id가 null이면 Monitor가 추적 못함, BR# 링크 없음

### 원인 추정
- 아마존 BR 대시보드 일시적 구조 변경
- 제출 후 리다이렉트 타이밍 이슈 (페이지 로드 완료 전 추출)
- 대시보드에서 최신 케이스가 아직 반영 안 된 시점에 추출 시도

---

## 2. 해결 방향

### 2.1 자동 복구 (Monitor 사이클)

BR Monitor가 돌 때 case_id가 null인 건 감지 → BR 대시보드에서 ASIN 매칭으로 case_id 복구 시도.

**매칭 로직:**
1. 대시보드에서 최근 케이스 목록 가져오기
2. 리포트의 ASIN과 케이스의 ASIN 매칭
3. 제출 시간 ± 1시간 이내인 것만 매칭 (오매칭 방지)
4. 매칭 성공 → case_id 업데이트 + Monitor 대상에 추가

**재시도 횟수:**
- `br_case_id_retry_count` 컬럼 추가 (또는 기존 필드 활용)
- 최대 3회 시도
- 3회 실패 → `br_case_status = 'case_id_missing'` 마킹

### 2.2 수동 입력 (3회 실패 후)

Report Detail에 case_id 수동 입력 필드 노출.

**조건:** `status = 'monitoring'` AND `br_case_id IS NULL` AND 재시도 3회 이상
**UI:** 간단한 텍스트 입력 + 저장 버튼
**입력 시:** case_id 저장 + Monitor 대상에 자동 추가

---

## 3. 기능 상세

### 3.1 Monitor에 case_id 복구 로직 추가

**실행 시점:** Monitor 사이클 시작 시, 정상 모니터링 전에 실행

**플로우:**
```
Monitor 시작
  → case_id null + retry < 3 인 리포트 조회
  → BR 대시보드 접속 (이미 로그인된 세션)
  → 최근 케이스 목록에서 ASIN 매칭
  → 매칭 성공: case_id 업데이트
  → 매칭 실패: retry_count + 1
  → 3회 도달: br_case_status = 'case_id_missing'
  → 정상 모니터링 계속
```

### 3.2 대시보드 ASIN 매칭

BR 대시보드 케이스 목록에서 각 케이스를 열어 ASIN 확인하는 건 비용이 큼.
대안: 케이스 목록의 제목/설명에 ASIN이 포함되어 있는지 텍스트 매칭.

**매칭 전략:**
1. 대시보드에서 최근 50건 케이스 목록 로드
2. 각 케이스 행의 텍스트에서 리포트의 ASIN 검색
3. 시간 필터: 리포트의 br_submitted_at 기준 ±1시간
4. 매칭되면 해당 케이스의 caseID 추출

### 3.3 수동 입력 UI

```
┌─────────────────────────────────────────┐
│ ⚠️ Case ID를 자동으로 가져오지          │
│    못했습니다. 직접 입력해주세요.        │
│                                         │
│  Case ID: [________________] [저장]     │
│                                         │
│  BR Dashboard에서 확인:                 │
│  https://brandregistry.amazon.com/...   │
└─────────────────────────────────────────┘
```

---

## 4. DB 변경

```sql
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS br_case_id_retry_count integer DEFAULT 0;
```

`br_case_status` 신규 값: `case_id_missing` (자동 복구 포기 상태)

---

## 5. 영향 범위

### 수정 대상
| 파일/서비스 | 변경 내용 |
|:--|:--|
| `crawler/src/br-monitor/worker.ts` | Monitor 시작 시 case_id 복구 로직 추가 |
| `crawler/src/br-submit/worker.ts` | 제출 실패 시 retry_count 초기화 |
| `ReportDetailContent.tsx` | case_id 수동 입력 UI (조건부) |
| `/api/reports/[id]/route.ts` | case_id 수동 업데이트 API |

### 유지 (변경 없음)
- BR 제출 플로우 (기존 case_id 추출 로직 유지)
- Monitor 정상 플로우

---

## 6. 마일스톤

| Phase | 내용 |
|:--|:--|
| **P1** | DB 마이그레이션 (retry_count) |
| **P2** | Monitor에 case_id 복구 로직 추가 |
| **P3** | 수동 입력 UI + API |
| **P4** | 기존 null 건 수동/자동 복구 |

---

## 7. Open Questions

1. 대시보드 케이스 목록에서 ASIN이 텍스트로 보이는지 확인 필요 (스크린샷)
2. 기존 null 건 (3/13 6건 + 3/16 1건) — 관리자가 수동 입력할지, 자동 복구 배포 후 기다릴지
3. `case_id_missing` 상태를 UI에서 어떻게 표시할지 (별도 배지? 경고?)
