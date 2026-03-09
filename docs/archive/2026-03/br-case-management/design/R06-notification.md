# R06: 알림/에스컬레이션 규칙

> **중요도**: ★★★★☆ (높음)
> **난이도**: ★★★☆☆ (중간)
> **Phase**: 3
> **의존성**: R1 (상태), R2 (SLA), R5 (이벤트 로그)
> **병렬 가능**: ⚠️ Phase 3이므로 Phase 1~2 완료 후 시작

---

## 1. 문제

아마존이 답장해도, SLA가 위반돼도, 긴급 케이스가 발생해도 알림이 없음.
오퍼레이터가 직접 Sentinel을 열어서 확인해야만 함.

## 2. 솔루션 (Zendesk Automations + Salesforce Milestone Actions 참조)

### 2.1 알림 트리거

| 트리거 | 조건 | 대상 | 채널 |
|--------|------|------|------|
| Amazon Replied | 새 inbound 메시지 감지 | 케이스 담당 editor | In-app + Email |
| Action Required | `br_case_status → needs_attention` | 케이스 담당 editor + admin | In-app + Email |
| SLA Warning | 경고 임계 도달 | 케이스 담당 editor | In-app |
| SLA Breached | 기한 초과 | admin | In-app + Email |
| Stale Case | 7일 이상 아마존 미응답 | admin | In-app |
| Case Closed | 케이스 종료 | 케이스 담당 editor | In-app |

### 2.2 에스컬레이션 규칙

```
SLA 경고 → editor에게 알림
SLA 위반 → admin에게 에스컬레이션
14일 미해결 → 자동 강화 재제출 제안 (AI, R8 연동)
3회 재제출 실패 → admin 수동 검토 요청
```

### 2.3 알림 채널

Phase 3 초기: **In-app 알림만** (벨 아이콘 + 알림 패널)
추후 확장: Email, Slack webhook

## 3. 구현 범위

### 3.1 DB
```sql
CREATE TABLE notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL,
  condition JSONB DEFAULT '{}',
  target_role TEXT NOT NULL, -- 'editor', 'admin', 'owner'
  channel TEXT NOT NULL DEFAULT 'in_app', -- 'in_app', 'email', 'slack'
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  report_id UUID REFERENCES reports(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
```

### 3.2 API
- `GET /api/notifications` — 사용자 알림 목록
- `PATCH /api/notifications/[id]` — 읽음 처리
- `POST /api/notifications/mark-all-read`
- `GET /api/settings/notification-rules` — 규칙 조회
- `PATCH /api/settings/notification-rules` — 규칙 수정

### 3.3 UI
- Header에 벨 아이콘 + 미읽음 카운트 뱃지
- 알림 드롭다운 패널
- Settings > Notification Rules 관리 페이지

## 4. 작업량 추정

| 항목 | 예상 |
|------|------|
| DB 마이그레이션 | 15분 |
| 알림 생성 로직 | 2시간 |
| API 엔드포인트 (5개) | 2시간 |
| 헤더 벨 아이콘 + 패널 | 2시간 |
| Settings 규칙 페이지 | 1.5시간 |
| **합계** | **~8시간** |
