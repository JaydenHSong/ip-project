# SC 반자동 신고 접수 (F13a) Planning Document

> **Summary**: 승인된 신고를 Sentinel Extension이 SC 페이지에서 폼 자동 채우기 → 사람 최종 제출 클릭. Fallback으로 클립보드 복사 제공.
>
> **Project**: Sentinel
> **Version**: 0.2
> **Author**: Claude (AI)
> **Date**: 2026-03-02
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

현재 승인된 신고(approved)의 SC 제출 흐름은 **상태만 변경** (`approved → submitted`)하고 실제 Seller Central에는 수동으로 접수해야 한다. F13a는 **Sentinel Extension**이 SC "Report a Violation" 페이지에서 폼을 자동으로 채워주어, 오퍼레이터는 **확인 후 제출 버튼만 클릭**하면 되는 반자동 파이프라인을 구축한다.

### 1.2 Background

- **D39**: SC 케이스 오픈 공식 API 부재 확인 (2026년 3월 재조사 — 여전히 없음)
- **D30**: F13을 단계적 구현: 1차 반자동(폼 채우기+사람 제출) → 안정화 후 F13b 완전 자동 전환
- **2024.03**: SC 로그인에 2FA 필수화 → 서버 사이드 Playwright 자동화 불안정
- **CTO 결정**: Extension 클라이언트 사이드 방식 채택 (2FA 회피, 계정 리스크 최소화)
- Sentinel Extension이 이미 아마존 도메인에서 동작 중 (Manifest V3)
- 현재 submit-sc API가 존재하나 상태 변경만 수행

### 1.3 방식 선정 근거 (Playwright vs Extension)

| 항목 | Playwright (서버) | Extension (채택) |
|------|---|---|
| 2FA | 서버에서 처리 불가, 쿠키 만료 시 중단 | 사용자 브라우저 세션 활용 → 문제 없음 |
| 계정 리스크 | 서버 IP에서 자동화 감지 가능 | 사용자 브라우저 → 정상 행동 |
| 자격증명 | 서버에 저장 필요 (보안 리스크) | 불필요 |
| 유지보수 | 셀렉터 변경 시 서버 재배포 | .crx 사내 배포로 빠른 업데이트 |

### 1.4 Related Documents

- Sentinel_Project_Context.md — F13a/F13b 정의, D30/D39 결정사항
- `extension/` — Sentinel Extension (Manifest V3)
- `src/app/api/reports/[id]/submit-sc/route.ts` — 기존 SC 제출 API (상태 변경만)
- `src/app/(protected)/reports/[id]/ReportActions.tsx` — "Submit to SC" 버튼

---

## 2. Scope

### 2.1 In Scope

- [ ] FR-01: Extension에 SC content script 추가 (sellercentral.amazon.com 폼 자동 채우기)
- [ ] FR-02: Extension manifest에 SC 도메인 host_permissions 추가
- [ ] FR-03: V01~V19 → SC 위반 유형 매핑 테이블
- [ ] FR-04: Web "Submit to SC" → SC 페이지 열기 + Extension에 report 데이터 전달
- [ ] FR-05: Web API 확장 — Extension이 대기 중인 SC submit 데이터 조회
- [ ] FR-06: Extension → Web API 제출 완료 콜백 (상태 자동 업데이트)
- [ ] FR-07: Fallback — Extension 없을 때 클립보드 복사 + 수동 안내
- [ ] FR-08: SC 케이스 ID 추출 (Extension이 제출 후 페이지에서 감지, 또는 수동 입력)

### 2.2 Out of Scope

