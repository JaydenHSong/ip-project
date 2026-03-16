# Scraper Self-Healing — Plan

> **Summary**: BR Monitor 스크래퍼 데이터 품질 자가 검증 + 이상 감지 + 자동 복구
>
> **Project**: Sentinel (ip-project)
> **Version**: 0.9.0-beta
> **Date**: 2026-03-16
> **Status**: Draft

---

## 1. 문제 정의

현재 BR Monitor는 스크래핑 결과를 **무검증으로 DB에 저장**한다. 발생했던 문제들:

| 문제 | 원인 | 피해 | 사전 감지 가능? |
|------|------|------|:---:|
| 로그인 페이지 HTML이 메시지로 저장 | 세션 만료 중 스크래핑 | 28건 쓰레기 데이터 | ✅ |
| 매 사이클 동일 메시지 중복 저장 | date 파싱 실패 → 현재 시각 fallback | 22건 중복 | ✅ |
| sender+date가 body에 합쳐짐 | CSS 셀렉터 불일치 | 82건 깨진 메시지 | ✅ |
| 아마존 DOM 구조 변경 | 셀렉터 기반 스크래핑의 본질적 한계 | 전체 데이터 품질 저하 | ✅ (AI) |

**핵심**: 모든 문제는 사용자가 직접 눈으로 발견. 시스템이 자체적으로 인지하지 못함.

---

## 2. 목표

1. **저장 전 검증** — 쓰레기 데이터가 DB에 들어가지 않도록
2. **이상 패턴 감지** — 중복, 급증, 전체 실패 등 패턴 감지
3. **자동 대응** — 감지 시 자동 중단 + 알림 (사람 개입 최소화)
4. **자가 개선** — 셀렉터 변경 등 구조적 문제 자동 감지

---

## 3. 아키텍처

```
스크래핑 → [검증 레이어] → 정상 → DB 저장
                ↓
           이상 감지 → 버림 + Google Chat 알림
                ↓
           패턴 감지 → 사이클 중단 + 긴급 알림
```

### 3.1 Layer 1: 규칙 기반 검증 (토큰 0)

저장 직전, `br-monitor-result` API에서 메시지별 검증:

| 규칙 | 조건 | 액션 |
|------|------|------|
| 로그인 페이지 감지 | body에 "Password", "Forgot password", "Sign in" 포함 | 거부 |
| 이메일 sender | sender에 `@` 포함 (Amazon/You가 아닌 경우) | 거부 |
| 너무 짧은 body | body < 20자 | 거부 |
| 너무 긴 body | body > 50,000자 (페이지 전체 텍스트) | 거부 |
| HTML 태그 포함 | body에 `<div>`, `<input>`, `<form>` 등 | 거부 |
| sender 검증 | sender가 "Amazon" 또는 "You"가 아닌 경우 | 경고 |

### 3.2 Layer 2: 패턴 기반 이상 감지 (토큰 0)

사이클 단위로 결과를 분석:

| 패턴 | 조건 | 액션 |
|------|------|------|
| 전체 "new messages" | 전 케이스에서 new messages 발생 (100%) | 사이클 결과 전체 폐기 + 알림 |
| 메시지 급증 | 한 사이클에 10개 이상 신규 메시지 | 경고 알림 |
| 연속 실패 | 3사이클 연속 전체 new messages | 자동 중단 + 긴급 알림 |
| 중복 body | 동일 report_id에 동일 body 존재 | 저장 거부 |

### 3.3 Layer 3: AI 검증 (Haiku, 선택적)

규칙으로 못 잡는 경우:

| 상황 | AI 역할 | 비용 |
|------|---------|------|
| 메시지가 실제 BR 답변인지 | Haiku 분류 (yes/no) | ~$0.001/건 |
| 셀렉터 변경 감지 | 스크래핑 결과 구조가 이전과 다른지 | ~$0.002/건 |
| 아마존 답변 의미 분류 | resolved/추가조치필요/거부 등 | ~$0.003/건 |

Layer 3는 **Phase 2**로 분리. Phase 1은 Layer 1+2만 구현.

