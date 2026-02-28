# Sentinel Design Document

> **Summary**: 아마존 마켓플레이스 브랜드 보호 플랫폼 — 전체 시스템 설계
>
> **Project**: Sentinel (센티널)
> **Date**: 2026-02-28
> **Status**: Draft
> **Planning Doc**: [Sentinel_Project_Context.md](../../../Sentinel_Project_Context.md)

---

## 1. Overview

### 1.1 Design Goals

- 3개 컴포넌트(Web + Crawler + Extension)의 통합 아키텍처 확립
- Supabase PostgreSQL 기반 전체 DB 스키마 확정
- 컴포넌트 간 API 계약(Request/Response) 명세
- 마일스톤별 구현 가능한 설계 (MS1→MS2→MS3 순차 빌드)

### 1.2 Design Decisions (블로킹 이슈 결정)

| # | 결정 사항 | 선택 | 근거 |
|---|----------|------|------|
| DD-01 | Crawler → DB 접근 패턴 | Web API 경유 | 보안 통일, RBAC 일관성 |
| DD-02 | Redis 배포 위치 | Upstash (서버리스) | 관리 불필요, 무료 티어, BullMQ 호환 |
| DD-03 | SC 자격증명 암호화 키 관리 | Supabase Vault | 추가 서비스 불필요, PostgreSQL 함수 접근 |
| DD-04 | 공유 타입 전략 | src/types 중심 (SSOT) | 간단한 구조, Crawler/Extension이 참조/복사 |

### 1.3 Design Principles

- CLAUDE.md 코딩 컨벤션 100% 준수 (type only, no enum, no any)
- Server Components 기본, 필요시에만 "use client"
- 모든 API 엔드포인트에 서버 사이드 RBAC 미들웨어
- Supabase RLS로 데이터 레벨 접근 제어

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         Sentinel System                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │ Sentinel Crawler │     │Sentinel Extension│                   │
│  │ (AWS/Railway)    │     │ (Chrome MV3)     │                   │
│  │                  │     │                  │                    │
│  │ Playwright       │     │ Content Script   │                   │
│  │ BullMQ Worker    │     │ Popup UI         │                   │
│  │ Anti-bot         │     │ Service Worker   │                   │
│  └────────┬─────────┘     └────────┬─────────┘                  │
│           │ HTTPS                   │ HTTPS                      │
│           ▼                         ▼                            │
│  ┌──────────────────────────────────────────────┐                │
│  │          Sentinel Web (Vercel)                │                │
│  │          Next.js 15 App Router                │                │
│  │                                               │                │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │                │
│  │  │ API      │  │ Pages    │  │ Auth     │    │                │
│  │  │ Routes   │  │ (SSR/SC) │  │ Google   │    │                │
│  │  │          │  │          │  │ OAuth    │    │                │
│  │  └────┬─────┘  └──────────┘  └──────────┘   │                │
│  │       │                                       │                │
│  └───────┼───────────────────────────────────────┘                │
│          │                                                        │
│  ┌───────┼────────────────────────────────────────────────┐      │
│  │ External Services                                       │      │
│  │       │                                                 │      │
│  │  ┌────▼─────┐  ┌──────────┐  ┌──────────┐  ┌────────┐│      │
│  │  │ Supabase │  │ Claude   │  │ Monday   │  │Upstash ││      │
│  │  │ (DB+Auth │  │ API      │  │ .com     │  │(Redis) ││      │
│  │  │ +Storage)│  │ (Opus)   │  │ GraphQL  │  │        ││      │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘│      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                  │
│  ┌────────────────────────────────────────┐                      │
│  │ Seller Central (Browser Automation)     │                     │
│  │ Playwright → SC Web UI → Case Open      │                     │
│  └────────────────────────────────────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
[수집]
Crawler (키워드 캠페인)  ──POST /api/listings──▶ Sentinel Web API ──▶ Supabase DB
Extension (오퍼레이터)   ──POST /api/listings──▶ Sentinel Web API ──▶ Supabase DB

[분석]
Sentinel Web ──▶ 의심 리스팅 필터링 ──▶ POST Claude API (이미지+텍스트+특허)
Claude API ──▶ 위반 판정 + 신고서 드래프트 ──▶ Supabase DB (reports 테이블)

[승인]
Editor/Admin ──▶ 신고 대기열 검토 ──▶ 승인/반려/직접 수정 후 승인
승인 ──▶ Playwright SC 자동화 ──▶ Seller Central 케이스 오픈

