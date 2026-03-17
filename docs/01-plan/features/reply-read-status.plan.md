# Reply Read Status — Plan

> **Feature**: 아마존 답변 읽음/안 읽음 상태 관리
> **Created**: 2026-03-18
> **Phase**: Plan
> **Priority**: Medium
> **Related**: Report Queue UX — "New Reply" 워딩 문제

---

## 1. Background

### 현재 상황
- Report Queue에 "New Reply 14"로 표시
- `br_case_status = 'answered'`인 건 전부 카운트
- 관리자가 봤든 안 봤든 구분 없음 → "New"가 부정확

### 문제
- 관리자가 이미 확인한 답변도 "New"로 표시됨
- 실제 미확인 답변이 몇 건인지 알 수 없음
- 확인했지만 아직 액션 안 한 건도 구분 안 됨

---

## 2. 해결 방향

### 2.1 읽음 상태 추적

관리자가 Report Detail을 열면 "읽음" 처리 → 진짜 New만 카운트.

### 2.2 상태 분류

| 상태 | 조건 | Queue 라벨 |
|:--|:--|:--|
| 안 읽음 | answered + read_at IS NULL | **New Reply** |
| 읽었지만 미처리 | answered + read_at IS NOT NULL | **Pending Action** (선택) |
| 처리 완료 | 관리자가 Reply 보내거나 Close | 카운트 제외 |

---

## 3. DB 변경

```sql
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS br_reply_read_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN reports.br_reply_read_at
  IS '관리자가 아마존 답변을 마지막으로 읽은 시점';
```

### 읽음 판단 로직
- `br_reply_read_at IS NULL` → 한번도 안 읽음
- `br_reply_read_at < br_last_amazon_reply_at` → 새 답변 도착 (읽은 이후 새 답변)
- `br_reply_read_at >= br_last_amazon_reply_at` → 최신 답변 확인 완료

---

## 4. 기능 상세

### 4.1 자동 읽음 처리

**트리거**: Report Detail 페이지 로드 시

```
GET /api/reports/{id} 호출 시
  → br_case_status = 'answered' && br_last_amazon_reply_at 존재
  → br_reply_read_at = now() 업데이트
```

### 4.2 Queue 카운트 변경

```sql
-- New Reply (진짜 안 읽은 것만)
WHERE status = 'monitoring'
  AND br_case_status = 'answered'
  AND (br_reply_read_at IS NULL
       OR br_reply_read_at < br_last_amazon_reply_at)
```

### 4.3 UI 변경

| 위치 | 변경 |
|:--|:--|
| BrCaseQueueBar | "New Reply" 카운트를 미읽음 기준으로 변경 |
| Report 목록 | 미읽음 건에 볼드/도트 표시 (선택) |
| "Total: 29 monitoring" | "Total: 29 cases"로 워딩 변경 |

---

## 5. 영향 범위

| 파일 | 변경 |
|:--|:--|
| Supabase SQL | `br_reply_read_at` 컬럼 추가 |
| `/api/reports/[id]/route.ts` | GET 시 읽음 처리 (answered일 때) |
| `/api/dashboard/br-case-summary/route.ts` | 카운트 쿼리 변경 |
| `BrCaseQueueBar.tsx` | "Total: N cases" 워딩 변경 |

---

## 6. 마일스톤

| Step | 내용 |
|:--|:--|
| **S1** | DB 마이그레이션 (br_reply_read_at) |
| **S2** | Report Detail GET 시 읽음 처리 |
| **S3** | br-case-summary 카운트 쿼리 수정 |
| **S4** | BrCaseQueueBar 워딩 변경 |