---

## 4. Scope

### 4.1 Phase 1: 규칙 기반 (이번 구현)

- [ ] `validateMessage()` 함수 — Layer 1 규칙 적용
- [ ] `detectAnomalies()` 함수 — Layer 2 패턴 감지
- [ ] `br-monitor-result` API에 검증 레이어 적용
- [ ] 거부된 메시지 로깅 (왜 거부됐는지)
- [ ] 이상 감지 시 Google Chat 알림
- [ ] 크롤러 측: `processSingleCase`에서 결과 검증 후 전송

### 4.2 Phase 2: AI 검증 (나중)

- [ ] Haiku 분류기 통합
- [ ] 셀렉터 자동 감지 + 자가 복구
- [ ] 아마존 답변 자동 분류

### 4.3 Out of Scope

- CSS 셀렉터 자동 업데이트 (DOM 변경 시) — 별도 태스크
- 스크래핑 자체의 대안 (BR API가 있다면)

---

## 5. 구현 위치

### 5.1 크롤러 측 (1차 방어)

**`crawler/src/br-monitor/worker.ts`**

```typescript
// processSingleCase 내에서 스크래핑 결과 검증
const detail = await scrapeCaseDetail(page, target.brCaseId)

// 검증: 로그인 페이지, HTML, 이상한 sender 등
const validated = validateScrapedMessages(detail.messages)
if (validated.rejected.length > 0) {
  log('warn', 'br-monitor', `${validated.rejected.length} messages rejected`, validated.reasons)
}

// 검증 통과한 메시지만 전송
const newMessages = detectNewMessages(validated.accepted, target.lastScrapedAt)
```

### 5.2 API 측 (2차 방어)

**`src/app/api/crawler/br-monitor-result/route.ts`**

```typescript
// 메시지 저장 전 중복 체크
const existingBodies = await supabase
  .from('br_case_messages')
  .select('body')
  .eq('report_id', body.report_id)

const deduplicated = body.new_messages.filter(
  msg => !existingBodies.some(e => e.body === msg.body)
)
```

### 5.3 사이클 레벨 감지

**`crawler/src/br-monitor/worker.ts` — processBrMonitorJob 끝부분**

```typescript
// 사이클 완료 후 이상 패턴 체크
if (newMessageCount === totalCases) {
  // 모든 케이스에서 new messages → 의심
  log('error', 'br-monitor', 'ANOMALY: all cases reported new messages')
  await notifyOperator('🚨 모든 케이스에서 new messages 감지 — date 파싱 이상 가능성')
}
```

---

## 6. 파일 변경 목록

| # | 파일 | Action | 내용 |
|---|------|--------|------|
| 1 | `crawler/src/br-monitor/validate.ts` | NEW | validateMessage, validateCycle 함수 |
| 2 | `crawler/src/br-monitor/worker.ts` | MODIFY | 검증 레이어 호출 추가 |
| 3 | `src/app/api/crawler/br-monitor-result/route.ts` | MODIFY | 중복 body 체크 추가 |
| 4 | 테스트 | 선택 | 검증 규칙 단위 테스트 |

---

## 7. Success Criteria

- [ ] 로그인 페이지 HTML이 DB에 저장되지 않음
- [ ] 동일 body 메시지가 중복 저장되지 않음
- [ ] 전체 케이스 "new messages" 패턴 발생 시 자동 알림
- [ ] 거부된 메시지에 대한 로그 + 알림
- [ ] 기존 정상 메시지 저장에 영향 없음
- [ ] `pnpm typecheck` 통과

---

## 8. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 정상 메시지를 거부 (false positive) | 메시지 누락 | 규칙을 보수적으로 설정 + 경고 로그로 모니터링 |
| 검증 로직이 스크래핑 속도 저하 | 사이클 시간 증가 | 검증은 문자열 비교만, 성능 영향 미미 |
| 중복 체크 DB 쿼리 추가 | API 응답 시간 | report_id 인덱스 활용, 영향 미미 |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-03-16 | Initial draft |
