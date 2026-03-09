# SESSION-BRIEF: BRCM Unit D — Thread View + Activity Log

## Status: DONE
## Assigned Session: 2026-03-08
## Completed At: 2026-03-08

---

## 개요

R03(대화 스레드 뷰 + 내부 메모) + R05(활동 로그) UI + API 구현.
케이스 관리의 핵심 UX — 모든 대화와 이벤트를 한 곳에서.

## 예상 시간: 9.5시간

## 의존성: Unit A (DB), Unit B (메시지 데이터)

---

## 작업 목록

### 1. R03: 대화 스레드 뷰

#### API
- `GET /api/reports/[id]/case-thread` — 메시지 + 노트 + 이벤트 통합 조회
  - 시간순 정렬
  - 타입: `message | note | event`
- `POST /api/reports/[id]/case-notes` — 내부 메모 작성
- `PATCH /api/reports/[id]/case-notes/[noteId]` — 메모 수정
- `DELETE /api/reports/[id]/case-notes/[noteId]` — 메모 삭제

#### UI 컴포넌트
- `src/components/features/case-thread/CaseThread.tsx` — 메인 타임라인 컨테이너
- `src/components/features/case-thread/CaseMessage.tsx` — 메시지 (inbound 왼쪽/outbound 오른쪽)
- `src/components/features/case-thread/CaseNote.tsx` — 내부 메모 (노랑 배경, 🔒)
- `src/components/features/case-thread/CaseEvent.tsx` — 시스템 이벤트 (회색, 한 줄)
- `src/components/features/case-thread/AddNoteForm.tsx` — 메모 입력 폼

#### 시각 구분
- Inbound (아마존→우리): 왼쪽 정렬, 흰색 배경, 📥
- Outbound (우리→아마존): 오른쪽 정렬, 파랑 배경, 📤
- Internal Note: 전체 폭, 노랑 배경, 점선 테두리, 🔒
- System Event: 중앙, 회색 텍스트, 한 줄

#### Report Detail 통합
- Report Detail에 "Case Thread" 탭/섹션 추가

### 2. R05: 활동 로그

#### API
- `GET /api/reports/[id]/case-events` — 이벤트 목록 (시간 역순)

#### UI 컴포넌트
- `src/components/features/case-thread/CaseActivityLog.tsx` — 수직 타임라인
- `src/components/features/case-thread/CaseEventItem.tsx` — 개별 이벤트
- Thread 뷰와 같은 탭에 토글로 배치 ("Thread" / "Activity Log")

---

## 완료 기준

- [ ] 아마존 메시지가 스레드 뷰에 시간순 표시
- [ ] 내부 메모 CRUD 동작
- [ ] 활동 로그에 이벤트 타임라인 표시
- [ ] 메시지 타입별 시각 구분 명확
- [ ] `pnpm typecheck && pnpm lint` 통과

## 변경 파일 목록 (완료 후 기록)

### 신규 파일 — API
- `src/app/api/reports/[id]/case-thread/route.ts` — 통합 타임라인 (메시지+노트+이벤트)
- `src/app/api/reports/[id]/case-notes/route.ts` — 내부 메모 생성
- `src/app/api/reports/[id]/case-notes/[noteId]/route.ts` — 메모 수정/삭제
- `src/app/api/reports/[id]/case-events/route.ts` — 이벤트 목록

### 신규 파일 — UI
- `src/components/features/case-thread/CaseThread.tsx` — 메인 타임라인 컨테이너
- `src/components/features/case-thread/CaseMessage.tsx` — 메시지 (inbound/outbound)
- `src/components/features/case-thread/CaseNote.tsx` — 내부 메모 (CRUD)
- `src/components/features/case-thread/CaseEvent.tsx` — 시스템 이벤트 구분선
- `src/components/features/case-thread/AddNoteForm.tsx` — 메모 입력 폼
- `src/components/features/case-thread/CaseActivityLog.tsx` — 활동 로그 타임라인

### 수정 파일
- `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` — CaseThread, CaseActivityLog 탭 통합
