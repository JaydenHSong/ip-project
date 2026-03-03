# SC 완전 자동 신고 (F13b) Planning Document

> **Summary**: F13a(반자동) 안정화 후, Extension이 SC 폼 채우기 + 제출 버튼 클릭까지 자동 수행하는 완전 자동 파이프라인. 2단계로 Extension 자동 제출 → 서버 Playwright 배치 자동화 순서로 구현.
>
> **Project**: Sentinel
> **Version**: 0.1
> **Author**: Claude (AI)
> **Date**: 2026-03-03
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

F13a (반자동)에서는 Extension이 SC 폼을 채우고 사람이 Submit 클릭하는 구조다. F13b는 **Extension이 Submit까지 자동 클릭**하여 완전 자동화를 달성한다. 장기적으로는 서버 사이드 Playwright 배치 처리로 확장하여 사람 개입 없이 **승인 즉시 자동 신고**를 구현한다.

### 1.2 Background

- **F13a (반자동)**: 구현 완료 · Archived (97% match rate)
  - Extension이 SC RAV 페이지에서 폼 자동 채우기
  - 사람이 확인 후 Submit 클릭
  - 제출 완료 감지 → Sentinel API 콜백
- **D30**: F13을 단계적 구현 — 1차 반자동 → 안정화 후 완전 자동 전환
- **D39**: SC 케이스 오픈 공식 API 부재 확인 → 웹 UI 자동화가 유일한 방법
- **리스크 D30**: SC 계정 정지 리스크 → 반자동화(Fallback), 사람 승인 필수, 속도 제한

### 1.3 2단계 전략

| Phase | 방식 | 범위 | 리스크 |
|-------|------|------|--------|
| **Phase A** | Extension 자동 제출 | SC 로그인된 상태에서 Extension이 폼 채우기 + Submit 클릭 + 결과 감지 | 낮음 — 사용자 브라우저, 정상 행동 |
| **Phase B** | 서버 Playwright 배치 | 서버에서 SC 로그인 + 폼 채우기 + 제출 (대기열 기반 배치 처리) | 높음 — 2FA, 계정 감지, 자격증명 관리 |

> **Phase A만 이번 PDCA 범위**, Phase B는 법무 검토 + Phase A 안정화 후 별도 PDCA.

### 1.4 Related Documents

- `docs/archive/2026-03/sc-semi-auto-submit/` — F13a PDCA 아카이브 (Plan, Design, Analysis, Report)
- `extension/src/content/sc-form-filler.ts` — SC 폼 자동 채우기 메인 로직
- `extension/src/content/sc-selectors.ts` — SC DOM 셀렉터
- `extension/src/shared/sc-violation-map.ts` — V01~V19 → SC 매핑
- `src/app/api/reports/[id]/submit-sc/route.ts` — SC 제출 데이터 패키징
- `src/app/api/reports/[id]/confirm-submitted/route.ts` — Extension 제출 완료 콜백
- `src/app/api/reports/pending-sc-submit/route.ts` — Extension 대기 데이터 조회

---

## 2. Scope

### 2.1 In Scope (Phase A — Extension 자동 제출)

- [ ] FR-01: Extension 자동 제출 모드 — 폼 채우기 후 Submit 버튼 자동 클릭 (사용자 설정 ON/OFF)
- [ ] FR-02: 자동 제출 전 확인 단계 — 3초 카운트다운 + 취소 가능 오버레이
- [ ] FR-03: Submit 버튼 셀렉터 추가 — sc-selectors.ts에 Submit 버튼 셀렉터 (다중 fallback)
- [ ] FR-04: 제출 결과 감지 강화 — 성공/실패/에러 페이지 정확한 구분
- [ ] FR-05: 실패 시 자동 재시도 — 최대 2회 재시도, 실패 시 수동 모드 fallback
- [ ] FR-06: 속도 제한 — 연속 제출 간 30초~60초 랜덤 딜레이 (봇 탐지 방지)
- [ ] FR-07: Extension 설정 UI — 자동 제출 모드 ON/OFF 토글 (popup.html에 추가)
- [ ] FR-08: Web 설정 연동 — Settings 페이지에서 전체 자동 제출 ON/OFF (Admin 전용)
- [ ] FR-09: Web API — 자동 제출 성공/실패 로그 기록 (감사 로그 확장)
- [ ] FR-10: 배치 제출 대기열 — 여러 건 승인 시 순차 자동 제출 (Extension 내 큐)
- [ ] FR-11: i18n — 자동 제출 관련 메시지 EN/KO

