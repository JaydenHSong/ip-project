# R03: 대화 스레드 뷰 + 내부 메모

> **중요도**: ★★★★★ (최우선)
> **난이도**: ★★★★☆ (높음)
> **Phase**: 2
> **의존성**: R11 (메시지 데이터 수집)
> **병렬 가능**: ✅ UI 컴포넌트는 목 데이터로 독립 개발 가능

---

## 1. 문제

BR 케이스의 아마존 답장을 보려면 BR Dashboard에 직접 방문해야 함.
팀 내부 논의(이 케이스 어떻게 대응할지)를 남길 곳이 없음.
케이스 진행 과정의 맥락이 흩어져 있음.

## 2. 솔루션 (Front/Zendesk 참조)

### 2.1 통합 타임라인

Report Detail 하단에 대화 스레드를 시간순으로 표시:

```
┌─────────────────────────────────────────────────┐
│ Case Thread                               🔒 + │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─ 📤 Mar 6, 10:41 AM ─── You ─────────────┐  │
│  │ What do you need help with?                │  │
│  │ [첨부: screenshot.png]                     │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌─ 📥 Mar 6, 12:27 PM ─── Amazon (Arnel) ──┐  │
│  │ To assist you further, I need:             │  │
│  │ - The specific child ASINs...              │  │
│  │ - The parent ASIN...                       │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌─ 🔒 Mar 6, 1:00 PM ─── Internal Note ────┐  │
│  │ @yina 이 케이스 ASIN 정보 추가해서         │  │
│  │ 답장해야 할 것 같아요                       │  │
│  │                         — hoon (Editor)    │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌─ 📥 Mar 6, 4:35 PM ─── Amazon ───────────┐  │
│  │ This is a reminder to let you know that    │  │
│  │ we need more information...                │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
├─────────────────────────────────────────────────┤
│ 💬 Add internal note    📝 Reply to Amazon     │
└─────────────────────────────────────────────────┘
```

### 2.2 메시지 타입별 시각 구분

| 타입 | 배경색 | 아이콘 | 정렬 |
|------|--------|--------|------|
| Outbound (우리→아마존) | 파랑 배경 | 📤 | 오른쪽 |
| Inbound (아마존→우리) | 흰색 배경 | 📥 | 왼쪽 |
| Internal Note | 노랑 배경 + 🔒 | 🔒 | 전체 폭, 점선 테두리 |
| System Event | 회색 텍스트 | ⚡ | 중앙, 한 줄 |

### 2.3 내부 메모 기능

- 팀원만 볼 수 있는 메모 (아마존에 전송되지 않음)
- @멘션 지원 (향후 알림 연동)
- 마크다운 지원
- 메모 수정/삭제 가능

## 3. 구현 범위

### 3.1 DB
- `br_case_messages` 테이블 (Master Plan 참조)
- `br_case_notes` 테이블 (Master Plan 참조)

### 3.2 API
- `GET /api/reports/[id]/case-thread` — 메시지 + 노트 + 이벤트 통합 조회 (시간순)
- `POST /api/reports/[id]/case-notes` — 내부 메모 작성
- `PATCH /api/reports/[id]/case-notes/[noteId]` — 메모 수정
- `DELETE /api/reports/[id]/case-notes/[noteId]` — 메모 삭제

### 3.3 UI 컴포넌트
- `CaseThread.tsx` — 메인 타임라인 컨테이너
- `CaseMessage.tsx` — 개별 메시지 (inbound/outbound)
- `CaseNote.tsx` — 내부 메모 (노랑 배경, 수정/삭제)
- `CaseEvent.tsx` — 시스템 이벤트 (상태 변경 등)
- `AddNoteForm.tsx` — 메모 입력 폼
- `ReplyForm.tsx` — 아마존 답장 폼 (R10과 연동)

### 3.4 위치
- Report Detail 페이지 하단에 새 탭 또는 섹션 추가
- 탭: "Case Thread" / "Evidence" / "History" 등

## 4. 작업량 추정

| 항목 | 예상 |
|------|------|
| DB 마이그레이션 | 15분 |
| API 엔드포인트 (4개) | 1.5시간 |
| CaseThread 컴포넌트 | 2시간 |
| CaseMessage 컴포넌트 | 1시간 |
| CaseNote + AddNoteForm | 1시간 |
| CaseEvent 컴포넌트 | 30분 |
| Report Detail 통합 | 1시간 |
| **합계** | **~7시간** |
