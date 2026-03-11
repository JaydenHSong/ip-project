# Report Detail UX Improvements Planning Document

> **Summary**: 리포트 디테일 페이지 UX 개선 — Clone 기능, BR Form Fields 레이아웃, Body 세이브 버그 수정
>
> **Project**: Sentinel
> **Author**: Claude
> **Date**: 2026-03-11
> **Status**: Completed

---

## 1. Overview

### 1.1 Purpose

리포트 디테일 페이지에서 실운영에 필요한 기능 추가 및 UX 버그 수정:
- 완료된 케이스를 복사하여 새 케이스로 재신고하는 Clone 기능
- BR Form Fields 레이아웃 재구성 (subject, body, URLs를 하나의 섹션으로)
- 템플릿 로드 후 바디 세이브가 안 되는 버그 수정
- UI 라벨 정리 (BR Case → BR Case ID)

### 1.2 Background

- 완료된 위반 케이스를 동일 ASIN에 대해 재신고할 필요 빈번 (리오픈이 아닌 새 케이스)
- Draft 에디터에서 Title, Subject, Body, URLs가 흩어져 있어 BR 폼 필드 한눈에 안 보임
- 템플릿 적용 후 autosave가 실패해도 UI가 "Saving..." 상태에서 멈추는 버그
- Approve 시 편집된 바디가 누락될 수 있는 레이스 컨디션

---

## 2. Scope

### 2.1 In Scope

- [x] Clone as New Case 기능 (API + UI)
- [x] BR Form Fields 레이아웃 재구성 (Title 분리, Subject+Body+URLs 통합 섹션)
- [x] Recommended Template을 템플릿 섹션 내부로 이동
- [x] Autosave 에러 복구 버그 수정
- [x] Approve 시 항상 현재 에디터 값 전송 (hasChanges 조건 제거)
- [x] BR Case → BR Case ID 라벨 변경
- [x] PD Report 완료 풀 배너 → 인라인 태그로 축소

### 2.2 Out of Scope

- 리오픈 기능 (closed → open 상태 전환)
- Clone 시 스크린샷 복사
- 부분 클론 (선택적 필드만 복사)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 완료된 케이스에서 Clone as New 버튼으로 새 draft 생성 | High | Done |
| FR-02 | Clone 시 listing, violation type, draft 내용 복사 + parent_report_id 연결 | High | Done |
| FR-03 | BR Form Fields 섹션에 Subject, Body, URLs 통합 | High | Done |
| FR-04 | Title은 섹션 밖 독립 Input | Medium | Done |
| FR-05 | Recommended Template 배너를 Templates 패널 내부로 이동 | Medium | Done |
| FR-06 | Autosave 실패 시 UI 상태 복구 (idle로 전환) | High | Done |
| FR-07 | Approve 시 항상 현재 에디터 값 전송 | High | Done |
| FR-08 | BR Case 카드 제목을 BR Case ID로 변경 | Low | Done |
| FR-09 | PD Report 완료 풀 배너를 인라인 태그로 변경 | Medium | Done |

---

## 4. Architecture

### 4.1 Clone API

```
POST /api/reports/:id/clone
  → 원본 reports 조회 (listing_id, violation_type, draft_*)
  → 새 draft INSERT (status: 'draft', parent_report_id: 원본 id)
  → { data: { id: newReportId } }
```

### 4.2 Clone 가능 상태

`submitted`, `monitoring`, `resolved`, `unresolved`, `archived`

### 4.3 Autosave 수정

- PATCH 응답이 non-OK일 때 `setAutoSaveStatus('idle')` 추가
- Approve 직전 pending timer 취소 (`clearTimeout`)
- `edited_draft_body`를 `hasChanges` 조건 없이 항상 전송

---

## 5. Success Criteria

- [x] Clone 후 새 draft 페이지로 이동, 원본 내용 복사 확인
- [x] BR Form Fields 섹션에 Subject, Body, URLs 한곳에 표시
- [x] 템플릿 로드 → 바디 autosave 정상 동작
- [x] `pnpm typecheck && pnpm build` 통과

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-11 | Initial — 전체 구현 완료 | Claude |
