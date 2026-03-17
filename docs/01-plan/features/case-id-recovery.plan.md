# Case ID Recovery — Plan

> **Feature**: BR 제출 후 case_id 누락 시 자동 복구 + 수동 fallback
> **Created**: 2026-03-17
> **Updated**: 2026-03-18 (매칭 전략 간소화 — Subject = draft_title)
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
- 제출 후 리다이렉트 타이밍 이슈 (페이지 로드 완료 전 추출)
- 대시보드에서 최신 케이스가 아직 반영 안 된 시점에 추출 시도

---

## 2. 해결 방향

### 2.1 Subject에 ASIN 강제 포함 (예방)

BR 제출 시 Subject에 ASIN을 강제로 붙여서 매칭을 쉽게 만듦.

- **Before**: `Color variation - Different product`
- **After**: `Color variation - Different product [B0FLTCWBN3]`

수정: `buildBrSubmitData`에서 subject 생성 시 `[{ASIN}]` suffix 추가.
이러면 대시보드 검색창에서도 ASIN 검색 가능.

### 2.2 자동 복구 (Monitor 사이클)

BR Monitor가 돌 때 case_id가 null인 건 감지 → BR 대시보드에서 **Subject 내 ASIN** 매칭으로 case_id 복구.

**매칭 로직 (간소화):**
1. 대시보드에서 최근 케이스 목록 스크래핑
2. 각 행의 Subject에서 ASIN 포함 여부 확인 (새 건) 또는 draft_title 비교 (기존 건)
3. 일치하는 케이스의 case_id를 연결
4. 동일 매칭 여러 건 → 제출 시간(br_submitted_at)과 가장 가까운 것 선택
5. 이미 다른 리포트에 매칭된 case_id는 제외

**왜 이게 되나?**: 대시보드 Subject = 우리가 제출한 draft_title 그대로 표시됨 (스크린샷 확인 2026-03-18). ASIN suffix 추가 후 매칭 정확도 100%.

**재시도 횟수:**
- `br_case_id_retry_count` 컬럼 추가
- 최대 3회 시도
- 3회 실패 → `br_case_status = 'case_id_missing'` 마킹

### 2.3 수동 입력 (3회 실패 후)

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
  → case_id null + retry < 3 인 리포트 조회 (draft_title 포함)
  → BR 대시보드 접속 (이미 로그인된 세션)
  → 케이스 목록에서 Subject = draft_title 매칭
  → 매칭 성공: case_id 업데이트
  → 매칭 실패: retry_count + 1
  → 3회 도달: br_case_status = 'case_id_missing' + 관리자 알림
  → 정상 모니터링 계속
```

### 3.2 수동 입력 UI

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
| `crawler/src/br-monitor/case-id-recovery.ts` | Subject 매칭 로직 (신규 파일) |
| `crawler/src/br-monitor/worker.ts` | Monitor 시작 시 복구 Phase 0 추가 |
| `src/app/api/crawler/br-case-id-missing/route.ts` | 복구 대상 조회 API (신규) |
| `src/app/api/crawler/br-case-id-recovery/route.ts` | 복구 결과 보고 API (신규) |
| `src/app/api/reports/[id]/case-id/route.ts` | 수동 입력 API (신규) |
| `ReportDetailContent.tsx` | case_id 수동 입력 UI (조건부) |

### 유지 (변경 없음)
- BR 제출 플로우 (기존 case_id 추출 로직 유지)
- Monitor 정상 플로우

---

## 6. 마일스톤

| Phase | 내용 |
|:--|:--|
| **S1** | DB 마이그레이션 (retry_count 컬럼) |
| **S2** | 복구 대상 조회 + 결과 보고 API (2개) |
| **S3** | Crawler: Subject 매칭 로직 + Monitor Phase 0 |
| **S4** | 수동 입력 UI + API |
| **S5** | Railway 배포 + 기존 null 건 복구 확인 |

---

## 7. Resolved Questions

1. ~~대시보드 케이스 목록에서 ASIN이 텍스트로 보이는지~~ → ASIN 불필요. Subject = draft_title 매칭으로 충분 (스크린샷 확인)
2. 기존 null 건 (3/13 6건 + 3/16 1건) → 자동 복구 배포 후 다음 Monitor 사이클에서 처리
3. `case_id_missing` → Report Detail에 수동 입력 UI로 표시
