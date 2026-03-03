# Notifications System — PDCA Plan

## Overview
Admin 전용 알림 시스템. 현재 데모 하드코딩 → Supabase 실 연동으로 전환.

## Scope
**대상 사용자**: Admin만 (노티벨 자체를 Admin에게만 표시)

### 알림 유형 (4가지)

| Type | DB type 값 | 트리거 시점 | 현재 DB 상태 |
|------|-----------|-----------|-------------|
| 팔로업 모니터링 | `followup_change_detected` | 모니터링에서 변화 감지 + Approve 필요할 때 | ✅ 이미 있음 |
| Monday.com 동기화 | `patent_sync_completed` | /api/patents/sync 완료 시 | ✅ 이미 있음 |
| SC 제출 결과 | `sc_submit_success` / `sc_submit_failed` | SC 제출 확인/실패 시 | ❌ 추가 필요 |
| 시스템 에러 | `system_error` | API 에러, 크롤러 오류 등 | ✅ 이미 있음 |

## Implementation Steps

### Step 1: DB 마이그레이션
- `notifications` 테이블 CHECK constraint에 `sc_submit_success`, `sc_submit_failed` 추가

### Step 2: NotificationBell 실 연동
- 데모 모드: 기존 DEMO_NOTIFICATIONS 유지
- 실 모드: Supabase에서 `notifications` 조회 (user_id = 현재 Admin)
- "읽음 처리" → `is_read = true` 업데이트
- Admin이 아니면 NotificationBell 자체를 렌더링하지 않음

### Step 3: 알림 생성 로직 (API route에서 insert)
- `/api/monitoring/callback` → `followup_change_detected` (change_detected && approve 필요한 건)
- `/api/patents/sync` POST → `patent_sync_completed` (동기화 요약)
- `/api/reports/[id]/confirm-submitted` → `sc_submit_success`
- SC 제출 실패 시 → `sc_submit_failed`
- 에러 핸들러 → `system_error`

### Step 4: 알림 대상 결정
- 모든 Admin 사용자에게 동일 알림 전송
- `users` 테이블에서 `role = 'admin'` 조회 → 각각 insert

## Dependencies
- Supabase 실 연동 (DEMO_MODE=false) 이 되어야 실 테스트 가능
- 현재 DEMO_MODE=true 상태에서는 데모 데이터로만 동작

## Out of Scope
- 실시간 Supabase Realtime 구독 (Phase 2)
- 이메일/Google Chat 알림 연동 (별도 기능)
- Viewer/Editor 알림 (Admin 전용이므로)
