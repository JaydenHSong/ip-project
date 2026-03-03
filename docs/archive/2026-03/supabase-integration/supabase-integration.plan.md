# Supabase Integration Planning Document

> **Summary**: Mock 데이터 → Supabase 실 DB/Auth/Storage 전환
>
> **Project**: Sentinel (센티널)
> **Author**: Claude
> **Date**: 2026-03-02
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

현재 `DEMO_MODE=true`로 동작하는 Sentinel 웹의 전체 데이터 레이어를 Supabase 실 연동으로 전환한다. Auth(Google OAuth), Database(PostgreSQL + RLS), Storage(스크린샷)를 모두 활성화하여 실제 운영 가능한 상태로 만든다.

### 1.2 Background

- 웹 UI, API Route, Auth 콜백, 미들웨어, 마이그레이션 SQL이 모두 작성 완료됨
- Supabase 클라이언트(browser/server/admin) 3개 파일도 구현 완료
- `DEMO_MODE=true` 플래그 하나만 꺼면 실 연동이 시작되는 구조
- 하지만 아직 **Supabase 프로젝트 생성**, **환경변수 설정**, **마이그레이션 실행**, **코드 검증**이 안 된 상태
- 이것이 완료되어야 다른 기능(Patents, 사용자 관리 등) 실 테스트 가능

### 1.3 Related Documents

- 기획: `Sentinel_Project_Context.md` (DD-01, DD-03, D01~D46)
- 설계: `docs/archive/2026-03/sentinel/sentinel.design.md` (Section 2, 3, 9)
- 마이그레이션: `supabase/migrations/001~003`

---

## 2. Scope

### 2.1 In Scope

- [ ] Supabase 프로젝트 생성 + 환경변수 가이드 문서 작성
- [ ] 마이그레이션 SQL 검증 및 알려진 스키마 불일치 수정
- [ ] Google OAuth 제공자 설정 가이드
- [ ] Supabase Storage 버킷 생성 (monitoring 스크린샷)
- [ ] 서버 컴포넌트 페이지 — 실 Supabase 쿼리 경로 검증/수정
- [ ] API Route — `withAuth` 미들웨어 + 실 DB 쿼리 검증/수정
- [ ] Dashboard Stats API — 실 집계 쿼리 구현 (현재 TODO 상태)
- [ ] `settings` 테이블 참조 → `system_configs` 테이블로 통일
- [ ] `.env.local.example` 파일 작성 (온보딩용)
- [ ] Vercel 환경변수 설정 가이드
- [ ] Supabase TypeScript 타입 생성 (`supabase gen types`)

### 2.2 Out of Scope

