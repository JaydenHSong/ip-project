# Report Decline 기능

> 오퍼레이터의 잘못된 신고 요청을 관리자가 사유와 함께 거절하고, 오퍼레이터에게 자동 알림을 제공하는 기능

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | 오퍼레이터가 Extension으로 잘못 신고한 건에 대해 관리자가 피드백을 남길 방법이 없음. 오퍼레이터는 왜 처리가 안 됐는지 모름 |
| Solution | Report Detail에 Decline 버튼 + 사유 입력 모달. Completed Reports에 Declined 상태 노출. 담당자 로그인 시 인앱 알림 |
| UX Effect | 관리자: 한 번의 클릭+사유로 잘못된 건 처리. 오퍼레이터: 로그인 시 팝업으로 거절 사유 즉시 확인 |
| Core Value | 관리자↔오퍼레이터 간 비동기 피드백 채널. 신고 품질 점진적 개선 |

## Context Anchor

| 항목 | 내용 |
|------|------|
| WHY | 잘못된 신고 건에 대한 피드백 루프가 없어 오퍼레이터 학습 불가 |
| WHO | 관리자(admin/owner) → Decline 실행, 오퍼레이터(editor) → 사유 확인 |
| RISK | 기존 cancelled 상태 재활용 시 기존 Cancel과 Decline 구분 필요 |
| SUCCESS | Decline+사유 저장 → Completed Reports 이동 → 담당자 로그인 시 알림 |
| SCOPE | 단방향 피드백만 (양방향 회신은 향후 확장) |

---

## 1. 배경

- 오퍼레이터가 Chrome Extension으로 위반 신고를 요청하면 `draft` 상태로 생성됨
- 간혹 잘못된 신고가 들어오지만, 관리자가 "왜 안 되는지" 알려줄 방법이 없음
- 현재는 Delete로 삭제하거나 방치 → 오퍼레이터는 피드백을 받지 못함

## 2. 기존 인프라 (재활용)

| 항목 | 현재 상태 | 비고 |
|------|-----------|------|
| DB 컬럼 | `cancelled_by`, `cancelled_at`, `cancellation_reason` | reports 테이블에 이미 존재 |
| API | `POST /api/reports/[id]/cancel` | draft/pending_review/approved → cancelled, reason 저장 |
| 상태값 | `cancelled` in REPORT_STATUSES | 타입 정의 완료 |
| StatusBadge | cancelled → "Cancelled" 라벨 | 라벨만 "Declined"으로 변경 |
| Completed Reports | resolved/unresolved/archived 표시 | cancelled 추가 필요 |

## 3. 요구사항

### 3.1 기능 요구사항

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| FR-01 | Report Detail (draft 상태)에 Decline 버튼 표시 | Must |
| FR-02 | Decline 클릭 시 사유 입력 모달 (필수 입력) | Must |
| FR-03 | Decline 후 status=cancelled, Completed Reports로 이동 | Must |
| FR-04 | StatusBadge에서 cancelled → "Declined" 라벨 + warning variant | Must |
| FR-05 | Completed Reports에 "Declined" 탭 추가 | Must |
| FR-06 | Declined 건 상세에서 사유/거절자/일시 표시 | Must |
| FR-07 | 담당자 로그인 시 새 Declined 건 인앱 알림 (본인 건만) | Must |
| FR-08 | 알림 확인 후 다시 안 뜨도록 (읽음 처리) | Must |

### 3.2 비기능 요구사항

| ID | 요구사항 |
|----|----------|
| NFR-01 | Decline 권한: admin, owner만 |
| NFR-02 | 사유는 빈 문자열 불가 (최소 1자) |
| NFR-03 | 기존 Cancel API 재활용 (새 엔드포인트 불필요) |

## 4. 변경 범위

### 4.1 프론트엔드

