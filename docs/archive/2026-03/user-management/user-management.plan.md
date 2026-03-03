# 사용자 관리 (User Management) Planning Document

> **Summary**: Admin이 사용자 목록 조회, 역할 변경, 계정 비활성화를 수행하는 Settings > Users 페이지
>
> **Project**: Sentinel
> **Author**: Claude (PDCA)
> **Date**: 2026-03-02
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

Admin이 Sentinel 웹 내에서 사용자 계정을 관리할 수 있는 UI를 제공한다. 현재 Google OAuth 로그인 + 자동 Viewer 배정까지는 구현되어 있지만, **가입 후 역할 변경 및 계정 관리를 위한 UI가 없다.**

### 1.2 Background

- **F14** (사용자 인증 및 권한 관리): 인증 완료, RBAC 미들웨어 완료, **관리 UI만 미구현**
- 현재 역할 변경은 Supabase DB 직접 수정으로만 가능
- RBAC 매트릭스 상 사용자 관리는 Admin만 CRUD 가능
- Spigen 내부 사용자 약 30명 이하 규모

### 1.3 Related Documents

- `Sentinel_Project_Context.md` — F14, RBAC 상세 매트릭스 (1186행)
- `docs/archive/2026-03/sentinel/sentinel.design.md` — 설계 문서 v0.3
- `supabase/migrations/001_initial_schema.sql` — users 테이블 스키마
- `supabase/migrations/002_rls_policies.sql` — RLS 정책

---

## 2. Scope

### 2.1 In Scope

- [x] Settings 페이지에 Users 탭 추가
- [x] 사용자 목록 테이블 (이름, 이메일, 역할, 상태, 최근 로그인)
- [x] 역할 변경 기능 (Admin → Editor/Viewer 변경 가능)
- [x] 계정 활성화/비활성화 토글
- [x] 사용자 검색 (이름/이메일)
- [x] 감사 로그 연동 (역할 변경/비활성화 시 기록)
- [x] API 엔드포인트 (GET /api/users, PATCH /api/users/[id])

### 2.2 Out of Scope

- 사용자 직접 생성/삭제 (Google OAuth 가입만 허용)
- 사용자 프로필 편집 (이름/이메일은 Google에서 가져옴)
- 비밀번호 관리 (OAuth 전용)
- 권한 세부 커스터마이징 (3단계 고정: Admin/Editor/Viewer)
- 초대 시스템 (@spigen.com은 누구나 가입 가능)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Settings 페이지에 Users 탭 표시 (Admin만) | High | Pending |
| FR-02 | 사용자 목록 테이블: 아바타, 이름, 이메일, 역할 Badge, 활성 상태, 최근 로그인 | High | Pending |
| FR-03 | 역할 변경: Admin이 다른 사용자의 역할을 드롭다운으로 변경 | High | Pending |
| FR-04 | 자기 자신의 역할은 변경 불가 (Admin 잠금 보호) | High | Pending |
| FR-05 | 계정 비활성화/활성화 토글 (자기 자신 제외) | High | Pending |
| FR-06 | 사용자 검색: 이름 또는 이메일로 필터링 | Medium | Pending |
| FR-07 | 역할 변경/비활성화 시 확인 Modal | Medium | Pending |
| FR-08 | 변경 시 audit_logs에 자동 기록 | Medium | Pending |
| FR-09 | 역할별 Badge 색상 구분 (Admin=빨강, Editor=파랑, Viewer=회색) | Low | Pending |
| FR-10 | 빈 상태 처리 (사용자 없음, 검색 결과 없음) | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 사용자 목록 로딩 < 500ms | 30명 이하 규모, 페이지네이션 불필요 |
| Security | 서버 사이드 RBAC 검증 (Admin만 수정) | withAuth 미들웨어 |
| UX | SlidePanel 패턴 미사용 (설정 페이지 내 탭 방식) | 기존 Settings 구조 유지 |
| i18n | EN/KO 다국어 지원 | 기존 i18n 시스템 활용 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] Admin이 Settings > Users에서 모든 사용자 목록 확인 가능
- [x] Admin이 타 사용자의 역할을 변경하면 즉시 반영
- [x] Admin이 계정을 비활성화하면 해당 사용자 로그인 차단
- [x] 모든 변경 사항이 audit_logs에 기록
- [x] Editor/Viewer는 Users 탭 자체가 보이지 않음
- [x] Demo 모드에서도 동작 (Mock 데이터)
- [x] EN/KO 다국어 지원

### 4.2 Quality Criteria

- [x] TypeScript 타입 에러 없음 (`pnpm typecheck`)
- [x] 린트 통과 (`pnpm lint`)
- [x] 빌드 성공 (`pnpm build`)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Admin이 자기 역할 내리면 관리자 부재 | High | Medium | FR-04: 자기 자신 역할 변경 불가 처리 |
| 마지막 Admin 비활성화 | High | Low | 마지막 Admin은 비활성화/역할변경 불가 |
| Demo 모드에서 변경 무효화 | Low | High | Mock 데이터 + 성공 토스트만 표시 |
| RLS 정책 미스매치 | Medium | Low | 기존 002_rls_policies.sql 이미 Admin UPDATE만 허용 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend | ☑ |
| **Enterprise** | Strict layer separation, DI, microservices | Complex architectures | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| UI 배치 | 별도 페이지 / Settings 탭 | Settings 탭 | 기존 Settings 구조 유지 |
| 상태 관리 | useState / react-query | useState + fetch | 30명 이하, 단순 CRUD |
| 역할 변경 UX | Modal / 인라인 드롭다운 | 인라인 드롭다운 + 확인 Modal | 빠른 조작 |
| API 구조 | /api/users + /api/users/[id] | 채택 | RESTful 표준 |

### 6.3 파일 구조 (예상)

```
src/
  app/
    (protected)/settings/
      SettingsContent.tsx      ← 수정 (탭 추가)
      MonitoringSettings.tsx   ← 기존
      UserManagement.tsx       ← 신규
    api/
      users/
        route.ts               ← GET: 사용자 목록
        [id]/
          route.ts             ← PATCH: 역할/상태 변경
  lib/
    i18n/locales/
      en.ts                    ← 수정 (users 번역 추가)
      ko.ts                    ← 수정 (users 번역 추가)
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration
- [x] TypeScript configuration (`tsconfig.json`)
- [x] Tailwind v4 + CSS variable 테마

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | Exists | UserManagement.tsx (PascalCase) | High |
| **Folder structure** | Exists | Settings 하위 배치 | High |
| **Import order** | Exists | 기존 패턴 준수 | Medium |
| **Error handling** | Exists | withAuth 미들웨어 활용 | Medium |

### 7.3 Environment Variables Needed

추가 환경변수 불필요 — 기존 Supabase 연결 사용.

---

## 8. Implementation Estimate

| 항목 | 복잡도 |
|------|--------|
| API 엔드포인트 (GET + PATCH) | Low |
| UserManagement UI 컴포넌트 | Medium |
| SettingsContent 탭 구조 추가 | Low |
| i18n 번역 추가 | Low |
| Demo 모드 Mock 데이터 | Low |
| **전체** | **Low~Medium** |

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`/pdca design user-management`)
2. [ ] 구현 시작
3. [ ] Gap 분석

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial draft | Claude (PDCA) |
