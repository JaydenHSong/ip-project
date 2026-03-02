# Web Manual Report Planning Document

> **Summary**: 웹에서 ASIN/URL을 직접 입력하여 위반 신고를 생성하는 수동 기입 폼
>
> **Project**: Sentinel
> **Version**: 0.3
> **Author**: Claude (AI)
> **Date**: 2026-03-02
> **Status**: Draft
> **Feature ID**: F33
> **Milestone**: MS2 (8/10)

---

## 1. Overview

### 1.1 Purpose

현재 신고(Report)를 생성하려면 크롤러가 수집한 리스팅이거나 Extension으로 제보해야 한다. 웹에서 ASIN/URL을 직접 입력하여 수동으로 신고를 생성할 수 있는 폼이 없어 오퍼레이터가 빠르게 위반을 기입할 수 없다.

### 1.2 Background

- 크롤러 미수집 ASIN에 대한 위반을 빠르게 등록해야 하는 니즈
- Extension 미설치 환경에서도 위반 기입 가능해야 함
- OMS 시스템에서는 수동 기입이 기본 기능이었음
- 기존 `POST /api/reports` + `POST /api/listings` API가 이미 구현되어 재활용 가능

### 1.3 Related Documents

- `Sentinel_Project_Context.md` — F33 (웹 수동 기입)
- `docs/archive/2026-03/sentinel/` — 원본 설계 문서
- `src/types/api.ts` — CreateReportRequest, CreateListingRequest 타입

---

## 2. Scope

### 2.1 In Scope

- [ ] ASIN + Marketplace 입력 → 리스팅 자동 조회/생성
- [ ] 위반 유형 선택 (5카테고리 19개 타입)
- [ ] 메모/노트 입력
- [ ] 스크린샷 업로드 (선택)
- [ ] AI 분석 자동 트리거 (신고 생성 후)
- [ ] 중복 신고 체크 (기존 F26 로직 재활용)
- [ ] `/reports/new` 페이지 UI
- [ ] i18n 키 (영어/한국어)

### 2.2 Out of Scope

- 아마존 URL 자동 파싱 (ASIN 직접 입력으로 대체)
- Bulk import (CSV 일괄 업로드)
- 리스팅 상세 미리보기 (추후 기능)
- 드래프트 자동 생성 (AI 분석 완료 후 별도 트리거)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | ASIN + Marketplace 입력 필드 제공 | High | Pending |
| FR-02 | 위반 카테고리 → 위반 유형 2단계 셀렉트 | High | Pending |
| FR-03 | 메모/노트 텍스트 입력 (선택) | Medium | Pending |
| FR-04 | 기존 리스팅 조회 → 없으면 자동 생성 | High | Pending |
| FR-05 | 중복 신고 체크 + 경고 표시 | High | Pending |
| FR-06 | 신고 생성 후 상세 페이지로 이동 | Medium | Pending |
| FR-07 | AI 분석 자동 트리거 (fire-and-forget) | Medium | Pending |
| FR-08 | Editor/Admin만 접근 가능 | High | Pending |
| FR-09 | 모바일 반응형 레이아웃 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 폼 제출 → 리다이렉트 < 3초 | 브라우저 네트워크 탭 |
| Validation | 클라이언트 + 서버 양면 검증 | typecheck + 수동 테스트 |
| Accessibility | 폼 label 연결, 키보드 탐색 가능 | 수동 확인 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `/reports/new` 페이지에서 ASIN + 위반 유형으로 신고 생성 가능
- [ ] 기존 리스팅이 없는 ASIN은 자동으로 리스팅 생성
- [ ] 중복 신고 시 경고 메시지 표시
- [ ] typecheck 통과
- [ ] build 성공

### 4.2 Quality Criteria

- [ ] Zero lint errors
- [ ] Build succeeds
- [ ] 기존 API 재활용 (새 API 최소화)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 존재하지 않는 ASIN 입력 | Low | Medium | 리스팅 생성 시 minimal 데이터만 요구, 이후 크롤러가 보완 |
| 중복 신고 발생 | Medium | Medium | 기존 F26 중복 체크 로직 재활용 |
| 위반 유형 선택 혼동 | Low | Low | 2단계 셀렉트 (카테고리→타입) + 설명 툴팁 |

---

## 6. Architecture Considerations

### 6.1 Project Level

Dynamic (기존 유지)

### 6.2 Key Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 폼 라이브러리 | React useState | 기존 프로젝트 패턴 일관성 (react-hook-form 미사용) |
| 리스팅 조회/생성 | 서버 사이드 (API Route) | 기존 POST /api/listings API 재활용 |
| AI 트리거 | fire-and-forget fetch | 기존 패턴 (approve/route.ts 참조) |
| 위반 유형 UI | 2단계 Select (category → type) | Extension UI와 동일 패턴 |

### 6.3 재활용 코드

| 기존 코드 | 용도 |
|-----------|------|
| `POST /api/reports` (route.ts) | 신고 생성 (중복 체크 포함) |
| `POST /api/listings` (존재 시) | 리스팅 upsert |
| `VIOLATION_TYPES`, `VIOLATION_GROUPS` | 위반 유형 2단계 셀렉트 데이터 |
| `Button`, `Input`, `Textarea`, `Card` | UI 컴포넌트 |
| `withAuth(['admin', 'editor'])` | 권한 체크 |

---

## 7. Implementation Plan

### 7.1 신규 파일

| 파일 | 역할 |
|------|------|
| `src/app/(protected)/reports/new/page.tsx` | Server Component (권한 체크 + 레이아웃) |
| `src/app/(protected)/reports/new/NewReportForm.tsx` | Client Component (폼 로직) |

### 7.2 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/lib/i18n/locales/en.ts` | reports.new.* 번역 키 추가 |
| `src/lib/i18n/locales/ko.ts` | reports.new.* 번역 키 추가 |
| `src/app/api/reports/route.ts` | listing_id 대신 asin으로 리스팅 조회/생성 지원 (선택) |

### 7.3 구현 순서

1. i18n 키 추가
2. NewReportForm.tsx 컴포넌트 작성
3. page.tsx Server Component 작성
4. API 확장 (필요 시)
5. typecheck + build 검증

---

## 8. UI 와이어프레임

```
┌──────────────────────────────────────────────┐
│ ← Back    New Report                         │
├──────────────────────────────────────────────┤
│                                              │
│  ┌─ Listing Information ──────────────────┐  │
│  │ ASIN          [____________]           │  │
│  │ Marketplace   [US ▾]                   │  │
│  │ Title (opt)   [________________________]│  │
│  │ Seller (opt)  [________________________]│  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌─ Violation Details ────────────────────┐  │
│  │ Category      [Select category ▾]      │  │
│  │ Type          [Select type ▾]          │  │
│  │                                        │  │
│  │ Note (optional)                        │  │
│  │ ┌──────────────────────────────────┐   │  │
│  │ │                                  │   │  │
│  │ │                                  │   │  │
│  │ └──────────────────────────────────┘   │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ⚠️ Duplicate warning (shown conditionally)  │
│                                              │
│                     [Cancel] [Create Report]  │
└──────────────────────────────────────────────┘
```

---

## 9. Next Steps

1. [ ] Write design document (`web-manual-report.design.md`)
2. [ ] Implementation
3. [ ] Gap analysis

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial draft | Claude (AI) |
