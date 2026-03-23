# Spigen Amazon Operations Platform — Design

## Executive Summary

| Item | Detail |
|:--|:--|
| **Feature** | Platform Architecture — 모듈형 단일 앱 전환 |
| **Plan** | `docs/01-plan/features/spigen-platform-architecture.plan.md` |
| **Created** | 2026-03-20 |

### Value Delivered

| Perspective | Detail |
|:--|:--|
| **Problem** | Sentinel이 단일 제품으로만 동작, AD/재무/물류 등 7개 모듈 확장 불가 |
| **Solution** | 모듈 스위처 + URL prefix + DB 스키마 분리 + 팀 권한 |
| **Function UX** | SSO, 사이드바 모듈 전환, 모듈별 메뉴, 팀 기반 접근 제어 |
| **Core Value** | 아마존 오퍼레이터 ERP — 단일 플랫폼에서 7개 도구 통합 |

---

## 1. 모듈 스위처 컴포넌트

### 1.1 위치 & 구조

**파일**: `src/components/layout/ModuleSwitcher.tsx`

사이드바 상단, 로고 바로 아래에 배치. 드롭다운 형태.

```
┌─────────────────────────┐
│ [S] Spigen Ops          │  ← 로고 + 플랫폼 이름
│ ┌─────────────────────┐ │
│ │ 🛡 IP Protection  ▼ │ │  ← 모듈 스위처 (클릭 → 드롭다운)
│ └─────────────────────┘ │
├─────────────────────────┤
│ Dashboard               │  ← 선택된 모듈의 메뉴
│ Campaigns               │
│ Report Queue            │
│ ...                     │
```

### 1.2 모듈 정의

**파일**: `src/constants/modules.ts`

```typescript
type ModuleConfig = {
  key: string           // 'ip', 'ads', 'finance', ...
  name: string          // 'IP Protection'
  icon: string          // lucide icon name
  path: string          // '/ip'
  status: 'active' | 'coming_soon' | 'disabled'
  menuItems: {
    label: string
    path: string
    icon: string
  }[]
}

const MODULES: ModuleConfig[] = [
  {
    key: 'ip',
    name: 'IP Protection',
    icon: 'shield',
    path: '/ip',
    status: 'active',
    menuItems: [
      { label: 'Dashboard', path: '/ip/dashboard', icon: 'layout-dashboard' },
      { label: 'Campaigns', path: '/ip/campaigns', icon: 'search' },
      { label: 'Report Queue', path: '/ip/reports', icon: 'file-text' },
      { label: 'Completed Reports', path: '/ip/reports/completed', icon: 'check-circle' },
      { label: 'IP Registry', path: '/ip/patents', icon: 'copyright' },
      { label: 'Notices', path: '/ip/notices', icon: 'bell' },
    ],
  },
  {
    key: 'ads',
    name: 'AD Optimizer',
    icon: 'megaphone',
    path: '/ads',
    status: 'coming_soon',
    menuItems: [],
  },
  // ... 나머지 모듈
]
```

### 1.3 모듈 스위처 동작

```
사용자가 드롭다운 클릭
  → 접근 가능한 모듈만 표시 (팀 권한 기반)
  → 모듈 선택
  → router.push(module.path + '/dashboard')
  → 사이드바 메뉴가 해당 모듈의 menuItems로 교체
  → URL이 모듈 prefix로 전환
```

### 1.4 현재 모듈 감지

URL에서 현재 모듈을 감지:

```typescript
// src/lib/modules.ts
const getCurrentModule = (pathname: string): ModuleConfig | null => {
  return MODULES.find((m) => pathname.startsWith(m.path)) ?? null
}
```

---

## 2. URL 라우트 구조

### 2.1 Next.js App Router 구조

```
src/app/
├── (auth)/login/                    ← 공통 로그인
├── (protected)/
│   ├── layout.tsx                   ← AppLayout (모듈 스위처 포함)
│   ├── dashboard/                   ← 통합 대시보드
│   │
│   ├── ip/                          ← IP Protection 모듈
│   │   ├── layout.tsx               ← IP 모듈 레이아웃 (선택)
│   │   ├── dashboard/page.tsx
│   │   ├── campaigns/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── new/page.tsx
│   │   ├── reports/
│   │   │   ├── page.tsx             ← Report Queue
│   │   │   ├── completed/page.tsx
│   │   │   ├── archived/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── patents/page.tsx
│   │   └── notices/page.tsx
│   │
│   ├── ads/                         ← AD 최적화 (미래)
│   │   ├── dashboard/page.tsx
│   │   └── ...
│   │
│   ├── settings/                    ← 공통 설정
│   │   ├── page.tsx
│   │   └── team/page.tsx            ← 팀 관리 (신규)
│   │
│   ├── audit-logs/page.tsx          ← 공통
│   └── changelog/page.tsx           ← 공통
```

### 2.2 리다이렉트 (마이그레이션)