### 2.2 Out of Scope

- Phase B 서버 Playwright 배치 자동화 (별도 PDCA)
- SC 자동 로그인 (Extension은 기존 브라우저 세션 활용)
- 다국가 SC 지원 (US만, UK/JP는 별도 확장)
- SC 이미지 증거 파일 업로드 자동화 (텍스트/URL만)
- SC 응답 자동 파싱 (케이스 상태 추적은 팔로업 모니터링 영역)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Extension 자동 제출 모드 — 폼 채우기 완료 후 Submit 버튼 자동 클릭 | High | Pending |
| FR-02 | 카운트다운 오버레이 — 3초 대기, "Cancel" 버튼으로 수동 모드 전환 가능 | High | Pending |
| FR-03 | SC Submit 버튼 셀렉터 — 다중 fallback (data-testid, type="submit", 텍스트 매칭) | High | Pending |
| FR-04 | 제출 결과 구분 — 성공(case ID), 실패(에러 메시지), 타임아웃 3가지 상태 | High | Pending |
| FR-05 | 자동 재시도 — 네트워크 오류/타임아웃 시 최대 2회, 같은 에러 시 수동 fallback | Medium | Pending |
| FR-06 | 봇 탐지 방지 — 연속 제출 30~60초 랜덤 딜레이, 사람 행동 모방 (마우스 이동, 스크롤) | High | Pending |
| FR-07 | Extension 팝업 설정 — 자동 제출 ON/OFF 토글, 딜레이 설정 (30/60/90초) | Medium | Pending |
| FR-08 | Web Settings — Admin이 전체 자동 제출 활성화/비활성화 설정 | Medium | Pending |
| FR-09 | 감사 로그 확장 — `sc_auto_submit_success`, `sc_auto_submit_failed` 액션 추가 | Medium | Pending |
| FR-10 | Extension 내부 큐 — 여러 건 대기 시 순차 처리, 진행 상태 배지 표시 | Low | Pending |
| FR-11 | i18n — 자동 제출 관련 토스트/설정/에러 메시지 EN/KO | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Security | 자동 제출 시에도 SC 자격증명 서버 저장 안 함 | 코드 리뷰 |
| Reliability | Submit 실패 시 100% 수동 fallback 경로 보장 | 시나리오 테스트 |
| Performance | 폼 채우기 → Submit 클릭까지 < 8초 | 수동 확인 |
| Anti-detection | 연속 제출 간 30초+ 랜덤 딜레이 | 로그 확인 |
| UX | 카운트다운 중 언제든 취소 가능, 수동 모드 즉시 전환 | 사용자 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] Extension 자동 제출 모드 ON: 폼 채우기 → 3초 카운트다운 → Submit 클릭 → 결과 감지 동작
- [ ] 자동 제출 모드 OFF: 기존 F13a 동작 유지 (폼만 채우고 사람이 Submit)
- [ ] 카운트다운 중 Cancel 클릭 → 수동 모드로 전환, Submit 안 됨
- [ ] Submit 실패 시 토스트 에러 + 수동 제출 안내
- [ ] 배치 큐: 3건 연속 제출 시 각 건 사이 30~60초 딜레이
- [ ] Web Settings에서 자동 제출 ON/OFF 설정 동작
- [ ] 감사 로그에 자동 제출 성공/실패 기록
- [ ] pnpm typecheck + pnpm build 통과
- [ ] E2E 기존 테스트 94개 통과

### 4.2 Quality Criteria