| # | 파일 | 변경 |
|---|------|------|
| D1 | `components/ui/StatusBadge.tsx` | cancelled 라벨 "Cancelled"→"Declined", variant "default"→"warning" |
| D2 | `app/(protected)/ip/reports/[id]/ReportActions.tsx` | draft 상태에서 Decline 버튼 + 사유 입력 모달 추가 |
| D3 | `app/(protected)/ip/reports/[id]/ReportDetailContent.tsx` | cancelled 상태일 때 Decline 사유 표시 영역 (거절자, 일시, 사유) |
| D4 | `app/(protected)/ip/reports/completed/CompletedReportsContent.tsx` | STATUS_TABS에 Declined 탭 추가 |
| D5 | `lib/queries/completed-reports.ts` | cancelled 상태 쿼리 추가 |
| D6 | 인앱 알림 컴포넌트 (새로 생성) | 로그인 시 본인 Declined 건 체크 + 토스트 표시 |

### 4.2 백엔드

| # | 파일 | 변경 |
|---|------|------|
| D7 | `app/api/reports/[id]/cancel/route.ts` | 변경 없음 (이미 동작) |
| D8 | `app/api/reports/declined-notifications/route.ts` (신규) | 본인 건 중 새 Declined 건 조회 API |

### 4.3 DB

| # | 변경 | 비고 |
|---|------|------|
| - | 없음 | 기존 cancelled_by/cancelled_at/cancellation_reason 재활용 |
| D9 | `report_read_status` 테이블 활용 또는 `user_preferences`에 `last_decline_check_at` 저장 | 읽음 처리용 |

## 5. 상세 설계

### 5.1 Decline 버튼 (ReportActions)

```
조건: status === 'draft' && isAdmin
위치: Delete 버튼 옆 (또는 위)
스타일: variant="outline", warning 색상
```

### 5.2 Decline 모달

```
제목: "Decline Report"
본문: "이 신고를 거절하시겠습니까? 사유를 입력해 주세요."
입력: Textarea (필수, placeholder: "거절 사유를 입력하세요")
버튼: [Cancel] [Decline] (Decline은 사유 입력 시에만 활성화)
API: POST /api/reports/{id}/cancel { cancellation_reason: "..." }
성공 시: Completed Reports로 이동
```

### 5.3 Decline 사유 표시 (ReportDetailContent)

```
조건: status === 'cancelled' && cancellation_reason
위치: 상단 알림 영역 (rejected_reason 표시와 유사)
표시: "Declined by {이름} on {날짜}"
       "{사유 텍스트}"
스타일: warning 배경 카드
```

### 5.4 인앱 알림

```
트리거: 페이지 진입 시 (layout 또는 대시보드)
API: GET /api/reports/declined-notifications
쿼리: reports WHERE created_by = 현재유저 AND status = 'cancelled' AND cancelled_at > 마지막확인시점
응답: { count: N, reports: [{ id, report_number, cancellation_reason, cancelled_at }] }
UI: 토스트 "N건의 신고가 Declined 되었습니다" + 클릭 시 해당 건으로 이동
읽음 처리: 토스트 닫기 또는 클릭 시 last_decline_check_at 업데이트
```

## 6. 성공 기준

| # | 기준 | 검증 방법 |
|---|------|-----------|
| SC-01 | 관리자가 draft 신고에 사유와 함께 Decline 가능 | Decline 버튼 → 모달 → API 호출 → cancelled 상태 전환 |
| SC-02 | Declined 건이 Completed Reports에 표시 | Declined 탭에서 해당 건 확인 |
| SC-03 | 오퍼레이터가 Decline 사유를 Report Detail에서 확인 가능 | cancelled 상태 건 열기 → 사유 영역 표시 |
| SC-04 | 오퍼레이터 로그인 시 새 Declined 건 알림 | 알림 토스트 팝업 → 클릭 → 해당 건 이동 |
| SC-05 | 한 번 확인한 알림은 다시 안 뜸 | 읽음 처리 후 재로그인 시 미표시 |

## 7. 향후 확장 (Out of Scope)

- 양방향 피드백: 오퍼레이터가 Decline 사유에 회신 → 관리자가 재오픈
- Decline 카테고리: "잘못된 ASIN", "중복 신고", "증거 부족" 등 사전 정의 사유
- Decline 통계: 오퍼레이터별 Decline 비율 대시보드

---

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-02 | Initial draft | Jayden + Claude |
