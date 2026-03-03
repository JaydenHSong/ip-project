# 사용자 관리 (User Management) Design Document

> **Summary**: Settings > Users 탭에서 Admin이 사용자 목록 조회, 역할 변경, 계정 비활성화를 수행
>
> **Project**: Sentinel
> **Author**: Claude (PDCA)
> **Date**: 2026-03-02
> **Status**: Draft
> **Planning Doc**: [user-management.plan.md](../01-plan/features/user-management.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 기존 Settings 페이지 탭 구조에 Users 탭을 추가하여 일관된 UX 유지
- Admin 전용 사용자 관리 CRUD (역할 변경 + 비활성화)
- 서버 사이드 RBAC 보안 (withAuth 미들웨어 활용)
- Demo 모드 완벽 지원 (Supabase 없이도 동작)

### 1.2 Design Principles

- 기존 패턴 재사용: withAuth 미들웨어, isDemoMode(), i18n 시스템
- 최소 변경: 신규 파일 3개 + 수정 파일 3개
- 안전장치: 자기 자신 변경 불가, 마지막 Admin 보호

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────┐
│ Settings Page (page.tsx)                              │
│  └─ SettingsContent.tsx                              │
│      ├─ [Monitoring] tab → MonitoringSettings.tsx    │
│      ├─ [Templates] tab  → TemplatesTab.tsx          │
│      └─ [Users] tab      → UserManagement.tsx  ← NEW│
│           └─ Confirm Modal (inline)                  │
├──────────────────────────────────────────────────────┤
│ API Layer                                            │
│  ├─ GET  /api/users          → 사용자 목록 조회      │
│  └─ PATCH /api/users/[id]    → 역할/상태 변경        │
├──────────────────────────────────────────────────────┤
│ Data Layer                                           │
│  ├─ Supabase: users 테이블 (기존)                    │
│  └─ Demo: DEMO_USERS 배열 (신규)                     │
└──────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
[Users 탭 렌더링]
  → fetch GET /api/users
  → 테이블 렌더링 (아바타, 이름, 이메일, 역할, 상태, 최근 로그인)
  → Admin이 역할 드롭다운 변경 클릭
  → 확인 Modal 표시
  → fetch PATCH /api/users/[id] { role }
  → 낙관적 UI 업데이트 + audit_logs 기록 (서버)
```

---

## 3. Data Model

### 3.1 기존 User 타입 (변경 없음)

```typescript
// src/types/users.ts — 그대로 사용
export const ROLES = ['admin', 'editor', 'viewer'] as const
export type Role = (typeof ROLES)[number]

export type User = {
  id: string
  email: string
  name: string
  avatar_url: string | null
  role: Role
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}
```

### 3.2 API Request/Response 타입

```typescript
// PATCH /api/users/[id] request body
type UserUpdateRequest = {
  role?: Role
  is_active?: boolean
}

// API error response (기존 패턴)
type ApiError = {
  error: {
    code: string
    message: string
  }
}
```

### 3.3 DB 스키마 (기존 — 변경 없음)

```sql
-- supabase/migrations/001_initial_schema.sql (이미 존재)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- supabase/migrations/002_rls_policies.sql (이미 존재)
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_update" ON users FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/users` | 전체 사용자 목록 | Admin only |
| PATCH | `/api/users/[id]` | 역할/상태 변경 | Admin only |

### 4.2 GET /api/users

**Auth**: `withAuth(handler, ['admin'])`

**Response (200):**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@spigen.com",
      "name": "John Doe",
      "avatar_url": "https://...",
      "role": "editor",
      "is_active": true,
      "last_login_at": "2026-03-01T10:00:00Z",
      "created_at": "2026-01-15T00:00:00Z",
      "updated_at": "2026-03-01T10:00:00Z"
    }
  ]
}
```

**Demo 모드**: `DEMO_USERS` 배열 반환

### 4.3 PATCH /api/users/[id]

**Auth**: `withAuth(handler, ['admin'])`

**Request:**
```json
{
  "role": "editor"       // optional
  "is_active": false     // optional
}
```

**Validation Rules:**
1. `role`은 `admin | editor | viewer` 중 하나
2. 자기 자신(`context.user.id === params.id`)이면 403
3. 마지막 Admin이면 역할 변경/비활성화 거부

**Response (200):**
```json
{
  "user": { ... },  // 업데이트된 사용자 객체
  "message": "User updated successfully."
}
```

**Error Responses:**
| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | INVALID_ROLE | 유효하지 않은 role 값 |
| 403 | SELF_UPDATE | 자기 자신 수정 시도 |
| 403 | LAST_ADMIN | 마지막 Admin 보호 |
| 404 | USER_NOT_FOUND | 대상 사용자 없음 |

**Audit Log 기록:**
```json
{
  "action": "update",
  "resource_type": "user",
  "resource_id": "{target_user_id}",
  "details": { "field": "role", "from": "viewer", "to": "editor" }
}
```

---

## 5. UI/UX Design

### 5.1 Settings 탭 구조

```
┌─────────────────────────────────────────────────────┐
│ Settings                                            │
├──────────┬──────────┬──────────┐                    │
│Monitoring│Templates │  Users   │  ← Admin만 표시    │
├──────────┴──────────┴──────────┤                    │
│                                                     │
│  🔍 Search users...                                │
│                                                     │
│  ┌──────┬──────────┬─────────────┬──────┬────┬────┐│
│  │Avatar│ Name     │ Email       │ Role │Act.│Last││
│  ├──────┼──────────┼─────────────┼──────┼────┼────┤│
│  │ 👤   │ Demo Adm │ demo@sp...  │Admin │ ✅ │ 3h ││
│  │ JS   │ Jane Sm  │ jane@sp...  │[Edit▾]│ ✅ │ 1d ││
│  │ BK   │ Bob Kim  │ bob@sp...   │[View▾]│ 🔴 │ 5d ││
│  └──────┴──────────┴─────────────┴──────┴────┴────┘│
│                                                     │
│  Showing 3 users                                    │
└─────────────────────────────────────────────────────┘
```

### 5.2 User Flow

```
Settings 진입
  → Users 탭 클릭 (Admin만 표시)
  → 사용자 목록 로딩
  → 역할 드롭다운 클릭 (자기 행은 disabled)
  → 확인 Modal: "Change {name}'s role from {old} to {new}?"
  → [Confirm] → PATCH API → 성공 토스트 → 테이블 업데이트
  → [Cancel] → 드롭다운 원복
