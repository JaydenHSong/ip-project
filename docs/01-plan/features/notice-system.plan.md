# Notice System (공지사항 시스템) Planning Document

> **Summary**: Owner/Editor가 작성하고, 전체 사용자가 팝업/노티로 수신하는 사내 공지사항 시스템
>
> **Project**: Sentinel
> **Author**: Claude
> **Date**: 2026-03-04
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

Sentinel 플랫폼 내에서 사내 공지사항(버전 업데이트, 운영 안내, 정책 변경 등)을 작성·관리·전달하는 시스템.
기존 Audit Logs 페이지를 공지사항 시스템으로 전환한다.

### 1.2 Background

- 기존 Audit Logs는 Owner만 접근 가능하며, 시스템 이벤트 기록 용도
- 실제로는 버전 업데이트 서머리, 운영 안내 등 **공지사항** 기능이 필요
- Owner가 팀원에게 중요한 변경사항을 알릴 채널이 없음
- 시스템 유저(AI)가 자동으로 버전 업데이트 내용을 공지할 수 있는 구조 필요

### 1.3 Related Documents

- 기존 DB: `changelog_entries` 테이블 (버전별 변경로그)
- 기존 DB: `notifications` 테이블 (개인별 알림)
- 이슈 엑셀: "Audit log 라기 보다는 공지사항이야"

---

## 2. Scope

### 2.1 In Scope

- [x] Notice CRUD API (생성/조회/수정/삭제)
- [x] Notice 목록 페이지 (기존 Audit Logs 페이지 전환)
- [x] Notice 상세 보기 모달/페이지
- [x] 미읽은 공지 알림 배지 (헤더)
- [x] 새 공지 등록 시 전체 사용자에게 notification 생성
- [x] 역할별 권한 제어 (Owner: CRUD, Editor: Create, 나머지: Read)
- [x] 시스템 공지 지원 (시스템 유저가 자동 생성)

### 2.2 Out of Scope

- 실시간 Push 알림 (WebSocket/SSE) — 향후 고려
- 공지 대상 그룹 지정 (전체 대상만)
- 공지 예약 발송
- 첨부파일

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Owner는 공지사항 CRUD 가능 | High | Pending |
| FR-02 | Editor는 공지사항 생성(Create) 가능 | High | Pending |
| FR-03 | 모든 사용자는 공지사항 목록/상세 조회 가능 | High | Pending |
| FR-04 | 새 공지 등록 시 모든 사용자에게 notification 자동 생성 | High | Pending |
| FR-05 | 헤더에 미읽은 공지 수 배지 표시 | Medium | Pending |
| FR-06 | 공지 카테고리: update(버전), policy(정책), notice(일반), system(시스템) | Medium | Pending |
| FR-07 | 시스템 유저(service_role)가 자동 공지 생성 가능 | Medium | Pending |
| FR-08 | 공지 고정(Pin) 기능 — 중요 공지 상단 노출 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 공지 목록 로딩 < 500ms | 페이지 로드 시간 |
| Security | RLS 기반 역할 권한 제어 | RLS 정책 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] Notice CRUD API 구현 완료
- [ ] Notice 페이지 UI 구현 완료
- [ ] 역할별 권한 제어 동작
- [ ] notification 연동 동작
- [ ] 빌드/타입체크/린트 통과

### 4.2 Quality Criteria

- [ ] Zero lint/typecheck errors
- [ ] Build succeeds
- [ ] 기존 기능 회귀 없음

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 기존 Audit Logs 기능 손실 | Medium | Low | Audit Logs는 별도 관리, 페이지만 전환 |
| notifications 테이블 대량 INSERT | Medium | Medium | batch insert + 비동기 처리 |
| changelog_entries와 중복 | Low | Medium | changelog_entries를 notices의 하위 카테고리로 통합 |

---

## 6. Architecture Considerations

### 6.1 Project Level

**Dynamic** — 기존 Sentinel 아키텍처 유지 (Next.js + Supabase)

### 6.2 DB 설계 방향

**Option A: 기존 `changelog_entries` 테이블 확장** (권장)
- `changelog_entries`를 `notices`로 리네임 또는 확장
- category에 'notice', 'system' 추가
- `is_pinned`, `published_at` 컬럼 추가

**Option B: 새 `notices` 테이블 생성**
- changelog_entries와 별개로 운영
- 중복 구조 발생 가능

### 6.3 UI 위치

- 기존 Sidebar의 "Audit Logs" → "Notices" 또는 "Announcements"로 변경
- Header의 알림 벨 아이콘과 연동

### 6.4 Notification 연동

새 공지 등록 시:
1. `notices` 테이블에 INSERT
2. `users` 테이블에서 전체 활성 사용자 조회
3. 각 사용자에 대해 `notifications` 테이블에 INSERT (type: 'notice_new')
4. 프론트엔드에서 알림 배지 갱신

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration
- [x] TypeScript configuration
- [x] Tailwind CSS styling

### 7.2 Environment Variables Needed

추가 환경변수 불필요 (기존 Supabase 연결 사용)

---

## 8. Next Steps

1. [ ] Plan 리뷰 및 승인
2. [ ] Design 문서 작성 (`notice-system.design.md`)
3. [ ] DB 마이그레이션 작성
4. [ ] API 구현 → UI 구현 → Notification 연동

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-04 | Initial draft | Claude |
