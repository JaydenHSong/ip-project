# Follow-up Monitoring Design Document

> **Feature**: 신고 후 팔로업 모니터링 (F19/F20b/F21/F35/F36)
>
> **Project**: Sentinel
> **Author**: Claude (PDCA)
> **Date**: 2026-03-02
> **Status**: Draft
> **Version**: 0.1
> **Plan Reference**: `docs/01-plan/features/follow-up-monitoring.plan.md`

---

## 1. Architecture Overview

```
[confirm-submitted API]
  → status = 'submitted' + monitoring_started_at 기록
  → 크롤러 재방문 대기

[크롤러 서버 (별도)]
  → GET /api/monitoring/pending → 재방문 대상 목록
  → 재방문 + 스크린샷 캡처
  → POST /api/monitoring/callback → 스냅샷 저장 + AI 분석 트리거

[AI Monitor API]
  → Haiku가 초기 vs 현재 스크린샷 비교
  → 변화 유형 판정 + 리마크 생성
  → 변화 감지 시 알림 발송 + 해결 제안

[Web UI]
  → /reports 모니터링 탭 (submitted/monitoring 목록)
  → /reports/[id] 스냅샷 뷰어 (before/after + 리마크)
  → /reports/[id] resolve 액션 (해결/미해결 확정)
  → /settings 모니터링 주기 설정
```

---

## 2. DB Schema Changes

### 2.1 기존 테이블 (변경 없음 — 이미 존재)

**reports** 테이블:
- `monitoring_started_at TIMESTAMPTZ` — 모니터링 시작 시간
- `resolved_at TIMESTAMPTZ` — 해결 시간
- `resolution_type TEXT` — listing_removed | content_modified | seller_removed | no_change

**report_snapshots** 테이블:
- `report_id UUID` → reports FK
- `snapshot_type TEXT` — initial | followup
- `listing_data JSONB` — 캡처 시점 리스팅 데이터
- `diff_from_initial JSONB` — 초기 대비 변경 사항
- `change_detected BOOLEAN` — 변화 감지 여부
- `change_type TEXT` — listing_removed | content_modified | seller_changed | no_change
- `crawled_at TIMESTAMPTZ` — 재방문 시간

### 2.2 report_snapshots 확장 (추가 컬럼)

```sql
ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS
  screenshot_url TEXT;                    -- Supabase Storage URL

ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS
  ai_remark TEXT;                         -- AI 리마크 (변화 분석 텍스트)

ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS
  ai_marking_data JSONB DEFAULT '[]';     -- AI 마킹 좌표 [{x,y,w,h,label}]

ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS
  ai_resolution_suggestion TEXT           -- resolved/unresolved/continue
    CHECK (ai_resolution_suggestion IN ('resolved', 'unresolved', 'continue'));
```

### 2.3 settings 테이블 (신규)

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 초기 모니터링 설정
INSERT INTO settings (key, value) VALUES
  ('monitoring_interval_days', '7'),
  ('monitoring_max_days', '90');
```

### 2.4 audit_logs 확장

```sql
-- audit_logs action에 추가 필요
-- 'monitoring_started', 'monitoring_resolved', 'monitoring_callback'
-- 현재 CHECK constraint 수정 필요
```

---

## 3. Type Definitions

### 3.1 신규 타입 (`src/types/monitoring.ts`)

```typescript
export type ReportSnapshot = {
  id: string
  report_id: string
  snapshot_type: 'initial' | 'followup'
  screenshot_url: string | null
  listing_data: Record<string, unknown>
  diff_from_initial: SnapshotDiff | null
  change_detected: boolean
  change_type: 'listing_removed' | 'content_modified' | 'seller_changed' | 'no_change' | null
  ai_remark: string | null
  ai_marking_data: AiMarking[]
  ai_resolution_suggestion: 'resolved' | 'unresolved' | 'continue' | null
  crawled_at: string
  created_at: string
}

export type SnapshotDiff = {
  title_changed: boolean
  description_changed: boolean
  images_changed: boolean
  price_changed: boolean
  seller_changed: boolean
  listing_removed: boolean
  changes: DiffEntry[]
}