[팔로업]
BullMQ 스케줄러 ──▶ Crawler 재방문 ──▶ 스냅샷 diff 비교
변화 감지 ──▶ Supabase Realtime ──▶ 인앱 알림
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| Sentinel Web | Supabase, Claude API, Upstash | DB, AI 분석, 큐 관리 |
| Sentinel Crawler | Sentinel Web API, Upstash, Proxy | 데이터 수집, 스케줄링 |
| Sentinel Extension | Sentinel Web API | 인증, 데이터 전송 |
| SC 자동화 | Sentinel Web, Playwright | 신고 접수 자동화 |

---

## 3. Data Model

### 3.1 Entity Relationship Diagram

```
[users] 1───N [campaigns]
  │              │
  │              └──1───N [campaign_listings]───N───1 [listings]
  │                                                    │
  │                                                    └──1───N [reports]
  │                                                              │
  │                                                              ├──N───1 [report_patents] ───N───1 [patents]
  │                                                              │
  │                                                              └──1───N [report_snapshots]
  │
  ├──1───N [notifications]
  │
  └──(감사) [audit_logs]

[report_templates] (독립)
[changelog_entries] (독립)
[system_configs] (독립)
```

### 3.2 Database Schema

#### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'editor', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- @spigen.com 도메인 체크 (RLS가 아닌 Auth 레벨에서 처리)
-- Supabase Auth → Google OAuth → 도메인 필터링
```

#### campaigns

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  marketplace TEXT NOT NULL DEFAULT 'US'
    CHECK (marketplace IN ('US', 'UK', 'JP', 'DE', 'FR', 'IT', 'ES', 'CA', 'AU')),
  start_date DATE NOT NULL,
  end_date DATE,
  frequency TEXT NOT NULL DEFAULT 'daily'
    CHECK (frequency IN ('daily', 'every_12h', 'every_6h')),
  max_pages INTEGER NOT NULL DEFAULT 3
    CHECK (max_pages BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'scheduled')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### listings

```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asin TEXT NOT NULL,
  marketplace TEXT NOT NULL,
  title TEXT,
  description TEXT,
  bullet_points JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',          -- [{url, position, alt}]
  price_amount NUMERIC(10,2),
  price_currency TEXT DEFAULT 'USD',
  seller_name TEXT,
  seller_id TEXT,
  brand TEXT,
  category TEXT,
  rating NUMERIC(2,1),
  review_count INTEGER,
  is_suspect BOOLEAN NOT NULL DEFAULT false,
  suspect_reasons JSONB DEFAULT '[]', -- ["keyword_flag", "image_flag", ...]
  source TEXT NOT NULL
    CHECK (source IN ('crawler', 'extension')),
  source_campaign_id UUID REFERENCES campaigns(id),
  source_user_id UUID REFERENCES users(id),       -- Extension 제보자
  raw_data JSONB,                     -- 원본 수집 데이터 전체
  crawled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (asin, marketplace, crawled_at::date)   -- 일 단위 중복 방지
);

