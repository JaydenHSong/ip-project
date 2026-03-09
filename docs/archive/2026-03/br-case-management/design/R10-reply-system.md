# R10: 양방향 답장 시스템

> **중요도**: ★★★★★ (최우선)
> **난이도**: ★★★★☆ (높음)
> **Phase**: 2
> **의존성**: R3 (스레드 뷰), R11 (모니터링 인프라)
> **병렬 가능**: ✅ Crawler Reply Worker는 독립 개발 가능

---

## 1. 문제

아마존이 추가 정보를 요청하면 BR Dashboard에 직접 가서 답장해야 함.
Sentinel에서 답장 작성 → 자동 전송까지 해결하면 원스톱 처리 가능.

## 2. 솔루션

### 2.1 답장 작성 (Sentinel Web)

Report Detail의 Case Thread 하단 "Reply to Amazon" 버튼:

```
┌─────────────────────────────────────────────────┐
│ Reply to Amazon                          📎 x3  │
│                                                  │
│ ┌──────────────────────────────────────────────┐│
│ │                                              ││
│ │ 텍스트 입력...                               ││
│ │                                              ││
│ └──────────────────────────────────────────────┘│
│                                                  │
│ 📎 Attached files:                               │
│   - evidence_screenshot.png (1.2MB)              │
│   - asin_list.csv (0.3MB)                        │
│   [+ Add file]                                   │
│                                                  │
│ ⚠️ 발송 후 취소 불가                             │
│                                                  │
│ [Cancel]  [🤖 AI Draft]  [Send Reply]           │
└─────────────────────────────────────────────────┘
```

### 2.2 발송 플로우

```
1. 사용자가 텍스트 입력 + 파일 첨부
2. "Send Reply" 클릭
3. Web:
   - reports.br_reply_pending_text에 텍스트 저장
   - 파일 → Supabase Storage 업로드
   - reports.br_reply_pending_attachments에 [{name, storage_path, size}] 저장
   - reports.status 유지 (monitoring), 발송 대기 표시
4. Crawler (br-reply 큐):
   - br-reply-pending API 폴링 → 대상 발견
   - BR Case Detail 페이지 접속 (caseID로)
   - Reply 버튼 클릭 (kat-button)
   - kat-textarea에 텍스트 입력 (nativeInputValueSetter)
   - 파일 첨부:
     a. Supabase Storage에서 파일 다운로드 → /tmp/
     b. 파일 input에 setInputFiles() (또는 드래그 영역에 업로드)
   - kat-button[label="Send"] 클릭
   - 결과:
     성공 → br-reply-result API 호출 (pending 필드 클리어, 메시지 기록)
     실패 → 에러 기록, 재시도 가능
```

### 2.3 BR 페이지 파일 첨부 분석

탐색 결과:
- 포맷: PPT, ODT, ODS, BMP, TSV, RTF, TIF, PPTX, GIF, DOC, MSG, WEBP, XLSX, PNG, PDF, JPG, XML, ZIP, CSV, DOCX, TXT, XLS, RAR, XLSM
- 제한: **6파일**, 합계 **10MB**
- 방식: `input[type="file"]` 또는 드래그/드롭 영역 (추가 탐색 필요)

### 2.4 케이스 닫기

```
"Close this case" 버튼 → Crawler가 BR에서 실행
→ reports.br_case_status = 'closed'
→ reports.status = 'resolved'
→ br_case_events에 기록
```

## 3. 구현 범위

### 3.1 DB
- `reports.br_reply_pending_text TEXT`
- `reports.br_reply_pending_attachments JSONB`

### 3.2 Web API
- `POST /api/reports/[id]/case-reply` — 답장 등록 (pending 상태로)
  - Body: `{ text, attachments: [{name, storage_path, size}] }`
- `POST /api/reports/[id]/case-close` — 케이스 닫기 요청
- `GET /api/crawler/br-reply-pending` — 발송 대기 목록 (Crawler용)
- `POST /api/crawler/br-reply-result` — 발송 결과 콜백

### 3.3 Crawler
- `crawler/src/br-reply/worker.ts` — Reply 자동화 워커
  - `openCaseDetail(caseId)` — 케이스 페이지 이동
  - `clickReply()` — Reply 버튼 클릭
  - `fillReplyText(text)` — textarea 입력
  - `attachFiles(files)` — 파일 첨부
  - `clickSend()` — Send 버튼 클릭
- `crawler/src/br-reply/queue.ts` — BullMQ 큐
- `crawler/src/br-reply/scheduler.ts` — 2분 폴링

### 3.4 UI
- `ReplyForm.tsx` — 답장 입력 폼 (텍스트 + 파일 업로드)
- `CaseCloseButton.tsx` — 케이스 닫기 버튼 + 확인 모달
- R3 Thread View 하단에 배치

## 4. 작업량 추정

| 항목 | 예상 |
|------|------|
| DB 마이그레이션 | 10분 |
| Web API (4개) | 2시간 |
| ReplyForm UI + 파일 업로드 | 2시간 |
| CaseCloseButton | 30분 |
| Crawler Reply Worker | 3시간 |
| Crawler Queue + Scheduler | 30분 |
| 파일 첨부 로직 (Storage→BR) | 1.5시간 |
| Sentinel Client 메서드 추가 | 30분 |
| **합계** | **~10시간** |