export type DiffEntry = {
  field: string
  before: string | null
  after: string | null
}

export type AiMarking = {
  x: number
  y: number
  width: number
  height: number
  label: string
  severity: 'high' | 'medium' | 'low'
}

export type MonitoringSettings = {
  monitoring_interval_days: number  // 기본 7
  monitoring_max_days: number       // 기본 90
}

// 크롤러 콜백 페이로드
export type MonitoringCallbackPayload = {
  report_id: string
  screenshot_url: string | null
  listing_data: Record<string, unknown>
  crawled_at: string
  listing_removed: boolean
}
```

### 3.2 Timeline 이벤트 확장 (`src/types/reports.ts`)

```typescript
// TIMELINE_EVENT_TYPES에 추가:
'monitoring_started', 'snapshot_taken', 'change_detected', 'resolved', 'unresolved'
```

---

## 4. API Design

### 4.1 POST /api/reports/[id]/start-monitoring

**목적**: submitted → monitoring 전환 + 초기 스냅샷 생성
**권한**: editor, admin
**Trigger**: confirm-submitted 후 자동 호출 또는 수동 트리거

```
Request: (no body)
Response: { id, status: 'monitoring', monitoring_started_at }
```

**로직**:
1. report.status === 'submitted' 확인
2. report.status → 'monitoring' 업데이트
3. monitoring_started_at = now()
4. 리스팅 데이터로 initial snapshot 생성 (report_snapshots INSERT)
5. audit_log 기록

### 4.2 GET /api/monitoring/pending

**목적**: 크롤러가 재방문할 대상 목록 조회
**권한**: editor, admin (크롤러 서비스 계정)

```
Response: {
  reports: [{
    report_id, listing_id, asin, marketplace,
    monitoring_started_at, last_snapshot_at,
    snapshot_count
  }]
}
```

**로직**:
1. status = 'monitoring' 조회
2. last_snapshot_at + interval_days < now() 필터 (재방문 시점 도래)
3. monitoring_started_at + max_days < now() → 자동 unresolved 처리

### 4.3 POST /api/monitoring/callback

**목적**: 크롤러 재방문 결과 수신 + AI 분석 트리거
**권한**: editor, admin

```
Request: MonitoringCallbackPayload
Response: { snapshot_id, change_detected, ai_resolution_suggestion }
```

**로직**:
1. report_snapshots INSERT (type: 'followup')
2. 초기 스냅샷과 diff 계산
3. AI 분석 호출 (`/api/ai/monitor`)
4. ai_remark + ai_marking_data + ai_resolution_suggestion 저장
5. change_detected → notification INSERT
6. ai_resolution_suggestion === 'resolved' → 알림으로 해결 제안

### 4.4 GET /api/reports/[id]/snapshots

**목적**: 특정 신고의 스냅샷 목록 조회
**권한**: viewer, editor, admin

```
Response: { snapshots: ReportSnapshot[] }
```

**로직**:
1. report_snapshots WHERE report_id = id ORDER BY crawled_at ASC

### 4.5 POST /api/reports/[id]/resolve

**목적**: 신고 해결/미해결 확정
**권한**: editor, admin

```
Request: { resolution_type: ResolutionType }
Response: { id, status: 'resolved' | 'unresolved', resolved_at }
```

**로직**:
1. report.status === 'monitoring' 확인
2. resolution_type === 'no_change' → status = 'unresolved'
3. 그 외 → status = 'resolved'
4. resolved_at = now()
5. audit_log 기록

### 4.6 POST /api/ai/monitor

**목적**: Haiku로 스크린샷 비교 + 리마크 생성
**권한**: internal (callback에서만 호출)

```
Request: {
  report_id, initial_screenshot_url, current_screenshot_url,
  initial_listing_data, current_listing_data,
  diff: SnapshotDiff
}
Response: {
  remark: string,
  marking_data: AiMarking[],
  resolution_suggestion: 'resolved' | 'unresolved' | 'continue',
  change_summary: string
}
```

**AI 프롬프트 요약**:
- 모델: `claude-haiku-4-5`
- 입력: 초기/현재 스크린샷 (base64) + 리스팅 데이터 diff
- 판단 기준: 리스팅 삭제, 위반 콘텐츠 수정, 판매자 변경, 변화 없음
- 출력: 리마크 + 마킹 좌표 + 해결 제안

### 4.7 GET/PUT /api/settings/monitoring

**목적**: 모니터링 주기 설정 조회/수정
**GET 권한**: viewer, editor, admin
**PUT 권한**: admin

```
GET Response: MonitoringSettings
PUT Request: { monitoring_interval_days?: number, monitoring_max_days?: number }
PUT Response: MonitoringSettings
```

---

## 5. Demo Mode

기존 Demo mode 패턴을 따른다 (`src/lib/demo/`).

### 5.1 Demo 데이터 (`src/lib/demo/monitoring.ts`)

```typescript
export const DEMO_SNAPSHOTS: Record<string, ReportSnapshot[]> = {
  'rpt-001': [
    {
      id: 'snap-001',
      report_id: 'rpt-001',
      snapshot_type: 'initial',
      screenshot_url: null,
      listing_data: { title: 'Original Title...', ... },
      diff_from_initial: null,
      change_detected: false,
      change_type: null,
      ai_remark: null,
      ai_marking_data: [],
      ai_resolution_suggestion: null,
      crawled_at: '2026-02-15T10:00:00Z',
      created_at: '2026-02-15T10:00:00Z',
    },
    {
      id: 'snap-002',
      report_id: 'rpt-001',
      snapshot_type: 'followup',
      screenshot_url: null,
      listing_data: { title: 'Modified Title...', ... },
      diff_from_initial: {
        title_changed: true,
        description_changed: false,
        ...
        changes: [{ field: 'title', before: 'Original...', after: 'Modified...' }]
      },
      change_detected: true,
      change_type: 'content_modified',
      ai_remark: 'Title has been modified. The infringing keyword "Spigen" has been removed...',
      ai_marking_data: [{ x: 120, y: 45, width: 300, height: 20, label: 'Title changed', severity: 'high' }],
      ai_resolution_suggestion: 'resolved',
      crawled_at: '2026-02-22T10:00:00Z',
      created_at: '2026-02-22T10:00:00Z',
    }
  ],
}