CREATE INDEX idx_listings_asin ON listings(asin);
CREATE INDEX idx_listings_marketplace ON listings(marketplace);
CREATE INDEX idx_listings_is_suspect ON listings(is_suspect) WHERE is_suspect = true;
CREATE INDEX idx_listings_source_campaign ON listings(source_campaign_id);
```

#### campaign_listings (매핑 테이블)

```sql
CREATE TABLE campaign_listings (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  page_number INTEGER,
  position_in_page INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (campaign_id, listing_id)
);
```

#### reports

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id),
  violation_type TEXT NOT NULL
    CHECK (violation_type ~ '^V[0-9]{2}$'),   -- V01~V19
  violation_category TEXT NOT NULL
    CHECK (violation_category IN (
      'intellectual_property',
      'listing_content',
      'review_manipulation',
      'selling_practice',
      'regulatory_safety'
    )),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',
      'pending_review',
      'approved',
      'rejected',
      'cancelled',
      'submitted',
      'monitoring',
      'resolved',
      'unresolved',
      'resubmitted',
      'escalated'
    )),

  -- AI 분석 결과
  ai_analysis JSONB,                  -- {violation_detected, confidence, reasons[], evidence[]}
  ai_severity TEXT
    CHECK (ai_severity IN ('high', 'medium', 'low')),
  ai_confidence_score INTEGER
    CHECK (ai_confidence_score BETWEEN 0 AND 100),

  -- 신고서 드래프트
  draft_title TEXT,
  draft_body TEXT,
  draft_evidence JSONB DEFAULT '[]',  -- [{type, url, description}]
  draft_policy_references JSONB DEFAULT '[]', -- [{code, url, section}]

  -- 수정 이력 (Editor가 직접 수정한 경우)
  original_draft_body TEXT,           -- AI 원본 (수정본 학습용)
  edited_by UUID REFERENCES users(id),
  edited_at TIMESTAMPTZ,

  -- 반려 정보
  rejected_by UUID REFERENCES users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  rejection_category TEXT
    CHECK (rejection_category IN (
      'insufficient_evidence',
      'wrong_violation_type',
      'inaccurate_policy_reference',
      'over_detection',
      'duplicate',
      'other'
    )),

  -- 취소 정보
  cancelled_by UUID REFERENCES users(id),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- 승인 정보
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  -- SC 신고 정보
  sc_case_id TEXT,                    -- Seller Central 케이스 번호
  sc_submitted_at TIMESTAMPTZ,
  sc_submission_error TEXT,

  -- 팔로업
  monitoring_started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_type TEXT
    CHECK (resolution_type IN (
      'listing_removed',
      'content_modified',
      'seller_removed',
      'no_change'
    )),

  -- 재신고
  parent_report_id UUID REFERENCES reports(id), -- 원본 신고 참조 (재신고 시)
  escalation_level INTEGER DEFAULT 0,           -- 0: 일반, 1: 재신고, 2: 에스컬레이션

  -- 메타
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 중복 방지: 동일 ASIN + 위반 유형 + 활성 상태
  UNIQUE (listing_id, violation_type) WHERE status NOT IN ('cancelled', 'resolved')
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_listing ON reports(listing_id);
CREATE INDEX idx_reports_violation ON reports(violation_type);
CREATE INDEX idx_reports_created_by ON reports(created_by);
```

#### report_snapshots (팔로업 스냅샷)

```sql
CREATE TABLE report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL
    CHECK (snapshot_type IN ('initial', 'followup')),
  listing_data JSONB NOT NULL,        -- 해당 시점의 리스팅 전체 데이터
  diff_from_initial JSONB,            -- initial 대비 변경 사항 (followup만)
  change_detected BOOLEAN DEFAULT false,
  change_type TEXT
    CHECK (change_type IN (
      'listing_removed',
      'content_modified',
      'seller_changed',
      'no_change'
    )),
  crawled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_snapshots_report ON report_snapshots(report_id);
```

#### patents

```sql
CREATE TABLE patents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monday_item_id TEXT UNIQUE,         -- Monday.com 아이템 ID (동기화 키)
  patent_number TEXT NOT NULL,
  patent_name TEXT NOT NULL,
  keywords JSONB DEFAULT '[]',        -- 크롤링 비교용 키워드 배열
  image_urls JSONB DEFAULT '[]',      -- 디자인 특허 이미지
  country TEXT NOT NULL DEFAULT 'US',
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'pending')),
  synced_at TIMESTAMPTZ,              -- 마지막 Monday.com 동기화 시점
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### report_patents (N:M 관계)

```sql
CREATE TABLE report_patents (
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  patent_id UUID NOT NULL REFERENCES patents(id),
  similarity_score INTEGER CHECK (similarity_score BETWEEN 0 AND 100),
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (report_id, patent_id)
);
```

#### notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN (
      'report_approved',
      'report_rejected',
      'report_submitted',
      'followup_change_detected',
      'followup_no_change',
      'campaign_completed',
      'system_error',
      'patent_sync_completed',
      'changelog_new'
    )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',        -- {report_id, campaign_id, ...}
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, is_read) WHERE is_read = false;
```

#### audit_logs (변경 불가 감사 로그)

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,           -- 순차 ID (해시 체인용)
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL
    CHECK (action IN (
      'login', 'logout',
      'role_changed',
      'report_created', 'report_approved', 'report_rejected',
      'report_cancelled', 'report_submitted', 'report_edited',
      'sc_credential_accessed', 'sc_credential_updated',
      'campaign_created', 'campaign_updated', 'campaign_deleted',
      'patent_sync_triggered', 'patent_sync_completed',
      'settings_changed',
      'system_error'
    )),
  resource_type TEXT,                 -- 'report', 'campaign', 'user', ...
  resource_id TEXT,                   -- 대상 리소스 ID
  before_data JSONB,                  -- 변경 전 값
  after_data JSONB,                   -- 변경 후 값
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- append-only: DELETE/UPDATE 권한 제거
REVOKE DELETE, UPDATE ON audit_logs FROM authenticated;
REVOKE DELETE, UPDATE ON audit_logs FROM service_role;

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