- [ ] 자동 제출이 활성화되어도 사람 승인(Approve) 단계는 건너뛰지 않음
- [ ] SC 자격증명이 서버/코드에 존재하지 않음
- [ ] 제출 실패 시 수동 fallback 경로 100% 보장
- [ ] 연속 제출 딜레이가 30초 미만인 경우 없음

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SC Submit 버튼 셀렉터 변경 | High | Medium | 다중 fallback 셀렉터, .crx 사내 배포 빠른 업데이트 |
| 자동 제출 감지 → 계정 경고 | High | Low | 사용자 브라우저에서 실행 (서버 아님), 랜덤 딜레이, 사람 행동 모방 |
| 네트워크 오류로 제출 실패 | Medium | Medium | 자동 재시도 2회, 실패 시 수동 fallback |
| 카운트다운 무시하고 잘못된 신고 제출 | Medium | Low | 카운트다운 기본 3초, Admin이 시간 조절 가능, 승인 단계 필수 |
| 여러 건 동시 제출 시 SC 속도 제한 | Medium | Medium | Extension 내부 큐 + 30~60초 랜덤 딜레이 |
| Extension 업데이트 배포 지연 | Low | Low | .crx 사내 배포 (Chrome 웹스토어 심사 없음) |

---

## 6. Architecture

### 6.1 자동 제출 흐름 (Phase A)

```
Sentinel Web (Admin)                     Extension (SC 페이지)
────────────────────                     ──────────────────────
[Approve] → status: approved
     ↓
[Submit to SC] 클릭
     ↓
POST /api/reports/:id/submit-sc
     ↓
sc_submit_data 저장 + sc_rav_url 반환
     ↓
window.open(sc_rav_url) ──────────→ SC RAV 페이지 열림
                                       ↓
                                    Extension 활성화
                                    GET /api/reports/pending-sc-submit
                                       ↓
                                    sc_submit_data 수신
                                       ↓
                                    폼 자동 채우기 (기존 F13a)
                                       ↓
                                    ┌─ 자동 제출 모드 ON? ──┐
                                    │   YES                 │ NO
                                    ↓                       ↓
                                 카운트다운 오버레이      토스트: "확인 후 Submit"
                                 "3초 후 자동 제출"       (기존 F13a 동작)
                                 [Cancel] 버튼
                                    ↓
                                 3초 경과 (취소 안 됨)
                                    ↓
                                 사람 행동 모방
                                 (마우스 이동 → 스크롤 → Submit 클릭)
                                    ↓
                                 제출 결과 감지
                                   ├─ 성공 → POST /confirm-submitted
                                   ├─ 실패 → 재시도 (max 2)
                                   └─ 타임아웃 → 수동 fallback 안내
                                    ↓
Sentinel Web                     Extension 큐 다음 건 처리
report.status → submitted          (30~60초 랜덤 대기)
sc_case_id 저장
```

### 6.2 Extension 큐 흐름 (배치 제출)

```
Extension 큐 (chrome.storage.local)
┌──────────────────────────────────┐
│ Queue: [rpt-003, rpt-007, rpt-012] │
│ Current: rpt-003 (processing)     │
│ Delay: 45s (random 30~60)         │
└──────────────────────────────────┘

rpt-003: 폼 채우기 → 카운트다운 → Submit → 성공
   ↓ (45초 대기)
rpt-007: 새 탭 → 폼 채우기 → 카운트다운 → Submit → 성공
   ↓ (38초 대기)
rpt-012: 새 탭 → 폼 채우기 → 카운트다운 → Submit → 실패 → 재시도 → 성공
```

### 6.3 사람 행동 모방 (Anti-detection)

```typescript
// 봇 탐지 방지를 위한 사람 행동 시뮬레이션
async function humanBehavior(): Promise<void> {
  // 1. 랜덤 스크롤 (폼 영역으로)
  await randomScroll(200, 600)
  await delay(500, 1500)

  // 2. Submit 버튼 근처로 마우스 이동
  await moveMouseNear(submitButton)
  await delay(200, 800)

  // 3. 버튼 클릭 (약간의 offset + 딜레이)
  await clickWithOffset(submitButton, { x: random(-3, 3), y: random(-2, 2) })
}
```

### 6.4 수정/생성 파일

