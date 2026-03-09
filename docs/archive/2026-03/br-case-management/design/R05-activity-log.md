# R05: 케이스 활동 로그 (Audit Trail)

> **중요도**: ★★★★☆ (높음)
> **난이도**: ★★☆☆☆ (낮음)
> **Phase**: 2
> **의존성**: R11 (이벤트 데이터 생성)
> **병렬 가능**: ✅ 테이블 + UI는 독립 개발, 이벤트 기록은 각 기능에서 삽입

---

## 1. 문제

케이스에 무슨 일이 일어났는지 추적할 수 없음.
"언제 아마존이 답했지?", "누가 이 케이스 상태 바꿨지?", "SLA 언제 위반됐지?" 등의 질문에 답할 수 없음.

## 2. 솔루션 (HubSpot History Tab 참조)

### 2.1 이벤트 타입

| 이벤트 | 설명 | actor |
|--------|------|-------|
| `br_submitted` | BR 케이스 제출 | system |
| `br_amazon_replied` | 아마존 새 답장 감지 | system |
| `br_reply_sent` | 우리 답장 발송 | user |
| `br_info_requested` | 아마존이 추가 정보 요청 | system |
| `br_status_changed` | BR 케이스 상태 변경 | system |
| `br_case_closed` | 케이스 종료 | user/system |
| `br_case_reopened` | 케이스 재오픈 | system |
| `br_escalated` | 에스컬레이션 | user |
| `br_sla_warning` | SLA 경고 임계 도달 | system |
| `br_sla_breached` | SLA 위반 | system |
| `br_note_added` | 내부 메모 추가 | user |
| `br_file_attached` | 파일 첨부 | user |

### 2.2 UI — 수직 타임라인

```
┌─────────────────────────────────────────┐
│ Activity Log                             │
├─────────────────────────────────────────┤
│ ● Mar 8, 2:30 PM — System               │
│   ⚠️ SLA Warning: 24h remaining         │
│                                          │
│ ● Mar 7, 6:27 AM — System               │
│   📥 Amazon replied (status → Answered)  │
│                                          │
│ ● Mar 6, 4:00 PM — hoon (Editor)        │
│   🔒 Note: 증거 추가 필요               │
│                                          │
│ ● Mar 6, 12:20 PM — System              │
│   📤 BR Case submitted (#19614678571)    │
│                                          │
│ ● Mar 6, 12:19 PM — System              │
│   ✅ Report approved → PD Reporting       │
└─────────────────────────────────────────┘
```

## 3. 구현 범위

### 3.1 DB
- `br_case_events` 테이블 (Master Plan 참조)

### 3.2 API
- `GET /api/reports/[id]/case-events` — 이벤트 목록 (시간 역순)
- 각 기능에서 이벤트 INSERT 추가 (R1, R3, R6, R10, R11에서 호출)

### 3.3 UI
- `CaseActivityLog.tsx` — 수직 타임라인
- `CaseEventItem.tsx` — 개별 이벤트 항목
- Report Detail "Case Thread" 탭 내 또는 별도 "Activity" 탭

### 3.4 헬퍼
- `src/lib/br-case/events.ts` — `insertCaseEvent()` 공용 함수

## 4. 작업량 추정

| 항목 | 예상 |
|------|------|
| DB 마이그레이션 | 10분 |
| events 헬퍼 함수 | 30분 |
| API 엔드포인트 | 30분 |
| CaseActivityLog UI | 1.5시간 |
| **합계** | **~2.5시간** |