#### report_templates

```sql
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_type TEXT NOT NULL UNIQUE
    CHECK (violation_type ~ '^V[0-9]{2}$'),
  template_title TEXT NOT NULL,
  template_body TEXT NOT NULL,         -- 신고서 템플릿 본문 (변수 포함)
  policy_references JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### changelog_entries

```sql
CREATE TABLE changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,              -- "1.2.0"
  category TEXT NOT NULL
    CHECK (category IN ('new', 'fix', 'policy', 'ai')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_changelog_created ON changelog_entries(created_at DESC);
```

#### system_configs

```sql
CREATE TABLE system_configs (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 초기 설정값
INSERT INTO system_configs (key, value, description) VALUES
  ('followup_intervals', '{"warning_days": [7, 14], "unresolved_days": 30}', '팔로업 미해결 알림 기간'),
  ('crawling_defaults', '{"max_pages": 3, "delay_ms": [2000, 5000]}', '크롤링 기본 설정'),
  ('ai_config', '{"model": "claude-opus-4-6", "max_retries": 3, "batch_size": 10}', 'AI 분석 설정'),
  ('sc_config', '{"auto_submit": false, "max_daily_submissions": 50}', 'Seller Central 설정');
```

### 3.3 Supabase Vault (SC 자격증명)

```sql
-- Supabase Vault에 SC 자격증명 저장
-- vault.create_secret() / vault.read_secret() 사용

-- SC 자격증명 메타데이터 테이블 (실제 비밀번호는 Vault에)
CREATE TABLE sc_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  vault_secret_id UUID NOT NULL,      -- Supabase Vault secret 참조
  mfa_vault_secret_id UUID,           -- TOTP seed (Vault)
  last_used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin만 접근 가능
ALTER TABLE sc_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only" ON sc_credentials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

### 3.4 Row Level Security (RLS)

```sql
-- users: 본인 읽기, Admin만 수정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_update" ON users FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- campaigns: 모두 읽기, Editor 이상 CRUD
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_select" ON campaigns FOR SELECT USING (true);
CREATE POLICY "campaigns_insert" ON campaigns FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "campaigns_update" ON campaigns FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "campaigns_delete" ON campaigns FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- reports: 모두 읽기, Editor 자기 것 CRU, Admin 전체 CRUD
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_select" ON reports FOR SELECT USING (true);
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "reports_update_own" ON reports FOR UPDATE USING (
  (created_by = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'editor'))
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- notifications: 본인만
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- audit_logs: Admin만 읽기, INSERT는 서비스 롤
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin_read" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
```

---

## 4. API Specification

### 4.1 인증 미들웨어

```typescript
// 모든 API Route에 적용
// src/lib/auth/middleware.ts

type ApiHandler = (req: NextRequest, context: { user: User }) => Promise<NextResponse>

const withAuth = (handler: ApiHandler, allowedRoles: Role[]): ApiHandler
```

### 4.2 Endpoint List

#### Listings API

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| POST | /api/listings | 리스팅 데이터 수집 (Crawler/Extension) | Required | editor+ |
| GET | /api/listings | 리스팅 목록 조회 (필터/페이징) | Required | viewer+ |
| GET | /api/listings/:id | 리스팅 상세 조회 | Required | viewer+ |

**POST /api/listings**

Crawler와 Extension이 수집한 리스팅 데이터를 저장합니다.

```typescript
// Request
type CreateListingRequest = {
  asin: string
  marketplace: string
  title: string
  description?: string
  bullet_points?: string[]
  images?: { url: string; position: number }[]
  price_amount?: number
  price_currency?: string
  seller_name?: string
  seller_id?: string
  brand?: string
  category?: string
  rating?: number
  review_count?: number
  source: 'crawler' | 'extension'
  source_campaign_id?: string    // crawler만
  raw_data?: Record<string, unknown>
}

// Response 201
type CreateListingResponse = {
  id: string
  asin: string
  is_suspect: boolean
  suspect_reasons: string[]
  created_at: string
}

// 409: 동일 ASIN+marketplace+날짜 중복
// 400: 필수 필드 누락
```

#### Campaigns API

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/campaigns | 캠페인 목록 | Required | viewer+ |
| POST | /api/campaigns | 캠페인 생성 | Required | editor+ |
| GET | /api/campaigns/:id | 캠페인 상세 (수집 현황 포함) | Required | viewer+ |
| PATCH | /api/campaigns/:id | 캠페인 수정 | Required | editor+ |
| DELETE | /api/campaigns/:id | 캠페인 삭제 | Required | admin |
| POST | /api/campaigns/:id/pause | 캠페인 일시 중지 | Required | editor+ |
| POST | /api/campaigns/:id/resume | 캠페인 재개 | Required | editor+ |
| GET | /api/campaigns/:id/export | 결과 엑셀 다운로드 | Required | editor+ |

#### Reports API

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/reports | 신고 목록 (대기열) | Required | viewer+ |
| POST | /api/reports | 신고 생성 (AI 분석 트리거) | Required | editor+ |
| GET | /api/reports/:id | 신고 상세 | Required | viewer+ |
| PATCH | /api/reports/:id | 신고 수정 (드래프트 편집) | Required | editor+ |
| POST | /api/reports/:id/approve | 승인 | Required | editor+ |
| POST | /api/reports/:id/reject | 반려 (사유 필수) | Required | editor+ |
| POST | /api/reports/:id/cancel | 취소 (사유 필수) | Required | editor+ |
| POST | /api/reports/:id/submit | SC 신고 접수 트리거 | Required | editor+ |
| POST | /api/reports/:id/resubmit | 재신고 (AI 강화 드래프트) | Required | editor+ |

**POST /api/reports/:id/reject**

```typescript
// Request
type RejectReportRequest = {
  rejection_reason: string          // 필수
  rejection_category:               // 필수
    | 'insufficient_evidence'
    | 'wrong_violation_type'
    | 'inaccurate_policy_reference'
    | 'over_detection'
    | 'duplicate'
    | 'other'
}

// Response 200
type RejectReportResponse = {
  id: string
  status: 'rejected'
  rejected_at: string
}
```

**POST /api/reports/:id/approve**

```typescript
// Request (선택: 직접 수정 후 승인 시)
type ApproveReportRequest = {
  edited_draft_body?: string        // Editor가 수정한 경우
  edited_draft_title?: string
}

// 수정된 경우: original_draft_body에 원본 저장, draft_body에 수정본 저장
// Response 200
type ApproveReportResponse = {
  id: string
  status: 'approved'
  approved_at: string
  was_edited: boolean
}
```

#### AI API

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| POST | /api/ai/analyze | AI 위반 분석 요청 | Required | editor+ |
| POST | /api/ai/draft | AI 신고서 드래프트 생성 | Required | editor+ |
| POST | /api/ai/redraft | AI 강화 재신고서 생성 | Required | editor+ |

**POST /api/ai/analyze**

```typescript
// Request
type AiAnalyzeRequest = {
  listing_id: string
}

// Response 200
type AiAnalyzeResponse = {
  listing_id: string
  violation_detected: boolean
  violations: {
    type: string                     // V01~V19
    category: string
    severity: 'high' | 'medium' | 'low'
    confidence_score: number         // 0~100
    reasons: string[]
    evidence: { type: string; description: string }[]
    policy_references: { code: string; url: string; section: string }[]
  }[]
}

// 500: Claude API 장애 → 재시도 큐 등록
// 429: Rate Limit → exponential backoff
```

#### Patents API

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/patents | 특허 목록 | Required | viewer+ |
| GET | /api/patents/:id | 특허 상세 | Required | viewer+ |
| POST | /api/patents/sync | Monday.com 동기화 트리거 | Required | admin |

#### Users API

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/users | 사용자 목록 | Required | admin |
| PATCH | /api/users/:id/role | 권한 변경 | Required | admin |

#### Notifications API

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/notifications | 내 알림 목록 | Required | viewer+ |
| PATCH | /api/notifications/:id/read | 읽음 처리 | Required | viewer+ |
| POST | /api/notifications/read-all | 전체 읽음 | Required | viewer+ |

#### System API

| Method | Path | Description | Auth | Role |
|--------|------|-------------|------|------|
| GET | /api/system/health | 시스템 상태 | Required | admin |
| GET | /api/audit-logs | 감사 로그 조회 | Required | admin |
| GET | /api/changelog | 변경 이력 | Required | viewer+ |
| POST | /api/changelog | 변경 이력 추가 | Required | admin |

---

## 5. UI/UX Design

### 5.1 Page Structure

```
/                           → 리다이렉트 (/dashboard 또는 /login)
/login                      → Google OAuth 로그인
/dashboard                  → 대시보드 (통계 카드 + 차트)
/campaigns                  → 캠페인 목록
/campaigns/new              → 캠페인 생성
/campaigns/:id              → 캠페인 상세 (수집 현황)
/reports                    → 신고 대기열 (핵심 페이지)
/reports/:id                → 신고 상세 (AI 분석 + 드래프트 + 승인)
/listings                   → 리스팅 목록 (전체/의심)
/listings/:id               → 리스팅 상세
/patents                    → 특허 레지스트리
/settings                   → 설정
/settings/users             → 사용자 관리 (Admin)
/settings/templates         → 신고 템플릿 관리 (Admin)
/settings/system            → 시스템 설정 (Admin)
/changelog                  → 변경 이력
/audit-logs                 → 감사 로그 (Admin)
```

### 5.2 Layout

```
┌─────────────────────────────────────────────────┐
│  Header (로고, 알림 벨, 프로필 드롭다운)           │
├────────┬────────────────────────────────────────┤
│        │                                        │
│ Side   │  Main Content Area                     │
│ bar    │                                        │
│        │                                        │
│ - 대시  │                                        │
│   보드  │                                        │
│ - 캠페  │                                        │
│   인    │                                        │
│ - 신고  │                                        │
│   대기열│                                        │
│ - 리스  │                                        │
│   팅    │                                        │
│ - 특허  │                                        │
│ - 설정  │                                        │
│         │                                        │
├────────┴────────────────────────────────────────┤
│  (Footer 없음 — 내부 도구)                        │
└─────────────────────────────────────────────────┘
```

### 5.3 Core Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| AppLayout | src/components/layout/ | Header + Sidebar + Main wrapper |
| Sidebar | src/components/layout/ | Navigation, 역할별 메뉴 필터링 |
| Header | src/components/layout/ | 알림 벨, 프로필, Changelog 배너 |
| ReportQueue | src/components/features/ | 신고 대기열 리스트 (필터/정렬) |
| ReportDetail | src/components/features/ | 신고 상세 (분석+드래프트+액션) |
| ReportDraftEditor | src/components/features/ | AI 드래프트 편집기 (직접 수정용) |
| CampaignForm | src/components/features/ | 캠페인 생성/수정 폼 |
| CampaignStats | src/components/features/ | 캠페인별 수집 현황 |
| ListingCard | src/components/features/ | 리스팅 요약 카드 |
| DashboardStats | src/components/features/ | 통계 카드 (신고 수, 해결률 등) |
| NotificationBell | src/components/features/ | 인앱 알림 드롭다운 |
| ViolationBadge | src/components/ui/ | 위반 유형 뱃지 (V01~V19) |
| StatusBadge | src/components/ui/ | 신고 상태 뱃지 (색상별) |
| Button | src/components/ui/ | 공통 버튼 |
| Input | src/components/ui/ | 공통 입력 필드 |
| Modal | src/components/ui/ | 공통 모달 |
| DataTable | src/components/ui/ | 공통 테이블 (정렬/필터/페이징) |

---

## 6. Error Handling

### 6.1 API Error Response Format

```typescript
type ApiErrorResponse = {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}
```

### 6.2 Error Codes

| Code | HTTP | Message | Handling |
|------|------|---------|----------|
| AUTH_REQUIRED | 401 | 인증이 필요합니다 | 로그인 리다이렉트 |
| FORBIDDEN | 403 | 권한이 없습니다 | 역할 안내 메시지 |
| NOT_FOUND | 404 | 리소스를 찾을 수 없습니다 | 404 페이지 |
| DUPLICATE_LISTING | 409 | 이미 수집된 리스팅입니다 | 기존 데이터 참조 안내 |
| DUPLICATE_REPORT | 409 | 이미 활성 신고가 있습니다 | 기존 신고 링크 제공 |
| AI_ANALYSIS_FAILED | 500 | AI 분석에 실패했습니다 | 재시도 버튼 + 수동 전환 안내 |
| AI_RATE_LIMITED | 429 | AI API 한도 초과 | 자동 재시도 예약 안내 |
| SC_SUBMISSION_FAILED | 500 | SC 신고 접수에 실패했습니다 | 수동 접수 Fallback 안내 |
| VALIDATION_ERROR | 400 | 입력값이 유효하지 않습니다 | 필드별 오류 메시지 |

### 6.3 Fallback 전략

| 실패 시나리오 | Fallback |
|-------------|----------|
| Claude API 장애 | 대기열에 "AI 분석 실패" 표시, Editor 수동 드래프트 작성 가능 |
| Claude API Rate Limit | BullMQ 큐에 재시도 예약 (exponential backoff: 1분→2분→4분) |
| Monday.com 동기화 실패 | 기존 특허 데이터 유지, Admin 알림, 다음 스케줄에 자동 재시도 |
| SC 자동 신고 실패 | "수동 접수 필요" 상태로 전환, 드래프트 데이터를 클립보드 복사 버튼 제공 |
| Crawler 차단/CAPTCHA | 해당 세션 중단, 다른 프록시로 재시도, 3회 실패 시 Admin 알림 |

---

## 7. Security Considerations

기획 문서 섹션 7-1 보안 요구사항 기반:

- [x] 모든 API 엔드포인트에 서버 사이드 RBAC 미들웨어 (withAuth)
- [x] Supabase RLS 정책 전 테이블 적용
- [x] SC 자격증명: Supabase Vault 암호화 + 접근 감사 로그
- [x] Claude API: 서버 사이드 전용, 시스템/사용자 프롬프트 분리
- [x] AI 응답 JSON 스키마 검증
- [x] 감사 로그 append-only (DELETE/UPDATE 권한 제거)
- [x] 세션: Idle 30분, Absolute 8시간, httpOnly/Secure/SameSite=Strict
- [x] 동시 세션 최대 3개
- [x] Extension-Web: HTTPS + CORS + Origin 검증 + JWT
- [x] 보안 헤더: HSTS, X-Frame-Options, CSP

---

## 8. Implementation Guide

### 8.1 File Structure

```
src/
  app/
    (auth)/
      login/page.tsx
    (protected)/              # 인증 필수 레이아웃 그룹
      layout.tsx              # AppLayout (Sidebar + Header)
      dashboard/page.tsx
      campaigns/
        page.tsx
        new/page.tsx
        [id]/page.tsx
      reports/
        page.tsx
        [id]/page.tsx
      listings/
        page.tsx
        [id]/page.tsx
      patents/page.tsx
      settings/
        page.tsx
        users/page.tsx
        templates/page.tsx
        system/page.tsx
      changelog/page.tsx
      audit-logs/page.tsx
    api/
      auth/callback/route.ts
      listings/route.ts
      listings/[id]/route.ts
      campaigns/route.ts
      campaigns/[id]/route.ts
      campaigns/[id]/pause/route.ts
      campaigns/[id]/resume/route.ts
      campaigns/[id]/export/route.ts
      reports/route.ts
      reports/[id]/route.ts
      reports/[id]/approve/route.ts
      reports/[id]/reject/route.ts
      reports/[id]/cancel/route.ts
      reports/[id]/submit/route.ts
      reports/[id]/resubmit/route.ts
      ai/analyze/route.ts
      ai/draft/route.ts
      ai/redraft/route.ts
      patents/route.ts
      patents/sync/route.ts
      users/route.ts
      users/[id]/role/route.ts
      notifications/route.ts
      notifications/[id]/read/route.ts
      notifications/read-all/route.ts
      system/health/route.ts
      audit-logs/route.ts
      changelog/route.ts
  components/
    ui/
      Button.tsx
      Input.tsx
      Modal.tsx
      Badge.tsx
      DataTable.tsx
      Select.tsx
      Textarea.tsx
      Card.tsx
      Spinner.tsx
    features/
      ReportQueue.tsx
      ReportDetail.tsx
      ReportDraftEditor.tsx
      CampaignForm.tsx
      CampaignStats.tsx
      ListingCard.tsx
      DashboardStats.tsx
      DashboardCharts.tsx
      NotificationBell.tsx
      PatentList.tsx
      AuditLogTable.tsx
      ChangelogList.tsx
      UserManagement.tsx
    layout/
      AppLayout.tsx
      Sidebar.tsx
      Header.tsx
  lib/
    supabase/
      client.ts               # 브라우저용 클라이언트
      server.ts               # 서버용 클라이언트
      admin.ts                # Service Role 클라이언트 (API Route용)
    auth/
      middleware.ts            # withAuth RBAC 미들웨어
      session.ts               # 세션 관리
    ai/
      client.ts               # Claude API 클라이언트
      prompts.ts              # 위반 유형별 프롬프트
      schema-validator.ts     # AI 응답 JSON 스키마 검증
      feedback.ts             # 반려/수정 피드백 관리
    utils/
      suspect-filter.ts        # 의심 리스팅 필터링 로직
      export.ts                # 엑셀 내보내기
  hooks/
    useReports.ts
    useCampaigns.ts
    useNotifications.ts
    useUser.ts
  types/
    users.ts
    campaigns.ts
    listings.ts
    reports.ts
    violations.ts
    patents.ts
    notifications.ts
    audit-logs.ts
    api.ts                     # Request/Response 타입
  constants/
    violations.ts              # V01~V19 위반 유형 상수
    marketplaces.ts            # 지원 마켓플레이스
    restricted-keywords.ts     # 금지/의심 키워드

supabase/
  migrations/
    001_initial_schema.sql
    002_rls_policies.sql
    003_vault_setup.sql

crawler/                       # 별도 패키지
  src/
    index.ts
    scraper/
      amazon-scraper.ts
      page-parser.ts
    anti-bot/
      proxy-manager.ts
      fingerprint.ts
      behavior.ts
    scheduler/
      queue.ts                 # BullMQ 큐 정의
      worker.ts                # BullMQ 워커
      followup-worker.ts       # 팔로업 재방문 워커
    api-client/
      sentinel-api.ts          # Sentinel Web API 클라이언트
    sc-automation/
      sc-browser.ts            # SC Playwright 자동화
      sc-form-filler.ts        # 신고 폼 채우기
  package.json
  tsconfig.json

extension/                     # 별도 패키지
  src/
    manifest.json
    content/
      content-script.ts        # 아마존 DOM 파싱
      dom-parser.ts
    popup/
      popup.html
      popup.ts                 # 위반 유형 선택 UI
      popup.css
    background/
      service-worker.ts
    lib/
      api-client.ts            # Sentinel Web API 클라이언트
      auth.ts                  # 인증 상태 확인
  package.json
  tsconfig.json
```

### 8.2 Implementation Order (마일스톤별)

#### MS1: 데이터 수집 + 기본 웹

```
1. [ ] Supabase 프로젝트 셋업 + 마이그레이션 (users, campaigns, listings)
2. [ ] Google OAuth + Supabase Auth 연동
3. [ ] withAuth RBAC 미들웨어
4. [ ] AppLayout (Sidebar + Header)
5. [ ] /api/listings POST/GET
6. [ ] /api/campaigns CRUD
7. [ ] 캠페인 관리 UI (목록/생성/상세)
8. [ ] Crawler: 아마존 크롤링 엔진 + Anti-bot
9. [ ] Crawler: BullMQ 스케줄러
10. [ ] Extension: Content Script + Popup UI
11. [ ] Extension: Sentinel Web API 연동
12. [ ] 의심 리스팅 필터링 로직
13. [ ] 신고 대기열 기본 UI
14. [ ] 중복 제보 방지 (F26)
15. [ ] 감사 로그 기본 (F27)
```

#### MS2: AI 분석 + 신고 파이프라인

```
16. [ ] reports 테이블 마이그레이션
17. [ ] Claude API 클라이언트 + 프롬프트 설계
18. [ ] AI 응답 JSON 스키마 검증
19. [ ] /api/ai/analyze, /api/ai/draft
20. [ ] 신고 상세 페이지 (AI 분석 + 드래프트)
21. [ ] 승인/반려/직접 수정 후 승인 워크플로우
22. [ ] 반려 피드백 루프 (반려 사유 저장 + AI 학습)
23. [ ] 수정본 학습 (원본 vs 수정본 diff)
24. [ ] 신고 상태 라이프사이클 (F20a)
25. [ ] Monday.com 특허 동기화
26. [ ] AI 특허 유사도 분석
27. [ ] SC 반자동 신고 (F13a)
28. [ ] AI 강화 재신고 (F30)
```

#### MS3: 운영 기능 + 완성

```
29. [ ] 팔로업 모니터링 (F19, F20b, F21)
30. [ ] 대시보드 + 차트 (F15)
31. [ ] Supabase Realtime 인앱 알림
32. [ ] Changelog 페이지 + 배너 (F22)
33. [ ] 다국가 확장 (F04b: UK, JP)
34. [ ] SC 완전 자동 (F13b)
35. [ ] 자동 리포트 (F17)
36. [ ] 트렌드 분석 (F18)
37. [ ] 시스템 모니터링 (F28)
38. [ ] 신고 템플릿 관리 (F29)
39. [ ] Extension 업데이트 알림 (F31)
40. [ ] 필터 기준 관리 (F32)
```

---

## 9. Environment Variables

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # 서버 전용

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Claude API
ANTHROPIC_API_KEY=sk-ant-xxx           # 서버 전용

# Monday.com
MONDAY_API_TOKEN=xxx                   # 서버 전용

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Proxy
PROXY_API_KEY=xxx                      # Crawler 전용
PROXY_SERVICE=brightdata               # brightdata | oxylabs

# App
NEXT_PUBLIC_APP_URL=https://sentinel.spigen.com
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-28 | Initial draft — 전체 시스템 설계 | Claude |