export const DEMO_MONITORING_SETTINGS: MonitoringSettings = {
  monitoring_interval_days: 7,
  monitoring_max_days: 90,
}
```

---

## 6. UI Design

### 6.1 ReportsContent — 모니터링 탭 추가

**파일**: `src/app/(protected)/reports/ReportsContent.tsx`

현재 STATUS_TABS에 `submitted`, `monitoring` 추가:

```typescript
const STATUS_TABS = [
  { value: '', label: t('common.all') },
  { value: 'draft', label: t('reports.tabs.draft') },
  { value: 'pending_review', label: t('reports.tabs.pending') },
  { value: 'approved', label: t('reports.tabs.approved') },
  { value: 'submitted', label: t('reports.tabs.submitted') },
  { value: 'monitoring', label: t('reports.tabs.monitoring') },
]
```

### 6.2 ReportDetailContent — 스냅샷 섹션 추가

**파일**: `src/app/(protected)/reports/[id]/ReportDetailContent.tsx`

monitoring/resolved/unresolved 상태일 때 스냅샷 카드 표시:

```
┌──────────────────────────────────────────────────┐
│ Monitoring Snapshots                      [2/12] │
├──────────────────────────────────────────────────┤
│ ┌─────────────┐  ┌─────────────┐                 │
│ │  Initial     │  │  Follow-up  │                 │
│ │ [Screenshot] │  │ [Screenshot]│  AI Remark:     │
│ │  2/15        │  │  2/22       │  "Title changed │
│ └─────────────┘  └─────────────┘   Spigen removed"│
│                                                   │
│ Changes: title_changed                            │
│ Suggestion: ✅ Resolved                           │
├──────────────────────────────────────────────────┤
│ [◀ Previous]              [Next ▶]               │
└──────────────────────────────────────────────────┘
```

Props 추가:
- `snapshots: ReportSnapshot[]`
- `monitoringStartedAt: string | null`

### 6.3 SnapshotViewer 컴포넌트 (신규)

**파일**: `src/app/(protected)/reports/[id]/SnapshotViewer.tsx`

```typescript
type SnapshotViewerProps = {
  initialSnapshot: ReportSnapshot | null
  followupSnapshots: ReportSnapshot[]
  currentIndex: number
  onIndexChange: (index: number) => void
}
```

기능:
- Side-by-side 레이아웃 (초기 vs 선택된 팔로업)
- AI 마킹 오버레이 (CSS absolute positioning)
- 리마크 + 변화 유형 배지
- 이전/다음 네비게이션
- 스크린샷 없을 때 리스팅 데이터 diff 텍스트 표시

### 6.4 ReportActions — 모니터링 액션 추가

**파일**: `src/app/(protected)/reports/[id]/ReportActions.tsx`

```typescript
// submitted 상태 (기존 confirm + 추가)
{status === 'submitted' && (
  <>
    <Button onClick={handleStartMonitoring}>Start Monitoring</Button>
    {/* 기존 confirmSubmitted 유지 */}
  </>
)}