**파일**: `src/middleware.ts` (또는 `proxy.ts`)

```typescript
// 기존 URL → 새 URL 리다이렉트
const REDIRECTS: Record<string, string> = {
  '/campaigns': '/ip/campaigns',
  '/reports': '/ip/reports',
  '/reports/completed': '/ip/reports/completed',
  '/reports/archived': '/ip/reports/archived',
  '/patents': '/ip/patents',
  '/notices': '/ip/notices',
}
```

- 기존 URL 접속 시 301 리다이렉트
- Extension 호환 유지 (Extension 업데이트 전까지)
- `/dashboard`는 통합 대시보드로 유지 (리다이렉트 없음)
- `/settings`, `/audit-logs`, `/changelog`는 공통이라 리다이렉트 없음

### 2.3 API 라우트

```
src/app/api/
├── auth/                          ← 공통 인증
├── ai/                            ← 공통 AI
├── crawler/                       ← IP 모듈 전용 (기존)
├── ip/                            ← IP 모듈 API (신규 — 점진 이동)
│   ├── reports/
│   ├── campaigns/
│   └── patents/
├── ads/                           ← AD 모듈 API (미래)
├── dashboard/                     ← 통합 대시보드
├── settings/                      ← 공통 설정
│   └── teams/route.ts             ← 팀 CRUD
└── users/                         ← 공통 사용자
```

API 라우트는 **점진적 이동** — 기존 `/api/reports/*`는 그대로 두고, 새 기능부터 `/api/ip/*`에 생성. 나중에 일괄 이동.

---

## 3. 사이드바 리팩토링

### 3.1 현재 Sidebar.tsx 구조

```typescript
// 현재: 하드코딩된 메뉴
const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/campaigns', icon: Search, label: 'Campaigns' },
  // ...
]
```

### 3.2 변경: 모듈 기반 동적 메뉴

```typescript
// 변경 후: 모듈 스위처 + 동적 메뉴
const Sidebar = ({ user, collapsed, onToggle }) => {
  const pathname = usePathname()
  const currentModule = getCurrentModule(pathname)
  const accessibleModules = getAccessibleModules(user) // 팀 권한 기반

  return (
    <aside>
      {/* 로고 */}
      <Logo />

      {/* 모듈 스위처 */}
      <ModuleSwitcher
        current={currentModule}
        modules={accessibleModules}
      />

      {/* 모듈별 메뉴 */}
      <nav>
        {currentModule?.menuItems.map((item) => (
          <NavItem key={item.path} {...item} active={pathname === item.path} />
        ))}
      </nav>

      {/* 공통 메뉴 (Settings, 사용자) */}
      <CommonMenu user={user} />
    </aside>
  )
}
```

### 3.3 모바일 하단 탭바

변경 최소화:
- 현재 모듈의 핵심 5개 메뉴만 표시
- 모듈 전환은 사이드바 드로어(햄버거 메뉴)에서

---

## 4. DB 스키마 분리

### 4.1 PostgreSQL Schema 생성

```sql
-- AD 최적화 스키마 (첫 번째 새 모듈)
CREATE SCHEMA IF NOT EXISTS ads;

-- 권한 설정
GRANT USAGE ON SCHEMA ads TO authenticated;
GRANT USAGE ON SCHEMA ads TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA ads TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA ads
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
```

### 4.2 Supabase Client 확장

```typescript
// 기존: public 스키마만
const supabase = createClient()
supabase.from('reports') // → public.reports

// 확장: 스키마 지정
supabase.schema('ads').from('campaigns') // → ads.campaigns
```

### 4.3 마이그레이션 전략

| 단계 | 작업 | 시기 |
|:--|:--|:--|
| 1 | `ads` 스키마 생성 | AD 모듈 시작 시 |
| 2 | 새 모듈 테이블은 새 스키마에 생성 | 즉시 |
| 3 | 기존 IP 테이블은 `public`에 유지 | 당분간 |
| 4 | IP 테이블 → `ip` 스키마 이동 | 안정화 후 (선택) |

---

## 5. 팀 권한 시스템

### 5.1 DB 테이블

```sql
-- 팀
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  module text NOT NULL,        -- 'ip', 'ads', 'finance', ...
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 팀 멤버십 (N:N)
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer',  -- admin, editor, viewer
  joined_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read teams" ON teams
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin manage teams" ON teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Read own memberships" ON team_members
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');
```

### 5.2 접근 제어 로직

**파일**: `src/lib/auth/module-access.ts`

```typescript
type ModuleAccess = {
  module: string
  role: 'admin' | 'editor' | 'viewer'
}

const getModuleAccess = async (userId: string): Promise<ModuleAccess[]> => {
  // 1. Owner는 모든 모듈 접근
  const user = await getUser(userId)
  if (user.role === 'owner') {
    return MODULES.map((m) => ({ module: m.key, role: 'admin' }))
  }

  // 2. 팀 멤버십 조회
  const { data } = await supabase
    .from('team_members')
    .select('role, teams!inner(module)')
    .eq('user_id', userId)

  return data.map((d) => ({
    module: d.teams.module,
    role: d.role,
  }))
}

const canAccessModule = (access: ModuleAccess[], module: string): boolean => {
  return access.some((a) => a.module === module)
}
```