- Crawler 실제 엔진 (별도 PDCA)
- SC 자동화 Playwright (별도 PDCA)
- Patents 페이지 + Monday.com 동기화 (별도 PDCA)
- Supabase Vault 설정 (SC 자격증명 — SC 자동화 PDCA에서 처리)
- Supabase Realtime 인앱 알림 (별도 기능)
- CI/CD 파이프라인 (Phase 9)
- 데이터 마이그레이션 (OMS → Sentinel, 기존 데이터 없음)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Supabase 프로젝트 생성 + 마이그레이션 실행 가이드 | High | Pending |
| FR-02 | `settings` → `system_configs` 테이블 참조 통일 | High | Pending |
| FR-03 | Google OAuth 활성화 + @spigen.com 도메인 제한 동작 확인 | High | Pending |
| FR-04 | 서버 컴포넌트 Supabase 쿼리 경로 전수 검증 (8개 페이지) | High | Pending |
| FR-05 | API Route 전수 검증 — withAuth + DB 쿼리 정합성 (30+ 엔드포인트) | High | Pending |
| FR-06 | Dashboard Stats 실 집계 쿼리 구현 | Medium | Pending |
| FR-07 | Supabase Storage 버킷 생성 + upload/download 경로 검증 | Medium | Pending |
| FR-08 | `supabase gen types` 타입 생성 + 코드에 적용 | Medium | Pending |
| FR-09 | `.env.local.example` 작성 (필수/선택 환경변수 구분) | Medium | Pending |
| FR-10 | Vercel 환경변수 배포 가이드 | Low | Pending |
| FR-11 | DEMO_MODE 제거 후 전체 페이지 접근 테스트 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Security | RLS 정책 전 테이블 적용 확인 | 마이그레이션 후 Supabase Dashboard에서 검증 |
| Security | Service Role Key 서버 전용 노출 방지 | `NEXT_PUBLIC_` 접두사 없음 확인 |
| Security | @spigen.com 도메인 외 로그인 차단 | OAuth 콜백 테스트 |
| Performance | 페이지 로드 < 2초 (Supabase 쿼리 포함) | 실 환경 브라우저 테스트 |
| Reliability | DEMO_MODE 분기 정리 후 빌드 성공 | `pnpm build` 통과 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] Supabase 프로젝트에 3개 마이그레이션 적용 완료
- [ ] Google OAuth로 @spigen.com 계정 로그인 성공
- [ ] 로그인 후 Dashboard, Campaigns, Reports 페이지 실 데이터 표시
- [ ] API Route 통해 Campaign/Report CRUD 동작
- [ ] RLS 정책 작동 — Viewer가 Admin 전용 리소스 접근 차단 확인
- [ ] `pnpm build` + `pnpm typecheck` + `pnpm lint` 통과
- [ ] `.env.local.example` 파일 존재

### 4.2 Quality Criteria

- [ ] 스키마 불일치 0건 (`settings` vs `system_configs` 해결)
- [ ] `isDemoMode()` 분기가 모든 페이지에서 정상 동작 (demo/real 양쪽)
- [ ] 환경변수 누락 시 명확한 에러 메시지 표시
- [ ] Zero lint errors, build succeeds

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Supabase 프로젝트 생성은 사용자가 직접 해야 함 (Claude 불가) | High | High | 단계별 스크린샷 포함 가이드 문서 작성 |
| Google OAuth Client ID/Secret은 GCP Console에서 생성 필요 | Medium | High | GCP 설정 가이드 포함 |
| 마이그레이션 SQL에 숨겨진 오류 가능성 | Medium | Medium | 로컬 Supabase CLI로 사전 검증 |
| `settings` → `system_configs` 리네이밍이 여러 파일에 영향 | Low | High | Grep으로 전수 조사 후 일괄 수정 |
| RLS 정책이 API Route의 기대와 불일치할 수 있음 | High | Low | API Route별 필요 권한 매핑 후 RLS 대조 |
| Vercel 환경에서 Supabase 연결 문제 | Medium | Low | Vercel 프리뷰 배포로 사전 테스트 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend | ☑ |
| **Enterprise** | Strict layer separation, microservices | High-traffic systems | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| DB/Auth/Storage | Supabase / Firebase / Custom | Supabase | 기획 확정, 코드 작성 완료 |
| Auth 방식 | Google OAuth (SSO) | Google OAuth | @spigen.com 도메인 제한 |
| 클라이언트 구조 | browser / server / admin 3종 | 기존 유지 | `@supabase/ssr` 패턴 |
| RLS 전략 | DB-level RLS + App-level withAuth | 이중 보안 | Service Role은 RLS 우회하므로 withAuth 필수 |
| Demo 모드 | 유지 (개발/데모용) | 유지 | DEMO_MODE=false로 전환만 하면 됨 |

### 6.3 현재 아키텍처 (변경 없음)