- F13b (완전 자동 제출) — 반자동 안정화 후 별도 PDCA
- 서버 사이드 Playwright SC 자동화 (방식 변경으로 제외)
- SC 세션 관리 / 자격증명 서버 저장 (Extension 방식에서 불필요)
- SC 응답 자동 파싱 (케이스 상태 업데이트는 MS3 팔로업)
- 다국가 SC 지원 (US만 P0, UK/JP는 확장)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Extension SC content script — SC 폼 필드 자동 채우기 (ASIN, 위반유형, 설명, 증거) | High | Pending |
| FR-02 | Extension manifest에 `sellercentral.amazon.com` host_permissions 추가 | High | Pending |
| FR-03 | Web API — 대기 중 SC submit 데이터 조회 엔드포인트 | High | Pending |
| FR-04 | Web API — Extension으로부터 제출 완료 확인 엔드포인트 | High | Pending |
| FR-05 | Web "Submit to SC" 클릭 → SC RAV 페이지 새 탭 열기 | High | Pending |
| FR-06 | Fallback — 클립보드 복사 버튼 (Extension 미설치 시) | Medium | Pending |
| FR-07 | SC 셀렉터 분리 (별도 파일, 유지보수 용이) | Medium | Pending |
| FR-08 | SC 케이스 ID 추출 또는 수동 입력 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Security | 서버에 SC 자격증명 저장하지 않음 (Extension이 사용자 세션 활용) | 코드 리뷰 |
| UX | 폼 채우기 < 5초 (이미 로그인 상태 전제) | 수동 확인 |
| Reliability | Extension 미설치/미동작 시 클립보드 복사 fallback 제공 | 시나리오 테스트 |
| Compatibility | SC 셀렉터 변경 시 Extension 업데이트만으로 대응 (.crx 사내 배포) | 배포 프로세스 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] Extension이 SC "Report a Violation" 페이지에서 폼 자동 채우기 동작
- [ ] Web에서 "Submit to SC" 클릭 → SC 페이지 열림 → Extension 폼 채우기 → 사람 제출
- [ ] 제출 완료 시 Sentinel report 상태 자동 업데이트 (`submitted`)
- [ ] Extension 미설치 시 클립보드 복사 fallback 동작
- [ ] pnpm typecheck + pnpm build 통과

### 4.2 Quality Criteria

- [ ] SC 자격증명이 서버/코드에 존재하지 않음
- [ ] 실패 시 수동 신고 fallback 경로 제공
- [ ] SC 셀렉터가 별도 파일로 분리되어 있음

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SC 페이지 구조 변경 | High | Medium | 셀렉터 분리 파일, .crx 사내 배포로 빠른 업데이트, 클립보드 fallback |
| Extension 미설치 | Medium | Low | 클립보드 복사 + 단계별 안내 fallback |
| SC 로그인 안 된 상태 | Medium | Medium | Extension이 로그인 상태 감지 → 로그인 안내 메시지 표시 |
| 증거 이미지 업로드 실패 | Medium | Medium | 텍스트 필드만 채우고, 이미지는 수동 업로드 안내 |
| SC 계정 정지 리스크 | Low | Very Low | Extension은 사용자 브라우저에서 동작 → 정상 행동과 구분 불가 |

---

## 6. Architecture

### 6.1 전체 흐름

```
Sentinel Web (Admin)                     Sentinel Extension (SC 페이지)
────────────────────                     ──────────────────────────────
[Submit to SC] 클릭
  ↓
POST /api/reports/:id/submit-sc
  ↓
report.status → 'preparing'
report.sc_submit_data → { asin, type, body, evidence_urls }
  ↓
응답: { sc_rav_url }
  ↓
window.open(sc_rav_url) ──────────→ SC "Report a Violation" 페이지 열림
                                      ↓
                                   Extension content script 활성화
                                   (sellercentral.amazon.com/* 매칭)
                                      ↓
                                   Sentinel API에서 대기 중 데이터 조회
                                   GET /api/reports/pending-sc-submit
                                      ↓
                                   SC 폼 필드 자동 채우기
                                     ├─ ASIN 입력
                                     ├─ 위반 유형 선택 (V01~V19 → SC 매핑)
                                     ├─ Description 입력 (draft_body)
                                     └─ Evidence URL 또는 이미지 첨부
                                      ↓
                                   토스트: "폼 채우기 완료. 확인 후 Submit 클릭"
                                      ↓
                                   오퍼레이터가 SC에서 Submit 클릭
                                      ↓
                                   Extension이 제출 완료 감지 (URL 변경 또는 확인 페이지)
                                   POST /api/reports/:id/confirm-submitted
                                      ↓
Sentinel Web                        report.status → 'submitted'
report 상태 자동 업데이트             sc_case_id 추출 (가능한 경우)
```

