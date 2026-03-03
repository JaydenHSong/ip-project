# Notifications System Analysis Report

> **Analysis Type**: Gap Analysis (Plan vs Implementation)
>
> **Project**: Sentinel
> **Version**: v0.1.0
> **Analyst**: Claude (gap-detector)
> **Date**: 2026-03-03
> **Plan Doc**: [notifications.plan.md](../01-plan/features/notifications.plan.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Notifications Plan 문서(4 Step)와 실제 구현 코드 간의 일치율을 측정하고 Gap을 식별한다.

### 1.2 Analysis Scope

- **Plan Document**: `docs/01-plan/features/notifications.plan.md`
- **Implementation Files**:
  - `supabase/migrations/010_notifications_sc_types.sql`
  - `src/lib/notifications.ts`
  - `src/components/layout/NotificationBell.tsx`
  - `src/components/layout/Header.tsx`
  - `src/app/api/monitoring/callback/route.ts`
  - `src/app/api/patents/sync/route.ts`
  - `src/app/api/reports/[id]/confirm-submitted/route.ts`
- **Analysis Date**: 2026-03-03

---

## 2. Gap Analysis (Plan Step vs Implementation)

### 2.1 Step 1: DB Migration

| Plan Item | Implementation | Status | Notes |
|-----------|---------------|--------|-------|
| CHECK constraint에 `sc_submit_success` 추가 | `010_notifications_sc_types.sql` L11 | **Match** | 정확히 추가됨 |
| CHECK constraint에 `sc_submit_failed` 추가 | `010_notifications_sc_types.sql` L11 | **Match** | 정확히 추가됨 |
| 기존 constraint DROP 후 재생성 | `010_notifications_sc_types.sql` L4-12 | **Match** | `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` 패턴 |

**Step 1 Score: 3/3 (100%)**

---

### 2.2 Step 2: NotificationBell 실 연동

| Plan Item | Implementation | Status | Notes |
|-----------|---------------|--------|-------|
| 데모 모드: DEMO_NOTIFICATIONS 유지 | `NotificationBell.tsx` L19-38, L51-54 | **Match** | `isDemoMode()` 체크 후 DEMO_NOTIFICATIONS 사용 |
| 실 모드: Supabase에서 notifications 조회 | `NotificationBell.tsx` L56-66 | **Match** | `supabase.from('notifications').select('*').eq('user_id', userId)` |
| user_id = 현재 Admin 조건 | `NotificationBell.tsx` L60 | **Match** | `.eq('user_id', userId)` — userId는 Header에서 전달 |
| "읽음 처리" -> is_read = true 업데이트 | `NotificationBell.tsx` L85-96 | **Match** | 낙관적 UI 업데이트 + Supabase `.update({ is_read: true })` |
| Admin 아니면 NotificationBell 미렌더링 | `Header.tsx` L145 | **Match** | `{user.role === 'admin' && <NotificationBell userId={user.id} />}` |

**Step 2 Score: 5/5 (100%)**

---

### 2.3 Step 3: Alarm Generation Logic (API route insert)

| Plan Item | Implementation | Status | Notes |
|-----------|---------------|--------|-------|
| `/api/monitoring/callback` -> `followup_change_detected` | `callback/route.ts` L99-106 | **Match** | `changeDetected` 시 `notifyAdmins({ type: 'followup_change_detected' })` 호출 |
| change_detected && approve 필요한 건 조건 | `callback/route.ts` L99 | **Match** | `if (changeDetected)` 조건 내에서 호출 |
| `/api/patents/sync` POST -> `patent_sync_completed` | `sync/route.ts` L77-82 | **Match** | 동기화 완료 후 `notifyAdmins({ type: 'patent_sync_completed' })` 호출. 동기화 요약 포함 |
| `/api/reports/[id]/confirm-submitted` -> `sc_submit_success` | `confirm-submitted/route.ts` L91-100 | **Match** | `isSuccess` 조건에 따라 `sc_submit_success` / `sc_submit_failed` 분기 |
| SC 제출 실패 시 -> `sc_submit_failed` | `confirm-submitted/route.ts` L92-94 | **Match** | `body.auto_submit_success === false` 일 때 `sc_submit_failed` |
| 에러 핸들러 -> `system_error` | -- | **Missing** | `notifyAdmins({ type: 'system_error' })` 호출이 어떤 API route에도 없음. 타입만 정의되어 있음 |

**Step 3 Score: 5/6 (83%)**

---

### 2.4 Step 4: Alarm Target

| Plan Item | Implementation | Status | Notes |
|-----------|---------------|--------|-------|
| 모든 Admin 사용자에게 동일 알림 전송 | `notifications.ts` L21-48 | **Match** | `notifyAdmins` 함수가 전체 Admin에게 알림 전송 |
| users에서 role = admin 조회 | `notifications.ts` L27-29 | **Match** | `.eq('role', 'admin').eq('is_active', true)` |
| 각각 insert | `notifications.ts` L35-44 | **Match** | `admins.map()` 으로 각 Admin별 row 생성 후 bulk insert |

**Step 4 Score: 3/3 (100%)**

---

### 2.5 Out of Scope 확인

| Out of Scope Item | Implementation 확인 | Status | Notes |
|-------------------|---------------------|--------|-------|
| Supabase Realtime 구독 없음 | NotificationBell에 Realtime 코드 없음 | **Match** | 올바르게 제외됨 |
| 이메일/Google Chat 연동 없음 | 관련 코드 없음 | **Match** | 올바르게 제외됨 |
| Viewer/Editor 알림 없음 | Header에서 Admin만 렌더링 | **Match** | 올바르게 제외됨 |

**Out of Scope Compliance: 3/3 (100%)**

---

## 3. Code Quality Analysis

### 3.1 notifyAdmins Helper (`src/lib/notifications.ts`)

| Item | Assessment | Notes |
|------|-----------|-------|
| 타입 안전성 | Good | `NotificationType` 유니온 타입 정의 |
| 에러 격리 | Good | try-catch로 알림 실패가 메인 로직 중단 방지 |
| Export 방식 | Good | named export 사용 (CLAUDE.md 컨벤션 준수) |
| 추가 필드 `is_active` | Good | Plan에 없지만, 비활성 Admin 제외는 합리적 추가 |

### 3.2 NotificationBell (`src/components/layout/NotificationBell.tsx`)

| Item | Assessment | Notes |
|------|-----------|-------|
| 데모/실 모드 분기 | Good | `isDemoMode()` 로 깔끔하게 분기 |
| 낙관적 UI 업데이트 | Good | 읽음 처리 시 UI 먼저 업데이트 후 DB 반영 |
| 한번에 20개 제한 | Good | `.limit(20)` 으로 과다 조회 방지 |
| 드롭다운 외부 클릭 닫기 | Good | `handleClickOutside` 구현 |
| "Mark all read" i18n 누락 | Minor Issue | L133에 하드코딩 "Mark all read", "No notifications" (L140) |

### 3.3 API Routes 알림 호출

| Route | 평가 | Notes |
|-------|------|-------|
| `monitoring/callback` | Good | 변화 감지 시에만 알림 (불필요한 알림 방지) |
| `patents/sync` | Good | 동기화 요약 정보를 metadata에 포함 |
| `confirm-submitted` | Good | 성공/실패 분기 정확. `auto_submit` 체크로 수동/자동 구분 |

---

## 4. Convention Compliance

### 4.1 Naming Convention

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| 타입명 | PascalCase | 100% | -- |
| 함수명 | camelCase | 100% | -- |
| 상수명 | UPPER_SNAKE_CASE | 100% | `DEMO_NOTIFICATIONS` |
| 파일명 (컴포넌트) | PascalCase | 100% | `NotificationBell.tsx`, `Header.tsx` |
| 파일명 (유틸) | camelCase | 100% | `notifications.ts` |

### 4.2 Import Order

| File | External -> Internal -> Relative -> Type | Status |
|------|------------------------------------------|--------|
| `notifications.ts` | `@/lib/supabase/admin` (내부 1개만) | OK |
| `NotificationBell.tsx` | react -> lucide -> @/lib -> @/lib | OK |
| `Header.tsx` | react -> next -> lucide -> @/ -> ./ | OK |
| `callback/route.ts` | next -> @/lib -> @/lib -> type import | OK |
| `sync/route.ts` | next -> @/lib -> @/lib -> @/lib | OK |
| `confirm-submitted/route.ts` | next -> @/lib -> @/lib | OK |

### 4.3 Other Conventions

| Rule | Status | Notes |
|------|--------|-------|
| `type` 사용 (`interface` 자제) | OK | 모든 파일에서 `type` 사용 |
| `enum` 금지 | OK | 문자열 리터럴 유니온 사용 |
| arrow function 컴포넌트 | OK | `NotificationBell`, `Header` 모두 arrow |
| `any` 금지 | OK | `unknown` 사용 |
| named export | OK | 모든 파일 named export |
| console.log 없음 | OK | 디버깅 코드 없음 |

**Convention Score: 100%**

---

## 5. Match Rate Summary

### 5.1 Step별 점수

| Step | Plan Items | Match | Missing | Score |
|------|:----------:|:-----:|:-------:|:-----:|
| Step 1: DB Migration | 3 | 3 | 0 | 100% |
| Step 2: NotificationBell | 5 | 5 | 0 | 100% |
| Step 3: Alarm Generation | 6 | 5 | 1 | 83% |
| Step 4: Alarm Target | 3 | 3 | 0 | 100% |
| Out of Scope | 3 | 3 | 0 | 100% |

### 5.2 Overall Score

```
+---------------------------------------------+
|  Overall Match Rate: 95%                     |
+---------------------------------------------+
|  Match:              19 / 20 items (95%)     |
|  Missing:             1 / 20 items  (5%)     |
|  Added (Not in Plan): 1 item                 |
+---------------------------------------------+
|  Convention Compliance: 100%                 |
+---------------------------------------------+
```

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 95% | PASS |
| Architecture Compliance | 100% | PASS |
| Convention Compliance | 100% | PASS |
| **Overall** | **95%** | **PASS** |

---

## 6. Differences Found

### 6.1 Missing Features (Plan O, Implementation X)

| # | Item | Plan Location | Description | Severity |
|---|------|---------------|-------------|----------|
| 1 | `system_error` 알림 호출 | Plan Step 3 (L34) | "에러 핸들러 -> system_error" 로 명시되어 있으나, 어떤 API route에서도 `notifyAdmins({ type: 'system_error' })` 를 호출하지 않음. 타입만 정의되어 있음 (`src/lib/notifications.ts` L12) | Medium |

### 6.2 Added Features (Plan X, Implementation O)

| # | Item | Implementation Location | Description |
|---|------|------------------------|-------------|
| 1 | `is_active` 필터 | `src/lib/notifications.ts` L30 | Plan에는 `role = 'admin'` 조회만 명시했으나, 구현에서는 `.eq('is_active', true)` 추가. 비활성 Admin 제외는 합리적 추가 |

### 6.3 Minor Issues (Plan과 무관하나 품질 개선 가능)

| # | Item | Location | Description |
|---|------|----------|-------------|
| 1 | i18n 하드코딩 문자열 | `NotificationBell.tsx` L133, L140 | "Mark all read", "No notifications" 문자열이 하드코딩. `t()` 함수 사용 필요 |
| 2 | 에러 무시 | `notifications.ts` L45-47 | empty catch block. 최소한 로깅 또는 모니터링 연동 고려 |

---

## 7. Recommended Actions

### 7.1 Immediate Action (Gap 해소)

| Priority | Item | Location | Action |
|----------|------|----------|--------|
| 1 | `system_error` 알림 구현 | API route의 catch 블록 | 주요 API route(`/api/ai/analyze`, `/api/monitoring/callback` 등)의 에러 핸들러에 `notifyAdmins({ type: 'system_error' })` 추가. 또는 전역 에러 핸들러/미들웨어에서 일괄 처리 |

### 7.2 Quality Improvement (Optional)

| Priority | Item | Location | Action |
|----------|------|----------|--------|
| 1 | i18n 하드코딩 해소 | `NotificationBell.tsx` L133, L140 | `t('notifications.markAllRead')`, `t('notifications.empty')` 키 추가 후 적용 |
| 2 | 에러 로깅 추가 | `notifications.ts` L45-47 | empty catch에 최소한 `console.error` 또는 외부 로깅 서비스 연동 (단, CLAUDE.md에서 console.log 금지이므로 별도 logger 필요) |

### 7.3 Plan 문서 업데이트

| Item | Description |
|------|-------------|
| `is_active` 필터 반영 | Step 4에 "is_active = true인 Admin만 대상" 추가 권장 |

---

## 8. Conclusion

Notifications 기능은 Plan 대비 **95% 일치율**로 구현되었다. 4개 Step 중 Step 1, 2, 4는 100% 구현 완료이며, Step 3에서 `system_error` 알림 호출만 미구현 상태이다. 이 항목은 현재 에러 핸들러가 글로벌하게 정의되지 않은 상태이므로, 향후 에러 핸들링 체계 구축 시 함께 구현하는 것이 적절하다.

Convention 준수율은 100%이며, 코드 품질도 양호하다.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-03 | Initial gap analysis (Plan vs Implementation) | Claude (gap-detector) |
