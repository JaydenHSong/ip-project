# Supabase Integration Design Document

> **Summary**: Mock → Supabase 실 연동을 위한 코드 수정 + 설정 가이드 + 검증 설계
>
> **Project**: Sentinel (센티널)
> **Author**: Claude
> **Date**: 2026-03-02
> **Status**: Draft
> **Planning Doc**: [supabase-integration.plan.md](../../01-plan/features/supabase-integration.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. `settings` → `system_configs` 테이블 참조 불일치 해결
2. DB 스키마와 코드 간 컬럼명/상태값 불일치 전수 수정
3. Dashboard Stats 실 집계 쿼리 구현
4. `.env.local.example` + Supabase 설정 가이드 작성
5. 모든 수정 후 `pnpm build` + `pnpm typecheck` 통과 보장

### 1.2 Design Principles

- **최소 변경**: 기존 아키텍처(Demo/Real 분기) 유지, 버그만 수정
- **하위 호환**: `DEMO_MODE=true` 상태에서도 기존 기능 정상 동작
- **점진적 전환**: Phase A(코드 수정) → Phase B(Supabase 설정) → Phase C(검증) 순서

---

## 2. Critical Issues Found (코드 분석 결과)

### 2.1 P0 — Runtime 에러 (Supabase 연결 시 즉시 깨짐)

| # | Issue | Files | Root Cause |
|---|-------|-------|------------|
| **C1** | `.from('settings')` — 테이블 미존재 | `api/settings/monitoring/route.ts` (4곳), `api/monitoring/pending/route.ts` (2곳) | DB에는 `system_configs` 테이블만 존재 |
| **C2** | `status = 'archived'` — DB CHECK 위반 | `reports/archived/page.tsx` | `reports.status` CHECK 제약조건에 `'archived'` 없음 |
| **C3** | `archived_at`, `archive_reason` 컬럼 미존재 | `reports/archived/page.tsx`, `api/reports/[id]/archive/route.ts` | 마이그레이션에 해당 컬럼 없음 |
| **C4** | `.eq('entity_type', ...)` — 컬럼명 불일치 | `audit-logs/page.tsx` | DB 컬럼명은 `resource_type` |
| **C5** | Dashboard 실 모드 = 빈 배열 | `dashboard/page.tsx` | real-mode 분기가 빈 배열 반환 stub |
| **C6** | Dashboard Stats API = 항상 데모 | `api/dashboard/stats/route.ts` | real-mode 경로에서도 `getDemoDashboardStats()` 호출 |
| **C7** | `monitoring_interval_days`, `monitoring_max_days` 시드 누락 | `003_seed_data.sql` | upsert는 되지만 GET 시 빈 결과 |

### 2.2 P1 — 데이터 무결성 / 기능 저하

| # | Issue | Files | Impact |
|---|-------|-------|--------|
| **M1** | Reports 이중 status 필터 | `reports/page.tsx` | `.in(4개 status)` AND `.eq(param.status)` — 범위 밖 status 시 빈 결과 |
| **M2** | Completed 페이지 pagination 없음 | `reports/completed/page.tsx` | `limit(100)` 하드코딩, 100개 이후 데이터 누락 |
| **M3** | Campaign 상세 reports 쿼리 무제한 | `campaigns/[id]/page.tsx` | listings 많으면 reports 전체 로드 |
| **M4** | Supabase 에러 미처리 | 8개 페이지 전체 | `error` 필드 미확인, 실패 시 silent null |
| **M5** | Timeline actor UUID 미해석 | `reports/[id]/page.tsx` | approver/rejector/editor 항상 null |

---

## 3. Detailed Fix Specifications

### 3.1 [C1] `settings` → `system_configs` 테이블 통일

**수정 대상 파일 2개, 총 6곳:**

#### File 1: `src/app/api/settings/monitoring/route.ts`

```
Line 12: .from('settings') → .from('system_configs')
Line 18: .from('settings') → .from('system_configs')
Line 48: .from('settings') → .from('system_configs')
Line 66: .from('settings') → .from('system_configs')
```

**추가 수정**: `system_configs.value`는 `JSONB` 타입이므로:
- GET: `Number(setting.value)` → Supabase JS 클라이언트가 JSONB을 자동 파싱하므로 숫자면 그대로 `Number()` 가능
- PUT upsert: `value: val` → `value: val` (JSONB 컬럼에 숫자 리터럴 저장 OK)

#### File 2: `src/app/api/monitoring/pending/route.ts`

```
Line 12: .from('settings') → .from('system_configs')
Line 18: .from('settings') → .from('system_configs')
```

---

### 3.2 [C2+C3] `archived` 상태 + 컬럼 추가 (마이그레이션)

**현재 reports 테이블 CHECK:**
```sql
status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft','pending_review','approved','rejected','cancelled',
                     'submitted','monitoring','resolved','unresolved','resubmitted','escalated'))
```

**해결 방법**: 마이그레이션 추가 (`004_add_archived_status.sql`)

```sql
-- 1. status CHECK 제약조건에 'archived' 추가
ALTER TABLE reports DROP CONSTRAINT reports_status_check;
ALTER TABLE reports ADD CONSTRAINT reports_status_check
  CHECK (status IN ('draft','pending_review','approved','rejected','cancelled',
                     'submitted','monitoring','resolved','unresolved','resubmitted',
                     'escalated','archived'));

-- 2. archived 관련 컬럼 추가
ALTER TABLE reports ADD COLUMN archived_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN archive_reason TEXT;
```

**영향 범위**: `api/reports/[id]/archive/route.ts`, `api/reports/[id]/unarchive/route.ts`, `reports/archived/page.tsx` — 이 파일들이 이미 `archived` 상태를 사용하고 있으므로 마이그레이션만 추가하면 됨.

---

### 3.3 [C4] `entity_type` → `resource_type` 컬럼명 수정

**수정 대상**: `src/app/(protected)/audit-logs/page.tsx`

```
필터 파라미터: entity_type → resource_type
쿼리: .eq('entity_type', ...) → .eq('resource_type', ...)
```

**주의**: Demo 데이터(`DEMO_AUDIT_LOGS`)도 `entity_type` 필드를 사용 중이라면 동시에 수정 필요.
- `src/lib/demo/data.ts`: `entity_type` → `resource_type` (DEMO_AUDIT_LOGS 배열)
- `src/types/audit-logs.ts`: 이미 `resource_type` 사용 중 (정상)

---

### 3.4 [C5+C6] Dashboard 실 데이터 구현

#### 3.4.1 `dashboard/page.tsx` — 서버 컴포넌트 실 쿼리

real-mode 분기에서 빈 배열 대신 실 Supabase 쿼리:

```typescript
// recentReports: 최근 10개 리포트
const { data: recentReports } = await supabase
  .from('reports')
  .select('*, listings!reports_listing_id_fkey(asin, title, marketplace, seller_name)')
  .order('created_at', { ascending: false })
  .limit(10)

// activeCampaigns: 활성 캠페인
const { data: activeCampaigns } = await supabase
  .from('campaigns')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(10)
```

#### 3.4.2 `api/dashboard/stats/route.ts` — 실 집계 API

real-mode 분기에서 Supabase 집계 쿼리:

```typescript
// period 필터용 날짜 계산
const periodStart = getPeriodStartDate(period) // '7d' | '30d' | '90d' | 'all'

// 1. 총 리포트 수 + 상태별 카운트
const { count: totalReports } = await supabase
  .from('reports')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', periodStart)

// 2. 상태별 그룹 카운트 (개별 쿼리)
const statusCounts = {}
for (const status of ['draft','pending_review','approved','submitted','monitoring','resolved']) {
  const { count } = await supabase
    .from('reports').select('*', { count: 'exact', head: true })
    .eq('status', status).gte('created_at', periodStart)
  statusCounts[status] = count ?? 0
}

// 3. 위반 유형별 분포
const { data: violationData } = await supabase
  .from('reports')
  .select('violation_type')
  .gte('created_at', periodStart)

// 4. 일별/주별 트렌드 (reports.created_at 기준)
const { data: trendData } = await supabase
  .from('reports')
  .select('created_at, status')
  .gte('created_at', periodStart)
  .order('created_at', { ascending: true })
```

**반환 형식**: 기존 `getDemoDashboardStats()` 반환 구조와 동일한 shape으로 가공하여 프론트엔드 호환성 유지.

---

### 3.5 [C7] 모니터링 설정 시드 데이터 추가

`003_seed_data.sql` 또는 신규 마이그레이션에 추가:

```sql
INSERT INTO system_configs (key, value, description) VALUES
  ('monitoring_interval_days', '3', 'Days between follow-up monitoring checks'),
  ('monitoring_max_days', '90', 'Maximum days to continue monitoring a report')
ON CONFLICT (key) DO NOTHING;
```

> `value` 컬럼이 JSONB이므로 `'3'`은 JSON number `3`으로 저장됨.

---

### 3.6 [M1] Reports 이중 status 필터 수정

**현재 (버그):**
```typescript
query = query.in('status', ['draft', 'pending_review', 'approved', 'rejected'])
if (params.status) query = query.eq('status', params.status)  // 충돌!
```

**수정:**
```typescript
if (params.status) {
  query = query.eq('status', params.status)
} else {
  query = query.in('status', ['draft', 'pending_review', 'approved', 'rejected'])
}
```

---

### 3.7 [M4] Supabase 에러 처리 패턴 추가

모든 서버 컴포넌트 페이지에 일관된 에러 처리:

```typescript
const { data, error, count } = await query
if (error) {
  console.error('Supabase query error:', error.message)
  // 빈 상태로 fallback (페이지는 렌더링하되 데이터 없음)
}
```

> `console.log` 금지 규칙(CLAUDE.md)에 따라 `console.error`만 사용. 프로덕션에서는 로깅 서비스로 교체 예정.

---

## 4. New File: `.env.local.example`

```bash
# ============================================
# Sentinel — Environment Variables
# ============================================
# Copy this file to .env.local and fill in real values
# cp .env.local.example .env.local

# --- Demo Mode ---
# Set to 'true' for demo/development without Supabase
# Set to 'false' or remove for real Supabase connection
DEMO_MODE=true

# --- Supabase (Required when DEMO_MODE=false) ---
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# --- Google OAuth (Required when DEMO_MODE=false) ---
# Create at: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET

# --- App URL ---
NEXT_PUBLIC_APP_URL=http://localhost:3000

# --- AI Analysis (Optional — only for AI features) ---
ANTHROPIC_API_KEY=sk-ant-...

# --- Monday.com (Optional — only for Patents sync) ---
MONDAY_API_TOKEN=

# --- Google Chat Webhook (Optional — notifications) ---
GOOGLE_CHAT_WEBHOOK_URL=
```

---

## 5. New File: `supabase/migrations/004_add_archived_status.sql`

```sql
-- Migration: Add 'archived' status to reports + archived columns
-- Required for: /reports/archived page, archive/unarchive API routes

-- 1. Drop old CHECK and add new with 'archived'
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE reports ADD CONSTRAINT reports_status_check
  CHECK (status IN (
    'draft', 'pending_review', 'approved', 'rejected', 'cancelled',
    'submitted', 'monitoring', 'resolved', 'unresolved', 'resubmitted',
    'escalated', 'archived'
  ));

-- 2. Add archive-related columns
ALTER TABLE reports ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- 3. Add monitoring seed data to system_configs
INSERT INTO system_configs (key, value, description) VALUES
  ('monitoring_interval_days', '3', 'Days between follow-up monitoring checks'),
  ('monitoring_max_days', '90', 'Maximum days to continue monitoring')
ON CONFLICT (key) DO NOTHING;
```

---

## 6. New File: `docs/guides/supabase-setup.md`

Supabase 프로젝트 설정 가이드 (사용자 직접 수행):

### Step 1: Supabase 프로젝트 생성
1. https://supabase.com/dashboard → New Project
2. Organization: 선택 또는 신규 생성
3. Project Name: `sentinel`
4. Database Password: 강력한 비밀번호 (저장해둘 것)
5. Region: `Northeast Asia (Tokyo)` — ap-northeast-1
6. Plan: Free 또는 Pro

### Step 2: 환경변수 복사
1. Settings → API → Project URL → `NEXT_PUBLIC_SUPABASE_URL`에 입력
2. Settings → API → anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 입력
3. Settings → API → service_role key → `SUPABASE_SERVICE_ROLE_KEY`에 입력

### Step 3: 마이그레이션 실행
1. SQL Editor 열기
2. `supabase/migrations/001_initial_schema.sql` 전체 복사 → 실행
3. `supabase/migrations/002_rls_policies.sql` 전체 복사 → 실행
4. `supabase/migrations/003_seed_data.sql` 전체 복사 → 실행
5. `supabase/migrations/004_add_archived_status.sql` 전체 복사 → 실행

### Step 4: Google OAuth 설정
1. GCP Console → APIs & Services → Credentials → Create OAuth Client ID
2. Application type: Web application
3. Authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
4. Client ID → `GOOGLE_CLIENT_ID`에 입력
5. Client Secret → `GOOGLE_CLIENT_SECRET`에 입력
6. Supabase Dashboard → Authentication → Providers → Google → Enable
7. Client ID와 Secret 입력 → Save

### Step 5: Storage 버킷 생성
1. Supabase Dashboard → Storage → New Bucket
2. Name: `monitoring`
3. Public: No (Private)
4. File size limit: 5MB
5. Allowed MIME types: `image/png, image/jpeg, image/webp`

### Step 6: 로컬 테스트
```bash
# .env.local에서 DEMO_MODE=false 설정 후
pnpm dev
# http://localhost:3000 접속 → Google 로그인 테스트
```

---

## 7. Implementation Order (Do Phase 체크리스트)

### Phase A: 코드 수정 (Claude 진행)

```
A-1. [C1] settings → system_configs 통일 (2 files, 6 replacements)
A-2. [C2+C3] 마이그레이션 004 작성 (archived status + columns + seed)
A-3. [C4] entity_type → resource_type 수정 (audit-logs page + demo data)
A-4. [C5] dashboard/page.tsx real-mode 실 쿼리 구현
A-5. [C6] dashboard/stats/route.ts 실 집계 쿼리 구현
A-6. [M1] reports/page.tsx 이중 status 필터 수정
A-7. [M4] 8개 서버 컴포넌트 Supabase 에러 처리 추가
A-8. .env.local.example 작성
A-9. docs/guides/supabase-setup.md 작성
A-10. pnpm typecheck + pnpm lint + pnpm build 확인
```

### Phase B: Supabase 프로젝트 설정 (사용자 수행)

```
B-1. Supabase 프로젝트 생성
B-2. 환경변수 복사 → .env.local
B-3. 마이그레이션 4개 실행
B-4. GCP OAuth Client ID 생성
B-5. Supabase Google Provider 활성화
B-6. Storage monitoring 버킷 생성
B-7. .env.local의 DEMO_MODE=false 설정
```

### Phase C: 검증 + 배포 (함께)

```
C-1. 로컬: Google OAuth 로그인 테스트
C-2. 로컬: Dashboard, Reports, Campaigns 페이지 데이터 확인
C-3. 로컬: Campaign/Report CRUD 동작 확인
C-4. 로컬: Archive/Unarchive 동작 확인
C-5. 로컬: Audit Logs 필터링 확인
C-6. pnpm build 성공 확인
C-7. Vercel 환경변수 설정
C-8. Vercel 배포 + 프로덕션 테스트
```

---

## 8. Files to Create/Modify Summary

### New Files (3)

| File | Purpose |
|------|---------|
| `.env.local.example` | 환경변수 템플릿 |
| `supabase/migrations/004_add_archived_status.sql` | archived 상태 + 컬럼 + 모니터링 시드 |
| `docs/guides/supabase-setup.md` | Supabase 프로젝트 설정 가이드 |

### Modified Files (12)

| File | Change | Issue |
|------|--------|-------|
| `src/app/api/settings/monitoring/route.ts` | `settings` → `system_configs` (4곳) | C1 |
| `src/app/api/monitoring/pending/route.ts` | `settings` → `system_configs` (2곳) | C1 |
| `src/app/(protected)/audit-logs/page.tsx` | `entity_type` → `resource_type` | C4 |
| `src/lib/demo/data.ts` | DEMO_AUDIT_LOGS `entity_type` → `resource_type` | C4 |
| `src/app/(protected)/dashboard/page.tsx` | 빈 배열 → 실 Supabase 쿼리 | C5 |
| `src/app/api/dashboard/stats/route.ts` | 데모 fallback → 실 집계 쿼리 | C6 |
| `src/app/(protected)/reports/page.tsx` | 이중 status 필터 수정 + 에러 처리 | M1, M4 |
| `src/app/(protected)/reports/[id]/page.tsx` | 에러 처리 추가 | M4 |
| `src/app/(protected)/reports/archived/page.tsx` | FK hint 통일 + 에러 처리 | M4 |
| `src/app/(protected)/reports/completed/page.tsx` | 에러 처리 추가 | M4 |
| `src/app/(protected)/campaigns/page.tsx` | 에러 처리 추가 | M4 |
| `src/app/(protected)/campaigns/[id]/page.tsx` | 에러 처리 추가 | M4 |

---

## 9. Test Checklist (Gap Analysis 기준)

| # | 검증 항목 | 기대 결과 |
|---|----------|----------|
| T1 | `pnpm typecheck` 통과 | 0 errors |
| T2 | `pnpm lint` 통과 | 0 errors |
| T3 | `pnpm build` 통과 | Build success |
| T4 | `.from('settings')` 검색 결과 0건 | 모두 `system_configs`로 전환됨 |
| T5 | `entity_type` 검색 결과 0건 (src/ 내) | 모두 `resource_type`로 전환됨 |
| T6 | `004_add_archived_status.sql` SQL 유효성 | 문법 오류 없음 |
| T7 | `.env.local.example` 존재 | 필수 변수 7개 포함 |
| T8 | Dashboard stats real-mode 경로에 `getDemoDashboardStats` 없음 | 실 쿼리로 대체됨 |
| T9 | Dashboard page real-mode 경로에 빈 배열 없음 | 실 쿼리로 대체됨 |
| T10 | 8개 서버 컴포넌트 모두 에러 처리 존재 | `if (error)` 패턴 확인 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial draft — 7 critical + 5 medium issues, 15 files | Claude |