// monitoring 상태 (신규)
{status === 'monitoring' && (
  <>
    <Button onClick={() => setShowResolveModal(true)}>Resolve</Button>
    <Button variant="outline" onClick={() => handleResolve('no_change')}>
      Mark Unresolved
    </Button>
  </>
)}
```

Resolve Modal:
- ResolutionType 선택 (listing_removed, content_modified, seller_removed)
- 확인 버튼

### 6.5 Settings 모니터링 설정

**파일**: `src/app/(protected)/settings/MonitoringSettings.tsx` (신규)

```
┌──────────────────────────────────────────┐
│ Monitoring Settings                      │
├──────────────────────────────────────────┤
│ Re-visit Interval:  [  7  ] days         │
│ Max Monitoring:     [ 90  ] days         │
│                                          │
│                        [Save Settings]   │
└──────────────────────────────────────────┘
```

Admin만 수정 가능, Viewer/Editor는 읽기 전용.

### 6.6 알림 벨 아이콘 (NotificationBell)

**파일**: `src/components/layout/NotificationBell.tsx` (신규)

Header 오른쪽에 알림 벨 아이콘 표시:
- 읽지 않은 알림 개수 배지
- 클릭 시 드롭다운 (최근 5건)
- "전체 보기" 링크

---

## 7. i18n Keys

### 7.1 en.ts 추가

```typescript
reports: {
  ...existing,
  monitoring: {
    title: 'Monitoring Snapshots',
    initialSnapshot: 'Initial',
    followupSnapshot: 'Follow-up #{n}',
    noSnapshots: 'No snapshots available.',
    aiRemark: 'AI Remark',
    changeDetected: 'Change Detected',
    noChange: 'No Change',
    suggestion: 'AI Suggestion',
    startMonitoring: 'Start Monitoring',
    resolve: 'Resolve',
    markUnresolved: 'Mark Unresolved',
    resolveTitle: 'Resolve Report',
    resolveDesc: 'Select the resolution type for this report.',
    resolutionTypes: {
      listing_removed: 'Listing Removed',
      content_modified: 'Content Modified',
      seller_removed: 'Seller Removed',
    },
    daysMonitored: '{days} days monitored',
    snapshotCount: '{count} snapshots',
    nextRevisit: 'Next re-visit: {date}',
  },
  tabs: {
    ...existing,
    // submitted, monitoring already defined
  },
},
settings: {
  monitoring: {
    title: 'Monitoring Settings',
    intervalDays: 'Re-visit Interval (days)',
    maxDays: 'Max Monitoring Duration (days)',
    save: 'Save Settings',
    saved: 'Settings saved.',
  },
},
notifications: {
  title: 'Notifications',
  markAllRead: 'Mark all read',
  noNotifications: 'No notifications.',
  viewAll: 'View All',
  followupChangeDetected: 'Change detected in {asin}',
  followupNoChange: 'No change in {asin} (re-visit #{n})',
},
```

### 7.2 ko.ts 추가 (동일 구조, 한국어)

```typescript
reports: {
  monitoring: {
    title: '모니터링 스냅샷',
    initialSnapshot: '초기',
    followupSnapshot: '팔로업 #{n}',
    noSnapshots: '스냅샷이 없습니다.',
    aiRemark: 'AI 리마크',
    changeDetected: '변화 감지',
    noChange: '변화 없음',
    suggestion: 'AI 제안',
    startMonitoring: '모니터링 시작',
    resolve: '해결 확정',
    markUnresolved: '미해결 처리',
    resolveTitle: '신고 해결 확정',
    resolveDesc: '해결 유형을 선택하세요.',
    resolutionTypes: {
      listing_removed: '리스팅 삭제됨',
      content_modified: '콘텐츠 수정됨',
      seller_removed: '판매자 삭제됨',
    },
    daysMonitored: '{days}일 모니터링 중',
    snapshotCount: '{count}개 스냅샷',
    nextRevisit: '다음 재방문: {date}',
  },
},
settings: {
  monitoring: {
    title: '모니터링 설정',
    intervalDays: '재확인 주기 (일)',
    maxDays: '최대 모니터링 기간 (일)',
    save: '설정 저장',
    saved: '설정이 저장되었습니다.',
  },
},
notifications: {
  title: '알림',
  markAllRead: '모두 읽음 처리',
  noNotifications: '알림이 없습니다.',
  viewAll: '전체 보기',
  followupChangeDetected: '{asin}에서 변화 감지',
  followupNoChange: '{asin} 변화 없음 (재방문 #{n})',
},
```

---

## 8. Crawler Interface (인터페이스만 정의)

크롤러 서버는 아직 배포되지 않았으므로, Web API 인터페이스만 정의한다.

### 8.1 크롤러 → Web API 통신 규약

```
1. 크롤러 시작 시:
   GET /api/monitoring/pending
   → 재방문 대상 목록 수신
   Headers: { Authorization: 'Bearer <service-token>' }

