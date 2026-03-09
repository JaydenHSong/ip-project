# R08: AI 응답 분석 + 다음 행동 제안

> **중요도**: ★★★☆☆ (중간)
> **난이도**: ★★★★☆ (높음)
> **Phase**: 3
> **의존성**: R3 (대화 스레드 데이터), R11 (메시지 수집)
> **병렬 가능**: ⚠️ Phase 3, R3 완료 후

---

## 1. 문제

아마존 답장이 오면 오퍼레이터가 직접 읽고 판단해야 함:
- 이게 추가 정보 요청인지, 거부인지, 해결인지?
- 다음에 뭘 해야 하는지? 답장? 증거 추가? 재제출?
- 답장을 어떻게 써야 하는지?

## 2. 솔루션 (Zendesk Agent Copilot 참조)

### 2.1 자동 분류

아마존 답장 수신 시 Claude Haiku로 즉시 분류:

| 분류 | 설명 | 자동 액션 |
|------|------|----------|
| `info_requested` | 추가 정보/증거 요청 | br_case_status → needs_attention |
| `resolved` | 조치 완료 (리스팅 삭제/수정) | 리스팅 재확인 스케줄링 |
| `rejected` | 신고 거부 | 에스컬레이션 제안 |
| `in_progress` | 검토 중 안내 | SLA 타이머 유지 |
| `clarification` | 아마존이 질문 | 답장 제안 생성 |
| `template_response` | 일반 자동 응답 | 재시도 제안 |

### 2.2 다음 행동 제안

```
┌──────────────────────────────────────────────┐
│ 🤖 AI Analysis                                │
│                                               │
│ Classification: Info Requested               │
│ Confidence: 92%                               │
│                                               │
│ Amazon is requesting:                         │
│ • Specific child ASINs to remove              │
│ • Parent ASIN reference                       │
│ • Reason for removal                          │
│                                               │
│ Suggested next action:                        │
│ 📝 Reply with ASIN details                   │
│                                               │
│ [📝 Draft Reply]  [⏭️ Skip]  [👎 Wrong]     │
└──────────────────────────────────────────────┘
```

### 2.3 답장 초안 자동 생성

"Draft Reply" 클릭 시 Claude Sonnet으로 답장 초안 생성:
- 아마존 요청 사항에 맞춘 답변 구조
- 기존 리포트 데이터 (ASIN, 위반 유형, 증거) 자동 삽입
- 영어 작성

## 3. 구현 범위

### 3.1 API
- `POST /api/ai/case-analyze` — 아마존 답장 분류
  - Input: message body
  - Output: classification, confidence, summary, suggested_action
- `POST /api/ai/case-draft-reply` — 답장 초안 생성
  - Input: report context + amazon messages + action type
  - Output: draft reply text

### 3.2 AI 프롬프트
- `src/lib/ai/prompts/case-classify.ts` — 분류 프롬프트 (Haiku)
- `src/lib/ai/prompts/case-reply-draft.ts` — 답장 초안 프롬프트 (Sonnet)

### 3.3 UI
- `AiCaseAnalysis.tsx` — 분석 결과 카드
- R3 스레드 뷰 상단에 배치
- "Draft Reply" → R10 답장 폼에 텍스트 자동 삽입

### 3.4 자동화
- 모니터링 워커에서 새 아마존 메시지 감지 시 자동 분류 실행
- 결과를 `br_case_events`에 기록

## 4. 작업량 추정

| 항목 | 예상 |
|------|------|
| AI 프롬프트 설계/테스트 | 3시간 |
| API 엔드포인트 (2개) | 2시간 |
| AiCaseAnalysis UI | 1.5시간 |
| 모니터링 워커 연동 | 1시간 |
| **합계** | **~7.5시간** |