### 5.3 Settings > Team 관리 UI

**파일**: `src/app/(protected)/settings/team/page.tsx`

| 기능 | 설명 |
|:--|:--|
| 팀 목록 | 모듈별 팀 카드 (멤버 수, 모듈 배지) |
| 팀 생성 | 이름 + 모듈 선택 |
| 멤버 관리 | 사용자 추가/제거, 역할 변경 |
| 내 팀 보기 | 현재 사용자의 팀 소속 + 역할 |

---

## 6. 코드 구조 리팩토링

### 6.1 modules/ 폴더 생성

```
src/modules/
├── ip/
│   ├── components/        ← IP 전용 컴포넌트 (기존 features/ 에서 이동)
│   ├── lib/               ← IP 비즈니스 로직 (기존 lib/reports 등)
│   ├── types/             ← IP 타입 (기존 types/reports 등)
│   └── constants/         ← IP 상수 (기존 constants/violations 등)
├── ads/
│   ├── components/
│   ├── lib/
│   ├── types/
│   └── constants/
└── shared/
    ├── amazon/            ← Amazon SP-API 공통
    └── asin/              ← ASIN 유틸리티
```

### 6.2 모듈 격리 규칙 (절대)

한 모듈의 개발/업데이트/장애가 다른 모듈에 절대 영향 없어야 함.

```
modules/ip/ → modules/ads/      ❌ 직접 참조 금지
modules/ip/ → modules/shared/   ✅ 공유 레이어 경유
modules/ip/ → components/ui/    ✅ 공통 UI
modules/ip/ → lib/auth/         ✅ 공통 라이브러리

DB: ip.* → ads.* 직접 JOIN     ❌ 금지
DB: ip.* → public.users JOIN   ✅ 공통 테이블은 OK

API: /api/ip/* → /api/ads/*    ❌ 서버에서 직접 호출 금지
API: 클라이언트에서 두 API 각각 호출 ✅ OK
```

ESLint import 규칙으로 빌드 시 자동 검증 예정.

---

## 7. 구현 순서

### Phase 1: 기반 (기존 기능 영향 최소화)

| Step | 파일 | 설명 |
|:--|:--|:--|
| **S1** | `src/constants/modules.ts` | 모듈 정의 상수 |
| **S2** | `src/lib/modules.ts` | 현재 모듈 감지 유틸 |
| **S3** | `src/components/layout/ModuleSwitcher.tsx` | 모듈 스위처 UI |
| **S4** | `src/components/layout/Sidebar.tsx` | 사이드바 동적 메뉴 리팩토링 |

### Phase 2: URL 마이그레이션

| Step | 파일 | 설명 |
|:--|:--|:--|
| **S5** | `src/app/(protected)/ip/` | IP 라우트 그룹 생성 |
| **S6** | 기존 페이지 이동 | `/campaigns` → `/ip/campaigns` 등 |
| **S7** | `src/middleware.ts` | 리다이렉트 설정 |
| **S8** | MobileTabBar 업데이트 | 모듈별 탭 |

### Phase 3: 팀 권한

| Step | 파일 | 설명 |
|:--|:--|:--|
| **S9** | Supabase SQL | teams + team_members 테이블 |
| **S10** | `src/lib/auth/module-access.ts` | 접근 제어 로직 |
| **S11** | Settings > Team UI | 팀 관리 페이지 |
| **S12** | ModuleSwitcher 권한 적용 | 접근 가능한 모듈만 표시 |

### Phase 4: AD 모듈 준비

| Step | 파일 | 설명 |
|:--|:--|:--|
| **S13** | `ads` DB 스키마 생성 | PostgreSQL Schema |
| **S14** | `src/modules/ads/` | AD 모듈 폴더 구조 |
| **S15** | `/ads/dashboard` | AD 대시보드 빈 페이지 |

---

## 8. 엣지 케이스

| 상황 | 처리 |
|:--|:--|
| 모듈 접근 권한 없음 | 모듈 스위처에서 안 보임, URL 직접 접근 시 403 |
| 팀 미소속 사용자 | 아무 모듈도 안 보임 → "관리자에게 팀 배정을 요청하세요" |
| Owner | 모든 모듈 접근 (팀 소속 불필요) |
| 기존 URL 접근 | 301 리다이렉트 → `/ip/*` |
| Extension에서 접근 | 기존 API URL 유지 + 리다이렉트 |
| 모듈 0개 활성 (신규 설치) | 자동으로 IP Protection만 활성 |

---

## Version History

| Version | Date | Changes | Author |
|:--|:--|:--|:--|
| 0.1 | 2026-03-20 | Initial design | Claude |