```
┌─────────────────────────────────────────────────┐
│ Browser / Server Component                       │
│   isDemoMode() ? DEMO_DATA : Supabase Query     │
├─────────────────────────────────────────────────┤
│ API Routes (withAuth + createAdminClient)        │
│   → Service Role (RLS bypass) + App-level RBAC  │
├─────────────────────────────────────────────────┤
│ Supabase                                         │
│   Auth (Google OAuth) + DB (PostgreSQL + RLS)   │
│   + Storage (monitoring screenshots)             │
└─────────────────────────────────────────────────┘
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration
- [x] TypeScript configuration (`tsconfig.json`)
- [x] Tailwind CSS v4 configuration

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **환경변수 네이밍** | 일부 존재 | `.env.local.example` 표준화 | High |
| **Supabase 타입** | 수동 타입 | `supabase gen types` 자동 생성 | High |
| **에러 처리** | NextResponse.json 패턴 | Supabase 에러 코드 매핑 | Medium |
| **테이블 참조** | `settings` vs `system_configs` 혼재 | `system_configs`로 통일 | High |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | Required |
|----------|---------|-------|:--------:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Client | ☑ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Key | Client | ☑ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key (RLS bypass) | Server | ☑ |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Server | ☑ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | Server | ☑ |
| `NEXT_PUBLIC_APP_URL` | 앱 도메인 URL | Client | ☑ |
| `ANTHROPIC_API_KEY` | Claude AI API Key | Server | ☐ (AI 기능만) |
| `MONDAY_API_TOKEN` | Monday.com API | Server | ☐ (Patents만) |
| `DEMO_MODE` | 데모 모드 플래그 | Server | ☐ (제거 or false) |

---

## 8. Implementation Strategy

### Phase A: 기반 준비 (코드 수정)

1. **`settings` → `system_configs` 테이블 참조 통일**
   - `/api/settings/monitoring/route.ts` 수정
   - `/api/monitoring/pending/route.ts` 수정
   - 관련 타입 정의 확인

2. **Dashboard Stats 실 집계 쿼리 구현**
   - `/api/dashboard/stats/route.ts` — TODO 마크된 실 쿼리 작성

3. **Supabase TypeScript 타입 생성 준비**
   - `supabase/config.toml` 설정 확인
   - 타입 생성 스크립트 `package.json`에 추가

4. **`.env.local.example` 작성**

### Phase B: Supabase 프로젝트 설정 (사용자 작업 + 가이드)

1. Supabase 프로젝트 생성 가이드
2. Google Cloud Console — OAuth Client ID 생성 가이드
3. Supabase Auth — Google Provider 활성화
4. 마이그레이션 실행 (`supabase db push` 또는 SQL Editor)
5. Storage 버킷 생성 (`monitoring`)
6. 환경변수 `.env.local` 실 값 입력

### Phase C: 검증 + 배포

1. 로컬 환경에서 `DEMO_MODE=false` 전환 테스트
2. 전체 페이지 접근 + CRUD 동작 확인
3. RLS 정책 동작 검증
4. `pnpm build` 성공 확인
5. Vercel 환경변수 설정 + 배포

---

## 9. Estimated Effort

| Phase | 작업 | Claude 가능 | 사용자 필요 |
|-------|------|:-----------:|:-----------:|
| A | 코드 수정 (settings 통일, dashboard 쿼리, 타입, env example) | ☑ | ☐ |
| B | Supabase/GCP 프로젝트 생성 + 설정 | ☐ (가이드 작성) | ☑ |
| C | 로컬 테스트 + Vercel 배포 | 부분적 | ☑ |

> Phase A는 Claude가 즉시 진행 가능. Phase B는 사용자가 Supabase Dashboard와 GCP Console에서 직접 작업 필요.

---

## 10. Next Steps

1. [ ] 이 Plan 승인 후 → `/pdca design supabase-integration` 으로 설계 문서 작성
2. [ ] 설계 완료 후 → Phase A 코드 수정 즉시 시작
3. [ ] Phase B 가이드 문서 작성 → 사용자에게 전달
4. [ ] Phase C 검증

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial draft | Claude |
