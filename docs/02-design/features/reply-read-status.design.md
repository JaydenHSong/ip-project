# Reply Read Status — Design

## Executive Summary

| Item | Detail |
|:--|:--|
| **Feature** | Reply Read Status |
| **Plan** | `docs/01-plan/features/reply-read-status.plan.md` |
| **Created** | 2026-03-18 |

### Value Delivered

| Perspective | Detail |
|:--|:--|
| **Problem** | "New Reply 14" — 관리자가 이미 본 답변도 New로 표시, 진짜 미확인 건 파악 불가 |
| **Solution** | br_reply_read_at 컬럼 + 상세 페이지 열면 자동 읽음 처리 |
| **Function UX Effect** | Queue에 진짜 안 읽은 건만 "New Reply"로 표시, 워딩 개선 |
| **Core Value** | 관리자가 진짜 긴급한 미확인 답변을 바로 파악 |

---

## 1. DB Schema

```sql
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS br_reply_read_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN reports.br_reply_read_at
  IS '관리자가 아마존 답변을 마지막으로 읽은 시점';
```

### 미읽음 판단 조건

```sql
-- "New Reply" = 아마존 답변이 있고, 아직 안 읽었거나 읽은 후 새 답변이 왔을 때
br_last_amazon_reply_at IS NOT NULL
AND br_last_amazon_reply_at > COALESCE(br_last_our_reply_at, '1970-01-01')
AND (br_reply_read_at IS NULL OR br_reply_read_at < br_last_amazon_reply_at)
```

---

## 2. 자동 읽음 처리

### 위치: `GET /api/reports/[id]/route.ts`

Report Detail 조회 시, 아마존 답변이 있는 모니터링 건이면 읽음 처리.

```typescript
// 조회 후, 응답 전에 비동기로 읽음 처리 (응답 지연 없음)
if (data.status === 'monitoring' && data.br_last_amazon_reply_at) {
  supabase
    .from('reports')
    .update({ br_reply_read_at: new Date().toISOString() })
    .eq('id', id)
    .then(() => {})  // fire-and-forget
}
```

**포인트**:
- 응답 반환 후 비동기 업데이트 → 사용자 체감 지연 없음
- 모든 역할이 읽음 처리 가능 (viewer도)
- 아마존 답변이 없는 건은 처리 안 함

---

## 3. Queue 카운트 변경

### 위치: `GET /api/dashboard/br-case-summary/route.ts`

현재 `new_reply` 카운트:
```typescript
// 현재: 아마존 답변이 우리 답변보다 최신이면 카운트
if (amazonReply > ourReply) newReply++
```

변경 후:
```typescript
// 변경: 위 조건 + 읽지 않은 경우만 카운트
const readAt = r.br_reply_read_at ? new Date(r.br_reply_read_at).getTime() : 0
if (amazonReply > ourReply && amazonReply > readAt) newReply++
```

**select에 `br_reply_read_at` 추가 필요.**

---

## 4. UI 변경

### 4.1 BrCaseQueueBar 워딩

```
// Before
Total: {summary.total} monitoring

// After
Total: {summary.total} cases
```

### 4.2 리포트 목록 — 미읽음 표시 (선택)

Report Queue 테이블에서 미읽음 건에 파란 도트 표시:
- 조건: `br_last_amazon_reply_at > br_reply_read_at` (또는 read_at null)
- UI: 리포트 번호 왼쪽에 작은 파란 점 (`w-2 h-2 rounded-full bg-blue-500`)

→ 이건 S4 단계에서 간단히 추가. 없어도 기능은 완전.

---

## 5. 구현 순서

| Step | 파일 | 설명 |
|:--|:--|:--|
| **S1** | Supabase SQL | `br_reply_read_at` 컬럼 추가 |
| **S2** | `src/app/api/reports/[id]/route.ts` | GET 시 읽음 처리 (fire-and-forget) |
| **S3** | `src/app/api/dashboard/br-case-summary/route.ts` | new_reply 카운트에 read_at 조건 추가 |
| **S4** | `src/components/features/BrCaseQueueBar.tsx` | "Total: N cases" 워딩 |

---

## 6. 엣지 케이스

| 상황 | 처리 |
|:--|:--|
| 관리자 A가 읽고, 관리자 B가 안 읽은 경우 | 마지막 읽은 사람 기준 (1개 컬럼이라 공유) |
| 아마존이 여러 번 답변한 경우 | br_last_amazon_reply_at만 보므로 최신 답변 기준 |
| 읽음 처리 후 바로 새 답변 도착 | br_last_amazon_reply_at > br_reply_read_at → 다시 New |
| SlidePanel에서 열었을 때 | API 호출하면 읽음 처리됨 (동일 엔드포인트) |