| # | 파일 | 작업 | Est. LoC |
|---|------|------|---------|
| 1 | `extension/src/content/sc-form-filler.ts` | 수정 — 자동 Submit 로직, 카운트다운, 재시도, 큐 | ~120 |
| 2 | `extension/src/content/sc-selectors.ts` | 수정 — Submit 버튼 셀렉터 추가 | ~15 |
| 3 | `extension/src/content/sc-human-behavior.ts` | 신규 — 사람 행동 모방 (마우스, 스크롤, 딜레이) | ~80 |
| 4 | `extension/src/content/sc-countdown.ts` | 신규 — 카운트다운 오버레이 UI | ~60 |
| 5 | `extension/src/content/sc-queue.ts` | 신규 — 배치 제출 큐 관리 | ~90 |
| 6 | `extension/src/popup/settings.ts` | 수정 — 자동 제출 토글 + 딜레이 설정 | ~40 |
| 7 | `src/app/api/settings/sc-automation/route.ts` | 신규 — Web 자동 제출 설정 CRUD (Admin) | ~50 |
| 8 | `src/app/(protected)/settings/ScAutomationSettings.tsx` | 신규 — 자동 제출 설정 UI 컴포넌트 | ~80 |
| 9 | `src/app/(protected)/settings/SettingsContent.tsx` | 수정 — SC Automation 탭 추가 | ~10 |
| 10 | `src/lib/demo/data.ts` | 수정 — SC 자동 제출 설정 데모 데이터 | ~10 |
| 11 | `src/lib/i18n/locales/en.ts` | 수정 — SC 자동 제출 메시지 추가 | ~20 |
| 12 | `src/lib/i18n/locales/ko.ts` | 수정 — SC 자동 제출 메시지 추가 | ~20 |
| 13 | `src/constants/audit-actions.ts` | 수정 — SC 자동 제출 액션 추가 | ~5 |

**예상 총 LoC**: ~600

---

## 7. Implementation Plan

| # | Step | Dependencies | Note |
|---|------|-------------|------|
| 1 | SC Submit 버튼 셀렉터 추가 | — | sc-selectors.ts |
| 2 | 사람 행동 모방 모듈 | — | sc-human-behavior.ts |
| 3 | 카운트다운 오버레이 | — | sc-countdown.ts |
| 4 | sc-form-filler 자동 제출 통합 | 1, 2, 3 | 핵심: 기존 fillForm → autoSubmit 확장 |
| 5 | 배치 큐 모듈 | 4 | sc-queue.ts |
| 6 | Extension popup 설정 UI | — | 자동 제출 ON/OFF, 딜레이 |
| 7 | Web API — SC 자동화 설정 | — | settings/sc-automation |
| 8 | Web Settings UI | 7 | ScAutomationSettings 컴포넌트 |
| 9 | i18n + 감사 로그 | — | EN/KO 메시지, 감사 액션 |
| 10 | 데모 모드 + 빌드 검증 | All | demo data, typecheck, build, E2E |

---

## 8. Open Questions

| # | Question | Impact | Status |
|---|----------|--------|--------|
| 1 | SC Submit 버튼의 정확한 셀렉터 — 실제 SC 페이지에서 확인 필요 | High | 구현 시 실제 페이지 분석 |
| 2 | SC 자동 제출 후 계정 경고 발생 여부 — 실 환경 테스트 필요 | High | Phase A 배포 후 모니터링 |
| 3 | 카운트다운 시간 3초가 적절한지 — UX 테스트 후 조절 가능 | Low | 설정으로 변경 가능하게 설계 |
| 4 | 법무팀 SC 자동 제출 승인 여부 — Phase B 착수 전 필수 | Medium | 법무팀 검토 대기 |
| 5 | Extension 자동 업데이트 메커니즘 — .crx 배포 시 버전 관리 | Low | F31 (Extension 업데이트 알림)과 연계 |

---

## 9. Next Steps

1. [ ] Write design document (`sc-automation.design.md`)
2. [ ] 실제 SC "Report a Violation" 페이지 Submit 버튼 셀렉터 확보
3. [ ] Start implementation (Phase A)
4. [ ] Gap analysis
5. [ ] Phase A 안정화 후 Phase B 계획 별도 PDCA 착수

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-03 | Initial draft — Phase A (Extension 자동 제출) 중심 | Claude (AI) |