```

### 5.3 확인 Modal

```
┌──────────────────────────────────┐
│  Change User Role                │
│                                  │
│  Change Jane Smith's role        │
│  from Editor to Viewer?          │
│                                  │
│          [Cancel] [Confirm]      │
└──────────────────────────────────┘
```

역할 변경과 비활성화 둘 다 동일한 확인 Modal 패턴 사용.

### 5.4 역할 Badge 색상

| Role | Color | Tailwind Class |
|------|-------|----------------|
| Admin | Red | `bg-red-500/20 text-red-400` |
| Editor | Blue | `bg-blue-500/20 text-blue-400` |
| Viewer | Gray | `bg-gray-500/20 text-gray-400` |

### 5.5 Component: UserManagement.tsx

```typescript
// Props
type UserManagementProps = {
  isAdmin: boolean
  currentUserId: string
}

// State
const [users, setUsers] = useState<User[]>([])
const [search, setSearch] = useState('')
const [loading, setLoading] = useState(true)
const [confirmModal, setConfirmModal] = useState<{
  userId: string
  field: 'role' | 'is_active'
  oldValue: string | boolean
  newValue: string | boolean
} | null>(null)
```

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Error Code | Message (EN) | Message (KO) |
|------|-----------|--------------|--------------|
| 400 | INVALID_ROLE | Invalid role value. | 유효하지 않은 역할입니다. |
| 403 | SELF_UPDATE | Cannot modify your own account. | 자신의 계정은 수정할 수 없습니다. |
| 403 | LAST_ADMIN | Cannot modify the last admin. | 마지막 관리자는 변경할 수 없습니다. |
| 404 | USER_NOT_FOUND | User not found. | 사용자를 찾을 수 없습니다. |

### 6.2 Error Response Format

```json
{
  "error": {
    "code": "SELF_UPDATE",
    "message": "Cannot modify your own account."
  }
}
```

---

## 7. Security Considerations

- [x] 서버 사이드 RBAC: `withAuth(handler, ['admin'])` — Admin만 접근
- [x] 자기 자신 변경 방지: `context.user.id === params.id` 체크
- [x] 마지막 Admin 보호: Admin count 쿼리로 검증
- [x] Input validation: `ROLES.includes(role)` 검증
- [x] RLS 정책: 이미 Admin only UPDATE 설정 (2중 보호)
- [x] UI는 UX 용도만 — 보안은 서버에서 처리 (CLAUDE.md 원칙)

---

## 8. Demo Mode

### 8.1 DEMO_USERS 데이터

```typescript
// src/lib/demo/data.ts에 추가
export const DEMO_USERS: User[] = [
  {
    id: 'demo-user-001',
    email: 'demo@spigen.com',
    name: 'Demo Admin',
    avatar_url: null,
    role: 'admin',
    is_active: true,
    last_login_at: '2026-03-02T08:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-03-02T08:00:00.000Z',
  },
  {
    id: 'demo-user-002',
    email: 'jane.smith@spigen.com',
    name: 'Jane Smith',
    avatar_url: null,
    role: 'editor',
    is_active: true,
    last_login_at: '2026-03-01T14:30:00.000Z',
    created_at: '2026-01-10T00:00:00.000Z',
    updated_at: '2026-03-01T14:30:00.000Z',
  },
  {
    id: 'demo-user-003',
    email: 'bob.kim@spigen.com',
    name: 'Bob Kim',
    avatar_url: null,
    role: 'viewer',
    is_active: true,
    last_login_at: '2026-02-28T09:00:00.000Z',
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-02-28T09:00:00.000Z',
  },
  {
    id: 'demo-user-004',
    email: 'sarah.lee@spigen.com',
    name: 'Sarah Lee',
    avatar_url: null,
    role: 'editor',
    is_active: false,
    last_login_at: '2026-02-15T11:00:00.000Z',
    created_at: '2026-01-20T00:00:00.000Z',
    updated_at: '2026-02-20T00:00:00.000Z',
  },
  {
    id: 'demo-user-005',
    email: 'mike.park@spigen.com',
    name: 'Mike Park',
    avatar_url: null,
    role: 'viewer',
    is_active: true,
    last_login_at: null,
    created_at: '2026-02-25T00:00:00.000Z',
    updated_at: '2026-02-25T00:00:00.000Z',
  },
]
```

### 8.2 Demo API 동작

- **GET**: `DEMO_USERS` 반환
- **PATCH**: 상태에서만 업데이트 (실제 DB 미반영), 성공 응답 반환

---

## 9. i18n 추가

### 9.1 EN (`en.ts`)

```typescript
settings: {
  monitoring: { ... },  // 기존
  users: {
    title: 'User Management',
    searchPlaceholder: 'Search by name or email...',
    name: 'Name',
    email: 'Email',
    role: 'Role',
    activeStatus: 'Active',
    lastLogin: 'Last Login',
    noUsers: 'No users found.',
    noSearchResults: 'No users match your search.',
    showingCount: 'Showing {count} users',
    changeRole: 'Change Role',
    confirmRoleChange: "Change {name}'s role from {from} to {to}?",
    confirmDeactivate: 'Deactivate {name}? They will not be able to log in.',
    confirmActivate: 'Reactivate {name}?',
    selfEditBlocked: 'You cannot modify your own account.',
    lastAdminBlocked: 'Cannot modify the last admin.',
    updateSuccess: 'User updated successfully.',
    updateError: 'Failed to update user.',
    roleAdmin: 'Admin',
    roleEditor: 'Editor',
    roleViewer: 'Viewer',
    active: 'Active',
    inactive: 'Inactive',
    neverLoggedIn: 'Never',
  },
},
```

### 9.2 KO (`ko.ts`)

```typescript
settings: {
  monitoring: { ... },  // 기존
  users: {
    title: '사용자 관리',
    searchPlaceholder: '이름 또는 이메일로 검색...',
    name: '이름',
    email: '이메일',
    role: '역할',
    activeStatus: '활성 상태',
    lastLogin: '최근 로그인',
    noUsers: '사용자가 없습니다.',
    noSearchResults: '검색 결과가 없습니다.',
    showingCount: '{count}명의 사용자',
    changeRole: '역할 변경',
    confirmRoleChange: '{name}의 역할을 {from}에서 {to}(으)로 변경하시겠습니까?',
    confirmDeactivate: '{name}을(를) 비활성화하시겠습니까? 로그인이 불가능해집니다.',
    confirmActivate: '{name}을(를) 다시 활성화하시겠습니까?',
    selfEditBlocked: '자신의 계정은 수정할 수 없습니다.',
    lastAdminBlocked: '마지막 관리자는 변경할 수 없습니다.',
    updateSuccess: '사용자가 업데이트되었습니다.',
    updateError: '사용자 업데이트에 실패했습니다.',
    roleAdmin: '관리자',
    roleEditor: '편집자',
    roleViewer: '뷰어',
    active: '활성',
    inactive: '비활성',
    neverLoggedIn: '없음',
  },
},
```

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/
├── app/
│   ├── (protected)/settings/
│   │   ├── page.tsx                 ← 수정: currentUserId prop 추가
│   │   ├── SettingsContent.tsx      ← 수정: Users 탭 추가
│   │   ├── MonitoringSettings.tsx   (기존)
│   │   ├── TemplatesTab.tsx         (기존)
│   │   └── UserManagement.tsx       ← 신규
│   └── api/
│       └── users/
│           ├── route.ts             ← 신규: GET
│           └── [id]/
│               └── route.ts         ← 신규: PATCH
├── lib/
│   ├── demo/
│   │   └── data.ts                  ← 수정: DEMO_USERS 추가
│   └── i18n/locales/
│       ├── en.ts                    ← 수정: settings.users 추가
│       └── ko.ts                    ← 수정: settings.users 추가
└── types/
    └── users.ts                     (변경 없음)
```

### 10.2 Implementation Order

1. [ ] **Step 1**: Demo 데이터 추가 — `src/lib/demo/data.ts`에 `DEMO_USERS` 추가
2. [ ] **Step 2**: i18n 번역 추가 — `en.ts`, `ko.ts`에 `settings.users` 추가
3. [ ] **Step 3**: API 구현 — `GET /api/users` + `PATCH /api/users/[id]`
4. [ ] **Step 4**: UI 구현 — `UserManagement.tsx` (테이블 + 검색 + 드롭다운 + Modal)
5. [ ] **Step 5**: Settings 탭 연결 — `page.tsx` + `SettingsContent.tsx` 수정
6. [ ] **Step 6**: 빌드 검증 — `pnpm typecheck && pnpm lint && pnpm build`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial draft | Claude (PDCA) |