2. 재방문 완료 후:
   POST /api/monitoring/callback
   Body: MonitoringCallbackPayload
   → AI 분석 결과 수신

3. 스크린샷 업로드:
   Supabase Storage에 직접 업로드 (presigned URL)
   Path: monitoring/{report_id}/{timestamp}.png
```

### 8.2 크롤러 팔로업 모듈 인터페이스 (`crawler/src/follow-up/types.ts`)

```typescript
export type RevisitTarget = {
  report_id: string
  listing_id: string
  asin: string
  marketplace: string
  monitoring_started_at: string
  last_snapshot_at: string | null
  snapshot_count: number
}

export type RevisitResult = {
  report_id: string
  screenshot_url: string | null
  listing_data: Record<string, unknown>
  crawled_at: string
  listing_removed: boolean
}
```

---

## 9. Implementation Order

| # | 항목 | 파일 | 예상 LoC | 의존성 |
|---|------|------|:--------:|--------|
| 1 | 모니터링 타입 정의 | `src/types/monitoring.ts` | 60 | - |
| 2 | Timeline 이벤트 확장 | `src/types/reports.ts` + `src/lib/timeline.ts` | 20 | - |
| 3 | Demo 모니터링 데이터 | `src/lib/demo/monitoring.ts` | 80 | #1 |
| 4 | API: start-monitoring | `src/app/api/reports/[id]/start-monitoring/route.ts` | 50 | #1 |
| 5 | API: snapshots | `src/app/api/reports/[id]/snapshots/route.ts` | 40 | #1 |
| 6 | API: resolve | `src/app/api/reports/[id]/resolve/route.ts` | 60 | #1 |
| 7 | API: monitoring/pending | `src/app/api/monitoring/pending/route.ts` | 50 | #1 |
| 8 | API: monitoring/callback | `src/app/api/monitoring/callback/route.ts` | 80 | #1, #5 |
| 9 | API: ai/monitor | `src/app/api/ai/monitor/route.ts` | 80 | #1 |
| 10 | API: settings/monitoring | `src/app/api/settings/monitoring/route.ts` | 50 | #1 |
| 11 | SnapshotViewer 컴포넌트 | `src/app/(protected)/reports/[id]/SnapshotViewer.tsx` | 150 | #1, #3 |
| 12 | ReportDetailContent 확장 | `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` | 40 | #11 |
| 13 | ReportActions 모니터링 액션 | `src/app/(protected)/reports/[id]/ReportActions.tsx` | 60 | #4, #6 |
| 14 | page.tsx 스냅샷 fetch | `src/app/(protected)/reports/[id]/page.tsx` | 30 | #5, #12 |
| 15 | ReportsContent 탭 추가 | `src/app/(protected)/reports/ReportsContent.tsx` | 10 | - |
| 16 | MonitoringSettings 컴포넌트 | `src/app/(protected)/settings/MonitoringSettings.tsx` | 80 | #10 |
| 17 | Settings 페이지 통합 | `src/app/(protected)/settings/page.tsx` | 20 | #16 |
| 18 | NotificationBell 컴포넌트 | `src/components/layout/NotificationBell.tsx` | 100 | - |
| 19 | Header에 NotificationBell 추가 | `src/components/layout/Header.tsx` | 10 | #18 |
| 20 | i18n 키 추가 (en + ko) | `src/lib/i18n/locales/{en,ko}.ts` | 60 | - |
| 21 | 크롤러 인터페이스 타입 | `crawler/src/follow-up/types.ts` | 30 | - |
| **합계** | | | **~1,180** | |

---

## 10. File Summary

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `src/types/monitoring.ts` | **신규** | ReportSnapshot, SnapshotDiff, AiMarking, MonitoringSettings 타입 |
| `src/types/reports.ts` | 수정 | TIMELINE_EVENT_TYPES 확장 |
| `src/lib/timeline.ts` | 수정 | 모니터링 이벤트 빌드 추가 |
| `src/lib/demo/monitoring.ts` | **신규** | Demo 스냅샷 + 설정 데이터 |
| `src/app/api/reports/[id]/start-monitoring/route.ts` | **신규** | submitted→monitoring 전환 |
| `src/app/api/reports/[id]/snapshots/route.ts` | **신규** | 스냅샷 목록 조회 |
| `src/app/api/reports/[id]/resolve/route.ts` | **신규** | 해결/미해결 확정 |
| `src/app/api/monitoring/pending/route.ts` | **신규** | 크롤러용 재방문 대상 목록 |
| `src/app/api/monitoring/callback/route.ts` | **신규** | 크롤러 재방문 결과 수신 |
| `src/app/api/ai/monitor/route.ts` | **신규** | Haiku 스크린샷 비교 |
| `src/app/api/settings/monitoring/route.ts` | **신규** | 모니터링 주기 설정 |
| `src/app/(protected)/reports/[id]/SnapshotViewer.tsx` | **신규** | Before/After 스냅샷 뷰어 |
| `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` | 수정 | 스냅샷 섹션 추가 |
| `src/app/(protected)/reports/[id]/ReportActions.tsx` | 수정 | Start Monitoring, Resolve 버튼 |
| `src/app/(protected)/reports/[id]/page.tsx` | 수정 | 스냅샷 fetch + props 전달 |
| `src/app/(protected)/reports/ReportsContent.tsx` | 수정 | 모니터링 탭 추가 |
| `src/app/(protected)/settings/MonitoringSettings.tsx` | **신규** | 모니터링 주기 설정 UI |
| `src/app/(protected)/settings/page.tsx` | 수정 | MonitoringSettings 통합 |
| `src/components/layout/NotificationBell.tsx` | **신규** | 알림 벨 드롭다운 |
| `src/components/layout/Header.tsx` | 수정 | NotificationBell 추가 |
| `src/lib/i18n/locales/en.ts` | 수정 | 모니터링 + 알림 + 설정 i18n |
| `src/lib/i18n/locales/ko.ts` | 수정 | 한국어 번역 |
| `crawler/src/follow-up/types.ts` | **신규** | 크롤러 인터페이스 타입 |

**신규 파일**: 12개
**수정 파일**: 11개
**합계**: 23개 파일, ~1,180 LoC

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial design | Claude (PDCA) |