### 6.2 Fallback 흐름 (Extension 없을 때)

```
[Submit to SC] 클릭
  ↓
report 데이터를 클립보드에 복사 (ASIN + 위반유형 + 신고서 본문)
  ↓
SC RAV 페이지 새 탭 열기
  ↓
토스트: "신고 내용이 클립보드에 복사되었습니다. SC에서 붙여넣기하세요."
  ↓
오퍼레이터가 수동으로 SC에 입력 + 제출
  ↓
Sentinel Web에서 "제출 완료" 버튼 클릭 → status → 'submitted'
```

### 6.3 Extension SC 모듈 구조

```
extension/src/
  content/
    sc-form-filler.ts        ← SC 폼 자동 채우기 메인 로직
    sc-selectors.ts          ← SC DOM 셀렉터 (분리, 유지보수)
  shared/
    sc-violation-map.ts      ← V01~V19 → SC 위반 유형 매핑
```

### 6.4 Web API 변경

```
src/app/api/reports/
  [id]/submit-sc/route.ts       ← 기존 수정: status 변경 + sc_submit_data 저장 + SC URL 반환
  [id]/confirm-submitted/route.ts ← 신규: Extension → 제출 완료 확인
  pending-sc-submit/route.ts    ← 신규: Extension이 대기 중 데이터 조회
```

---

## 7. Implementation Plan

| # | Item | Location | Est. LoC | Dependency |
|---|------|----------|---------|------------|
| 1 | Extension manifest에 SC 도메인 추가 | `extension/manifest.json` | ~5 | — |
| 2 | SC DOM 셀렉터 정의 | `extension/src/content/sc-selectors.ts` | ~40 | — |
| 3 | V01~V19 → SC 위반 유형 매핑 | `extension/src/shared/sc-violation-map.ts` | ~50 | — |
| 4 | SC 폼 자동 채우기 content script | `extension/src/content/sc-form-filler.ts` | ~150 | 2, 3 |
| 5 | Web API: pending SC submit 조회 | `src/app/api/reports/pending-sc-submit/route.ts` | ~30 | — |
| 6 | Web API: confirm submitted | `src/app/api/reports/[id]/confirm-submitted/route.ts` | ~40 | — |
| 7 | submit-sc API 확장 (데이터 저장 + URL 반환) | `src/app/api/reports/[id]/submit-sc/route.ts` 수정 | ~25 | 5 |
| 8 | ReportActions — SC 열기 + fallback 복사 | `ReportActions.tsx` 수정 | ~50 | 7 |
| 9 | i18n 키 추가 | `en.ts`, `ko.ts` | ~20 | — |
| 10 | 데모 모드 SC 시뮬레이션 | `src/lib/demo/data.ts` | ~15 | — |

**예상 총 LoC**: ~425

---

## 8. Open Questions

| # | Question | Impact | Status |
|---|----------|--------|--------|
| 1 | SC "Report a Violation" 페이지의 정확한 폼 필드/셀렉터 | High | 구현 시 실제 SC 페이지 분석 필요 |
| 2 | SC 위반 유형 드롭다운의 정확한 옵션 목록 | Medium | 오퍼레이터에게 확인 또는 SC 접속하여 확인 |
| 3 | 이미지 증거 업로드를 Extension에서 자동화할 수 있는가? | Medium | file input 자동화 가능 여부 확인 |
| 4 | Extension ↔ Web 간 데이터 전달 — API polling vs chrome.storage | Low | API polling이 더 안전 |

---

## 9. Next Steps

1. [ ] Write design document (`sc-semi-auto-submit.design.md`)
2. [ ] SC "Report a Violation" 페이지 실제 구조 분석 (셀렉터 확보)
3. [ ] Start implementation
4. [ ] Gap analysis

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial draft (Playwright 서버 방식) | Claude (AI) |
| 0.2 | 2026-03-02 | Extension 방식으로 전면 변경 (CTO 팀 논의 결과) | Claude (AI) |
