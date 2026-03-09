# SESSION-BRIEF: BRCM Unit E — Reply Worker (Crawler + Web)

## Status: DONE
## Assigned Session: 2026-03-08 Claude Opus
## Completed At: 2026-03-08

---

## 개요

R10(양방향 답장 시스템) 전체 구현.
Sentinel에서 답장 작성 → Crawler가 BR에 자동 전송 + 파일 첨부.

## 예상 시간: 10시간

## 의존성: Unit A (DB), Unit B (브라우저 인프라), Unit D (Thread View에 폼 배치)

---

## 작업 목록

### 1. Web API

#### `POST /api/reports/[id]/case-reply`
- 답장 텍스트 + 첨부파일 등록 (pending 상태)
- reports.br_reply_pending_text, br_reply_pending_attachments 저장

#### `POST /api/reports/[id]/case-close`
- 케이스 닫기 요청

#### `GET /api/crawler/br-reply-pending`
- Service Token 인증
- 발송 대기 중인 답장 목록 반환

#### `POST /api/crawler/br-reply-result`
- 발송 결과 콜백
- 성공: pending 필드 클리어, br_case_messages INSERT, br_case_events INSERT
- 실패: 에러 기록

### 2. Crawler 모듈

#### 파일 구조
```
crawler/src/br-reply/
  ├── types.ts        — BrReplyJobData, BrReplyResult
  ├── worker.ts       — Reply 자동화 워커
  ├── queue.ts        — BullMQ 큐
  └── scheduler.ts    — 2분 폴링
```

#### worker.ts 핵심 함수
- `openCaseDetail(page, caseId)` — 케이스 상세 페이지 이동
- `clickReplyButton(page)` — Reply kat-button 클릭
- `fillReplyText(page, text)` — kat-textarea에 텍스트 입력 (nativeInputValueSetter)
- `attachFiles(page, files)` — 파일 첨부
  - Supabase Storage에서 다운로드 → /tmp/에 저장
  - input[type="file"] 또는 드래그 영역에 setInputFiles()
- `clickSend(page)` — kat-button[label="Send"] 클릭
- `closeCaseAction(page)` — Close this case 실행

#### 파일 첨부 상세
- BR 제한: 6파일, 10MB 합계
- 포맷: PNG, JPG, PDF, DOC, ZIP 등
- Supabase Storage → Crawler tmp → BR 업로드
- 업로드 후 tmp 파일 정리

#### sentinel-client.ts 추가
- `getPendingBrReplies()`
- `reportBrReplyResult(data)`

### 3. Web UI

#### ReplyForm 컴포넌트
- `src/components/features/case-thread/ReplyForm.tsx`
- 텍스트 입력 (textarea)
- 파일 업로드 (Supabase Storage에 직접 업로드)
- "AI Draft" 버튼 (R08 연동, Phase 3)
- "Send Reply" 버튼 → `/api/reports/[id]/case-reply` 호출
- 발송 대기 상태 표시

#### CaseCloseButton 컴포넌트
- `src/components/features/case-thread/CaseCloseButton.tsx`
- 확인 모달 → `/api/reports/[id]/case-close` 호출

---

## 완료 기준

- [ ] Sentinel에서 답장 작성 → pending 상태로 저장
- [ ] Crawler가 pending 답장을 BR에 자동 전송
- [ ] 파일 첨부 동작 (Storage → BR)
- [ ] 전송 성공 시 br_case_messages에 outbound 메시지 저장
- [ ] 케이스 닫기 동작
- [ ] 에러 시 재시도 가능

## 변경 파일 목록 (완료 후 기록)

### Web API (신규 4개)
- `src/app/api/reports/[id]/case-reply/route.ts`
- `src/app/api/reports/[id]/case-close/route.ts`
- `src/app/api/crawler/br-reply-pending/route.ts`
- `src/app/api/crawler/br-reply-result/route.ts`

### Crawler 모듈 (신규 4개)
- `crawler/src/br-reply/types.ts`
- `crawler/src/br-reply/worker.ts`
- `crawler/src/br-reply/queue.ts`
- `crawler/src/br-reply/scheduler.ts`

### Web UI (신규 2개)
- `src/components/features/case-thread/ReplyForm.tsx`
- `src/components/features/case-thread/CaseCloseButton.tsx`

### 기존 파일 수정 (5개)
- `crawler/src/api/sentinel-client.ts` — getPendingBrReplies, reportBrReplyResult 추가
- `crawler/src/index.ts` — BR Reply 모듈 와이어링
- `crawler/src/br-monitor/worker.ts` — ensureMonitorBrowser, ensureLoggedIn export 추가
- `src/components/features/case-thread/CaseThread.tsx` — ReplyForm, CaseCloseButton 통합
- `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` — CaseThread props 확장 + br_reply_pending_text 타입 추가
