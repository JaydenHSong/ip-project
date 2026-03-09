# SESSION-BRIEF: BRCM Unit A — DB 스키마 + Types

## Status: DONE
## Assigned Session: 2026-03-08 Claude Opus
## Completed At: 2026-03-08

---

## 개요

BR Case Management 전체 기능에 필요한 DB 스키마와 TypeScript 타입을 선행 구축.
다른 모든 Unit의 의존성이므로 최우선 완료 필요.

## 예상 시간: 3시간

---

## 작업 목록

### 1. DB 마이그레이션 (`supabase/migrations/025_br_case_management.sql`)

```sql
-- 1) reports 테이블 확장
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_case_status TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_last_amazon_reply_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_last_our_reply_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_sla_deadline_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_reply_pending_text TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS br_reply_pending_attachments JSONB;

-- 2) br_case_messages 테이블
-- 3) br_case_notes 테이블
-- 4) br_case_events 테이블
-- 5) br_sla_configs 테이블
-- 6) notifications, notification_rules 테이블
```

상세 DDL은 `docs/01-plan/features/br-case-management.plan.md` Section 3 참조.

### 2. TypeScript 타입 (`src/types/`)

- `src/types/reports.ts` 확장:
  - `BrCaseStatus` 타입
  - `Report` 타입에 br_* 필드 추가
- `src/types/br-case.ts` 신규:
  - `BrCaseMessage`
  - `BrCaseNote`
  - `BrCaseEvent`
  - `BrCaseEventType`
  - `BrSlaCon fig`
  - `Notification`
  - `NotificationRule`

### 3. 헬퍼 함수

- `src/lib/br-case/events.ts` — `insertCaseEvent()` 공용 함수
- `src/lib/br-case/sla.ts` — `calculateSlaDeadline()`, `getSlaStatus()` 함수

### 4. StatusBadge 확장

- `src/components/ui/StatusBadge.tsx`에 `BrCaseStatus` 뱃지 추가
- `src/constants/chart-colors.ts`에 BR 케이스 상태 색상 추가

---

## 완료 기준

- [ ] Supabase SQL Editor에서 마이그레이션 실행 완료
- [x] `pnpm typecheck` 통과
- [x] StatusBadge에 BR 케이스 상태 렌더링 확인

## 변경 파일 목록 (완료 후 기록)

- `supabase/migrations/025_br_case_management.sql` — DB 마이그레이션 (신규)
- `src/types/br-case.ts` — BR 케이스 타입 정의 (신규)
- `src/types/reports.ts` — Report 타입에 br_* 필드 추가
- `src/lib/br-case/events.ts` — insertCaseEvent() 헬퍼 (신규)
- `src/lib/br-case/sla.ts` — SLA 계산 헬퍼 (신규)
- `src/components/ui/StatusBadge.tsx` — BrCaseStatus 뱃지 추가
- `src/constants/chart-colors.ts` — BR 케이스/SLA 색상 추가
