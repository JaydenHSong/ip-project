# Patents Registry Planning Document

> **Summary**: Spigen 특허/디자인 특허 레지스트리 관리 페이지 — UI + CRUD + 수동 등록 우선, Monday.com 동기화는 후순위
>
> **Project**: Sentinel
> **Author**: Claude
> **Date**: 2026-03-02
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

Spigen의 특허(Design Patent, Utility Patent) 데이터를 Sentinel 내에서 관리하고, AI 분석 시 리스팅과 특허를 자동 비교하여 V03(특허 침해) 위반을 탐지하는 기반을 제공한다.

### 1.2 Background

- 기존: Monday.com에서 특허 데이터를 별도 관리, OMS와 연동 없음
- Sentinel은 Monday.com 특허 데이터를 통합하되, **API 퍼미션 미확보** 상태
- 따라서 **1단계: 수동 등록 UI** → **2단계: Monday.com API 동기화** 순서로 구현
- 이미 구현된 백엔드 코드: 타입(`types/patents.ts`), Monday sync 로직(`lib/patents/monday-sync.ts`), sync API route, AI 특허 유사도 분석(`lib/ai/patent-similarity.ts`)

### 1.3 Related Documents

- `Sentinel_Project_Context.md` — "Spigen 특허 레지스트리" 섹션
- `docs/archive/2026-03/sentinel/sentinel.design.md` — DB 스키마 (patents, report_patents 테이블)
- 기능 ID: F24 (AI 특허 유사도 분석), F25 (Monday.com 동기화)

---

## 2. Scope

### 2.1 In Scope (1단계 — 이번 구현)

- [x] Patents 페이지 UI (`/patents`) — 목록, 검색, 필터
- [x] Admin 수동 CRUD — 특허 등록/수정/삭제 (SlidePanel 방식)
- [x] 특허 상세 보기 — Quick View SlidePanel
- [x] 데모 데이터 — 샘플 특허 5~10건
- [x] i18n — 영어/한국어 번역
- [x] Patents API — GET (목록/상세), POST (생성), PUT (수정), DELETE (삭제)
- [x] RBAC — Viewer: 읽기만, Editor: 읽기만, Admin: CRUD 전체

### 2.2 Out of Scope (2단계 — API 퍼미션 확보 후)

- Monday.com GraphQL API 실 연동 (코드는 이미 있음, 설정만 추가하면 됨)
- 자동 동기화 스케줄링 (cron job)
- 특허 이미지 업로드 (Supabase Storage 연동 필요)
- Report ↔ Patent 연결 UI (report_patents 테이블)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Patents 목록 페이지 (테이블 그리드, 정렬/필터) | High | Pending |
| FR-02 | 특허 등록 SlidePanel (Admin 전용) | High | Pending |
| FR-03 | 특허 수정 SlidePanel (Admin 전용) | High | Pending |
| FR-04 | 특허 삭제 (확인 Modal, Admin 전용) | Medium | Pending |
| FR-05 | 특허 Quick View SlidePanel (클릭 시) | High | Pending |
| FR-06 | 검색 (특허번호, 특허명, 키워드) | High | Pending |
| FR-07 | 필터 — 상태(active/expired/pending), 국가 | Medium | Pending |
| FR-08 | 데모 데이터 (Mock 모드) | High | Pending |
| FR-09 | Monday.com 동기화 상태 표시 (설정 안 됨 안내) | Low | Pending |
| FR-10 | i18n 영어/한국어 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| 일관성 | 기존 Reports/Campaigns 페이지와 동일한 UI 패턴 (그리드 + SlidePanel) |
| 반응형 | 모바일에서 카드 레이아웃 전환 |
| 접근 권한 | RBAC 준수 (Admin만 CRUD 가능) |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] `/patents` 페이지에서 특허 목록 조회 가능
- [x] Admin이 특허를 수동으로 등록/수정/삭제 가능
- [x] Quick View로 특허 상세 확인 가능
- [x] 검색 및 필터 동작
- [x] 영어/한국어 전환 동작
- [x] 기존 UI 패턴(SlidePanel, 그리드, Badge)과 일관성

### 4.2 Quality Criteria

- [x] TypeScript 타입 에러 0건
- [x] 린트 에러 0건
- [x] 빌드 성공

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Monday.com API 퍼미션 지연 | Low | High | 수동 등록으로 대체, API는 나중에 추가 |
| DB 스키마 미생성 (Supabase 미연동) | Medium | High | 데모 데이터로 동작, Supabase 연동 시 자연스럽게 전환 |
| 특허 이미지 저장소 | Low | Medium | 1단계에서는 URL만 입력, 파일 업로드는 2단계 |

---

## 6. Architecture Considerations

### 6.1 기존 인프라 활용

| 이미 있는 코드 | 파일 | 상태 |
|---------------|------|------|
| Patent 타입 정의 | `src/types/patents.ts` | 완성 |
| Monday.com sync 로직 | `src/lib/patents/monday-sync.ts` | 완성 (API 키 필요) |
| Sync API route | `src/app/api/patents/sync/route.ts` | 완성 |
| AI 특허 유사도 분석 | `src/lib/ai/patent-similarity.ts` | 완성 |
| Sidebar 네비게이션 | `src/components/layout/Sidebar.tsx` | 이미 포함 |
| i18n "patents" 키 | `src/lib/i18n/locales/en.ts` | 네비게이션만 |
| DB 스키마 설계 | `sentinel.design.md` | 설계 완료 |

### 6.2 새로 만들 파일

| 파일 | 용도 |
|------|------|
| `src/app/(protected)/patents/page.tsx` | Patents 목록 페이지 |
| `src/app/(protected)/patents/PatentsContent.tsx` | 클라이언트 컴포넌트 |
| `src/app/api/patents/route.ts` | GET (목록) / POST (생성) |
| `src/app/api/patents/[id]/route.ts` | GET (상세) / PUT (수정) / DELETE (삭제) |
| `src/lib/demo/patents.ts` | 데모 데이터 |
| i18n 키 추가 | `en.ts`, `ko.ts`에 patents 섹션 추가 |

### 6.3 UI 패턴 (기존 프로젝트 일관성)

- **목록**: Reports/Campaigns와 동일한 그리드 테이블
- **생성/수정**: SlidePanel (size="lg")
- **Quick View**: SlidePanel (size="md")
- **삭제**: 확인 Modal
- **Badge**: 상태별 색상 (active=green, expired=red, pending=yellow)

---

## 7. Convention Prerequisites

### 7.1 기존 컨벤션 준수

- [x] `CLAUDE.md` 코딩 컨벤션 (type 사용, enum 금지, named export 등)
- [x] SlidePanel 패턴 (design doc 5.6절)
- [x] 데모 데이터 패턴 (`lib/demo/` 디렉토리)
- [x] API route 패턴 (`withAuth` 미들웨어)

### 7.2 환경 변수 (2단계에서 필요)

| Variable | Purpose | Scope | Status |
|----------|---------|-------|--------|
| `MONDAY_API_KEY` | Monday.com API 인증 | Server | 미설정 (2단계) |
| `MONDAY_BOARD_ID` | 특허 보드 ID | Server | 미설정 (2단계) |

---

## 8. Next Steps

1. [x] Design 문서 작성 (`patents-registry.design.md`)
2. [x] 구현 시작
3. [x] Gap 분석

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial draft — UI + 수동 등록 우선 전략 | Claude |
